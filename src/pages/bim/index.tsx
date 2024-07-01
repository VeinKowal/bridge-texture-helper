/**
 *@description 三维相关.
 *@author guoweiyu.
 *@date 2024-06-28 09:44:19.
*/
import type { FC } from 'react';
import React, { useRef, useState, useMemo, useEffect } from 'react';
import styles from './index.less';
import { useModel } from '@umijs/max';
import { Spin } from 'antd';
import { flatten, isEqual, min } from 'lodash';
import { useMemoizedFn } from 'ahooks';
import * as THREE from 'three';
import { Geometry } from '@/assets/Geometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import {
  Evaluator,
  Brush,
  GridMaterial,
  INTERSECTION
} from 'three-bvh-csg';
import { CONTAINED, INTERSECTED, NOT_INTERSECTED } from 'three-mesh-bvh';
import App from '@/components/app';
import useBridgeGroup from '@/assets/useBridgeGroup';
import { appCameraFitTarget } from '@/components/app/util';

const csgEvaluator = new Evaluator();

type BimProps = unknown;

type FaceLike = {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
  normal: THREE.Vector3;
}

const MEMBER_DEFECT_LOCATION: Record<string, ['front' | 'back', 'left' | 'right', 'top' | 'bottom']> = {
  底板: ['front', 'right', 'bottom'],
};

const Bim: FC<BimProps> = () => {
  const { selectedBridgeId, isToolLoading, tooltip, bridgeList, bridgeDefectList } = useModel('global');
  const sceneRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<App>();

  const bridgeInfo = useMemo(() => {
    return bridgeList?.find(e => e.bridgeId === selectedBridgeId);
  }, [selectedBridgeId, bridgeList]);

  const { bridgeGroup } = useBridgeGroup(app, `@/../public/model/${bridgeInfo?.bridgeName}.zip`)

  const bridgeModel = useMemo(() => {
    if (!app || !bridgeGroup) return;
    console.log(bridgeGroup);
    app.scene.add(bridgeGroup);
    appCameraFitTarget(app, {
      target: bridgeGroup
    });
    return bridgeGroup;
  }, [app, bridgeGroup]);

  const getAllIndicesUsingPoint = useMemoizedFn((
    point: THREE.Vector3Like,
    indexArray: number[],
    positionArray: number[]
  ) => {
    const triangleIndices: number[][] = [];
    const tempVectorA = new THREE.Vector3();
    const tempVectorB = new THREE.Vector3();
    const tempVectorC = new THREE.Vector3();
    for (let i = 0; i < indexArray.length; i += 3) {
      const a = indexArray[i];
      const b = indexArray[i + 1];
      const c = indexArray[i + 2];
      const pointAIndex = a * 3;
      const pointBIndex = b * 3;
      const pointCIndex = c * 3;
      const vertexA = tempVectorA.fromArray([positionArray[pointAIndex], positionArray[pointAIndex + 1], positionArray[pointAIndex + 2]]);
      const vertexB = tempVectorB.fromArray([positionArray[pointBIndex], positionArray[pointBIndex + 1], positionArray[pointBIndex + 2]]);
      const vertexC = tempVectorC.fromArray([positionArray[pointCIndex], positionArray[pointCIndex + 1], positionArray[pointCIndex + 2]]);
      if (vertexA.equals(point) || vertexB.equals(point) || vertexC.equals(point)) {
        triangleIndices.push([a, b, c]);
      }
    }
    return triangleIndices;
  });

  // 更新构件UV
  const applyMeshGridSkin = useMemoizedFn(
    (
      member: THREE.Mesh,
      textures?: {
        mapTextureURL: string,
        normalTextureURL?: string,
        aoTextureURL?: string,
        bumpTextureURL?: string,
        repeat?: THREE.Vector2
      }
    ) => {
      const computeGroups = (geometry: any) => {
        const groups = [];
        let group, i;
        let materialIndex = undefined;
        const faces = geometry.faces;
        for (i = 0; i < faces.length; i++) {
          const face = faces[i];
          // materials
          if (face.materialIndex !== materialIndex) {
            materialIndex = face.materialIndex;
            if (group !== undefined) {
              group.count = (i * 3) - group.start;
              groups.push(group);
            }
            group = {
              start: i * 3,
              materialIndex: materialIndex
            };
          }
        }
        if (group !== undefined) {
          group.count = (i * 3) - group.start;
          groups.push(group);
        }
        return groups;
      }

      /**
       * @description 创建Texture.
       * @param {string | ImgData} url - 图片路径或者图片数据.
       * @return {Texture}.
      */
      const createNewTexture = (url?: string, flipY: boolean = false) => {
        if (!url) return undefined;
        const texture = new THREE.TextureLoader().load(url);
        // 因为repeat大于1 开启边缘和外边界重复
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        if (textures?.repeat) {
          texture.repeat.copy(textures.repeat);
        }
        texture.flipY = !!flipY;
        texture.needsUpdate = true;
        return texture;
      };

      const repeatLength = 4000;
      const bridgeScaler = 1;
      const geo = new Geometry().fromBufferGeometry(member.geometry);
      // 因为模型有放缩，为了保证repeatLength的1:1，此处geometry也应同等放缩
      geo.scale(bridgeScaler, bridgeScaler, bridgeScaler);
      geo.mergeVertices();
      geo.computeBoundingBox();
      const { boundingBox } = geo;

      const minX = boundingBox.min.x;
      const minZ = boundingBox.min.z;
      const minY = boundingBox.min.y;
      const maxX = boundingBox.max.x;
      const maxZ = boundingBox.max.z;
      const maxY = boundingBox.max.y;
      const uv: THREE.Vector2[] = [];
      const materials = [];
      const mapTextures = new Array(3).fill(null).map(() => createNewTexture(textures?.mapTextureURL));
      const normalTextures = new Array(3).fill(null).map(() => createNewTexture(textures?.normalTextureURL));
      const aoTextures = new Array(3).fill(null).map(() => createNewTexture(textures?.aoTextureURL));
      const bumpTextures = new Array(3).fill(null).map(() => createNewTexture(textures?.bumpTextureURL));

      // console.log('min', minX, minY, minZ);
      // console.log('max', maxX, maxY, maxZ);

      for (let i = 0; i < geo.faces.length; i += 1) {
        const a = geo.vertices[geo.faces[i].a];
        const b = geo.vertices[geo.faces[i].b];
        const c = geo.vertices[geo.faces[i].c];
        const disList = [Math.max(a.x, b.x, c.x) - Math.min(a.x, b.x, c.x), Math.max(a.z, b.z, c.z) - Math.min(a.z, b.z, c.z), Math.max(a.y, b.y, c.y) - Math.min(a.y, b.y, c.y)];
        const minDisIndex = disList.findIndex(e => e === min(disList));
        // 如果这个面是几乎平行于x轴的 则根据z0y面进行切分赋uv值 其他判断原理类似
        if (minDisIndex === 0) {
          uv.push(
            new THREE.Vector2((a.y - minY) / (maxY - minY), (a.z - minZ) / (maxZ - minZ)),
            new THREE.Vector2((b.y - minY) / (maxY - minY), (b.z - minZ) / (maxZ - minZ)),
            new THREE.Vector2((c.y - minY) / (maxY - minY), (c.z - minZ) / (maxZ - minZ)),
          );
          // 指定uv映射哪个材质
          geo.faces[i].materialIndex = 1;
          if (!textures?.repeat) {
            // 切分成固定大小的方格
            mapTextures?.[1]?.repeat.set((maxY - minY) / repeatLength, (maxZ - minZ) / repeatLength);
            normalTextures?.[1]?.repeat.set((maxY - minY) / repeatLength, (maxZ - minZ) / repeatLength);
            aoTextures?.[1]?.repeat.set((maxY - minY) / repeatLength, (maxZ - minZ) / repeatLength);
            bumpTextures?.[1]?.repeat.set((maxY - minY) / repeatLength, (maxZ - minZ) / repeatLength);
          }
        } else if (minDisIndex === 1) {
          uv.push(
            new THREE.Vector2((a.x - minX) / (maxX - minX), (a.y - minY) / (maxY - minY)),
            new THREE.Vector2((b.x - minX) / (maxX - minX), (b.y - minY) / (maxY - minY)),
            new THREE.Vector2((c.x - minX) / (maxX - minX), (c.y - minY) / (maxY - minY)),
          );
          geo.faces[i].materialIndex = 2;
          if (!textures?.repeat) {
            mapTextures?.[2]?.repeat.set((maxX - minX) / repeatLength, (maxY - minY) / repeatLength);
            normalTextures?.[2]?.repeat.set((maxX - minX) / repeatLength, (maxY - minY) / repeatLength);
            aoTextures?.[2]?.repeat.set((maxX - minX) / repeatLength, (maxY - minY) / repeatLength);
            bumpTextures?.[2]?.repeat.set((maxX - minX) / repeatLength, (maxY - minY) / repeatLength);
          }
        } else {
          uv.push(
            new THREE.Vector2((a.x - minX) / (maxX - minX), (a.z - minZ) / (maxZ - minZ)),
            new THREE.Vector2((b.x - minX) / (maxX - minX), (b.z - minZ) / (maxZ - minZ)),
            new THREE.Vector2((c.x - minX) / (maxX - minX), (c.z - minZ) / (maxZ - minZ)),
          );
          geo.faces[i].materialIndex = 0;
          if (!textures?.repeat) {
            mapTextures?.[0]?.repeat.set((maxX - minX) / repeatLength, (maxZ - minZ) / repeatLength);
            normalTextures?.[0]?.repeat.set((maxX - minX) / repeatLength, (maxZ - minZ) / repeatLength);
            aoTextures?.[0]?.repeat.set((maxX - minX) / repeatLength, (maxZ - minZ) / repeatLength);
            bumpTextures?.[0]?.repeat.set((maxX - minX) / repeatLength, (maxZ - minZ) / repeatLength);
          }
        }
      }
      const groups = computeGroups(geo);
      member.geometry.groups = groups;
      member.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(flatten(uv.map(e => e.toArray())), 2));


      for (let i = 0; i < 3; i += 1) {
        const material = new THREE.MeshPhongMaterial({
          // 此处可修改为BackSide FrontSide 节约渲染时间 因为担心日后模型有正反面问题 此时未替换
          side: THREE.DoubleSide,
          transparent: false,
          depthTest: false
          // polygonOffset: true,
          // polygonOffsetFactor: 1,
          // polygonOffsetUnits: 1,
        });
        if (mapTextures?.[i]) {
          material.map = mapTextures[i] || null;
        }
        if (normalTextures?.[i]) {
          material.normalMap = normalTextures?.[i] || null;
        }
        if (aoTextures?.[i]) {
          material.aoMap = aoTextures?.[i] || null;
        }
        if (bumpTextures?.[i]) {
          material.bumpMap = bumpTextures?.[i] || null;
        }
        material.needsUpdate = true;
        materials.push(material);
      }


      return materials;
    }
  );

  const getRangeDistance = useMemoizedFn((rangeStr: string) => {
    const results = [];
    if (rangeStr.includes('-')) {
      const parts = rangeStr.split('-').map(Number);
      const start = parts[0] * 1000;
      const end = parts[1] * 1000;
      results.push(start, end, (start + end) / 2, (end - start));
    } else {
      const value = parseFloat(rangeStr) * 1000;
      results.push(value, value, value, 0);
    }
    return results;
  });

  const findClosestTriangle = (point: THREE.Vector3, geometry: THREE.BufferGeometry) => {
    const positionAttr = geometry.attributes.position;
    const normalAttr = geometry.attributes.normal;
    const indexArray = geometry.index!.array;

    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const normal = new THREE.Vector3();

    const tempVectorA = new THREE.Vector3();
    const tempVectorB = new THREE.Vector3();
    const tempVectorC = new THREE.Vector3();
    const tempNormalA = new THREE.Vector3();
    const tempNormalB = new THREE.Vector3();
    const tempNormalC = new THREE.Vector3();

    let minDistance = Infinity;
    let closestFace: FaceLike | undefined = undefined;
    for (let i = 0; i < indexArray.length; i += 3) {
      tempVectorA.fromBufferAttribute(positionAttr, indexArray[i]);
      tempVectorB.fromBufferAttribute(positionAttr, indexArray[i + 1]);
      tempVectorC.fromBufferAttribute(positionAttr, indexArray[i + 2]);
      tempNormalA.fromBufferAttribute(normalAttr, indexArray[i]);
      tempNormalB.fromBufferAttribute(normalAttr, indexArray[i + 1]);
      tempNormalC.fromBufferAttribute(normalAttr, indexArray[i + 2]);

      const triangle = new THREE.Triangle(tempVectorA, tempVectorB, tempVectorC);
      const projection = new THREE.Vector3();
      triangle.closestPointToPoint(point, projection);
      const distance = projection.distanceTo(point);

      if (distance < minDistance) {
        minDistance = distance;
        a.copy(tempVectorA);
        b.copy(tempVectorB);
        c.copy(tempNormalC);
        normal.addVectors(a, b)
          .add(c)
          .divideScalar(3);
        closestFace = { a, b, c, normal };
      }
    }
    return closestFace;
  }

  const addDefectTexture = useMemoizedFn((params: {
    object: THREE.Mesh,
    localFace: FaceLike,
    localPoint: THREE.Vector3,
    textureUrl: string,
    defectSize: number,
  }) => {
    const { object, localFace, localPoint, textureUrl, defectSize = 1000 } = params;
    const geometry = object.geometry;
    object.updateMatrixWorld();
    const indices = new Set<number>();
    const triangles = new Set();
    const uvAttr = geometry.attributes.uv;
    const normalAttr = geometry.attributes.normal;
    const posAttr = geometry.attributes.position;
    const posArray = posAttr.array;
    const indexAttr = geometry.index!;
    const indexArray = indexAttr.array;
    const sphere = new THREE.Sphere();
    sphere.center.copy(localPoint);
    sphere.radius = defectSize;

    const tempVec = new THREE.Vector3();
    const bvh = geometry.boundsTree!;
    bvh.shapecast({
      intersectsBounds: (box: THREE.Box3) => {
        const intersects = sphere.intersectsBox(box);
        const { min: boxMin, max: boxMax } = box;
        if (intersects) {
          for (let x = 0; x <= 1; x++) {
            for (let y = 0; y <= 1; y++) {
              for (let z = 0; z <= 1; z++) {
                tempVec.set(
                  x === 0 ? boxMin.x : boxMax.x,
                  y === 0 ? boxMin.y : boxMax.y,
                  z === 0 ? boxMin.z : boxMax.z
                );
                if (!sphere.containsPoint(tempVec)) {
                  return INTERSECTED;
                }
              }
            }
          }
          return CONTAINED;
        }
        return intersects ? INTERSECTED : NOT_INTERSECTED;
      },
      intersectsTriangle: (tri: THREE.Triangle, index: number, contained: boolean) => {
        const triIndex = index;
        triangles.add(triIndex);
        const i3 = 3 * index;
        const a = i3 + 0;
        const b = i3 + 1;
        const c = i3 + 2;
        const va = indexAttr.getX(a);
        const vb = indexAttr.getX(b);
        const vc = indexAttr.getX(c);
        if (contained) {
          indices.add(va);
          indices.add(vb);
          indices.add(vc);
        } else {
          if (sphere.containsPoint(tri.a)) {
            indices.add(va);
          }
          if (sphere.containsPoint(tri.b)) {
            indices.add(vb);
          }
          if (sphere.containsPoint(tri.c)) {
            indices.add(vc);
          }
        }
        return false;
      }
    });
    if (!indices.size && localFace) {
      const { a, b, c } = localFace;
      [a, b, c].forEach((index) => {
        if (!indices.has(index)) {
          indices.add(index);
        }
      })
    }
    if (indices.size) {
      const newGeometry = new THREE.BufferGeometry();
      const triangleMap: { triangleIndex: number; vertices: number[]; uvs: number[]; }[] = [];
      indices.forEach((index) => {
        const normal = tempVec.fromBufferAttribute(normalAttr, index);
        if (normal.dot(localFace.normal) <= 0) return;
        const position = tempVec.fromBufferAttribute(posAttr, index);
        const list = getAllIndicesUsingPoint(position, indexArray, posArray);
        list.forEach(([a, b, c]) => {
          const vertices: number[] = [];
          const uvs: number[] = [];
          [a, b, c].forEach((i) => {
            vertices.push(
              posAttr.getX(i),
              posAttr.getY(i),
              posAttr.getZ(i),
            );
            uvs.push(
              uvAttr.getX(i),
              uvAttr.getY(i),
            );
          });
          triangleMap.push({
            vertices,
            uvs,
            triangleIndex: a,
          });
        });
      });
      const positionList = flatten(triangleMap.map(v => v.vertices));
      const uvList = flatten(triangleMap.map(v => v.uvs));
      const indexList = new Array(Math.floor(positionList.length / 3)).fill(undefined).map((_, i) => {
        return i;
      });
      newGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positionList, 3)
      );
      newGeometry.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(uvList, 2)
      );
      newGeometry.setIndex(indexList);
      newGeometry.computeVertexNormals();

      const gridMaterial = new GridMaterial({
        side: THREE.DoubleSide,
        wireframe: true
      });
      const boxGeometry = new THREE.BoxGeometry(defectSize, 1, defectSize);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(localFace.normal, THREE.Object3D.DEFAULT_UP);
      boxGeometry.applyQuaternion(quaternion);
      boxGeometry.translate(localPoint.x, localPoint.y, localPoint.z);
      // const newMesh = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({
      //   color: 0xffffff * Math.random(),
      //   depthTest: false
      // }));
      // object.add(newMesh);
      const meshBrush = new Brush(newGeometry.clone(), gridMaterial);
      meshBrush.updateMatrixWorld();
      const boxBrush = new Brush(boxGeometry.clone(), gridMaterial);
      boxBrush.updateMatrixWorld();
      const resultObject = csgEvaluator.evaluate(
        meshBrush,
        boxBrush,
        INTERSECTION
      );
      resultObject.geometry.groups.length = 0;
      resultObject.material = applyMeshGridSkin(resultObject, {
        mapTextureURL: textureUrl,
      });
      resultObject.renderOrder = 100;
      object.add(resultObject);
      console.log('贴图结束', resultObject);
    }
  });

  // 场景初始化
  useEffect(() => {
    const renderDom = sceneRef.current;
    if (!renderDom) return;
    const newApp = new App({
      renderDom,
    });
    setApp(e => {
      e?.destroy();
      return newApp;
    });
  }, []);

  // 根据病害信息贴图
  useEffect(() => {
    if (!bridgeDefectList?.length || !bridgeModel) return;
    bridgeDefectList.forEach((defectInfo) => {
      const { sideType, memberType, memberNo, pDistRange, iDistRange } = defectInfo;
      const singleBridgeModel = bridgeModel.query(new RegExp(`${sideType}`))?.[0] as THREE.Object3D;
      if (!singleBridgeModel) return;
      const memberModel = singleBridgeModel.query(new RegExp(`${memberType}@${memberNo}`))?.[0] as THREE.Mesh;
      const locationInfo = MEMBER_DEFECT_LOCATION[memberType];
      if (memberModel && locationInfo) {
        console.log('member:', memberModel);
        const { geometry } = memberModel;
        const positionAttr = geometry.attributes.position;
        const indexArray = geometry.index!.array;
        if (!geometry.boundingBox) {
          geometry.computeBoundingBox();
        }
        const boundingBox = geometry.boundingBox;
        const { x: minX, y: minY, z: minZ } = boundingBox!.min;
        const { x: maxX, y: maxY, z: maxZ } = boundingBox!.max;
        // 包围盒各角位置(首部面向前进方向)
        const boundingVertices = [
          // 首部右下
          new THREE.Vector3(minX, minY, minZ),
          // 首部左下
          new THREE.Vector3(minX, minY, maxZ),
          // 首部右上
          new THREE.Vector3(minX, maxY, minZ),
          // 首部左上
          new THREE.Vector3(minX, maxY, maxZ),
          // 尾部右下
          new THREE.Vector3(maxX, minY, minZ),
          // 尾部左下
          new THREE.Vector3(maxX, minY, maxZ),
          // 尾部右上
          new THREE.Vector3(maxX, maxY, minZ),
          // 尾部左上
          new THREE.Vector3(maxX, maxY, maxZ)
        ];
        // 物体实际各角位置(同包围盒各角位置)
        const edgeVertices = boundingVertices.map((vertice) => {
          let minDistance = Infinity;
          const { y } = vertice;
          const targetVector = new THREE.Vector3();
          const tempVector = new THREE.Vector3();
          indexArray.forEach((index) => {
            tempVector.fromBufferAttribute(positionAttr, index);
            if (y === tempVector.y) {
              const distance = tempVector.distanceTo(vertice);
              if (distance < minDistance) {
                minDistance = distance;
                targetVector.copy(tempVector);
              }
            }
          });
          return targetVector;
        });
        let originLocalPosition: THREE.Vector3 | undefined = undefined;
        if (isEqual(['front', 'right', 'bottom'], locationInfo)) {
          originLocalPosition = edgeVertices[0];
        }
        else if (isEqual(['front', 'left', 'bottom'], locationInfo)) {
          originLocalPosition = edgeVertices[1];
        }
        else if (isEqual(['front', 'right', 'top'], locationInfo)) {
          originLocalPosition = edgeVertices[2];
        }
        else if (isEqual(['front', 'left', 'top'], locationInfo)) {
          originLocalPosition = edgeVertices[3];
        }
        else if (isEqual(['back', 'right', 'bottom'], locationInfo)) {
          originLocalPosition = edgeVertices[4];
        }
        else if (isEqual(['back', 'left', 'bottom'], locationInfo)) {
          originLocalPosition = edgeVertices[5];
        }
        else if (isEqual(['back', 'right', 'top'], locationInfo)) {
          originLocalPosition = edgeVertices[6];
        }
        else if (isEqual(['back', 'left', 'top'], locationInfo)) {
          originLocalPosition = edgeVertices[7];
        }
        if (originLocalPosition && pDistRange && iDistRange) {
          const defectLocalPosition = new THREE.Vector3().copy(originLocalPosition);
          const [startDistance1, endDistance1, middleDistance1, length1] = getRangeDistance(pDistRange);
          const [startDistance2, endDistance2, middleDistance2, length2] = getRangeDistance(iDistRange);
          const [direct1, direct2] = locationInfo;
          if (direct1 === 'back') {
            defectLocalPosition.x -= middleDistance2;
            if (direct2 === 'left') {
              defectLocalPosition.z -= middleDistance1;
            }
          } else {
            defectLocalPosition.x += middleDistance2;
            if (direct2 === 'left') {
              defectLocalPosition.z -= middleDistance1;
            }
          }
          const face = findClosestTriangle(originLocalPosition, geometry);
          if (face) {
            console.log('开始贴图');
            addDefectTexture({
              object: memberModel,
              localFace: face,
              localPoint: defectLocalPosition,
              textureUrl: require('@/../public/image/4.png'),
              defectSize: Math.max(length1, length2),
            });
          }
        }
      }
    });
  }, [bridgeDefectList, bridgeModel, getRangeDistance, addDefectTexture]);

  // useEffect(() => {
  //   if (!bridgeModel) return;
  //   const clickEvent = (e) => {
  //     if (e.data.button !== 0) return;
  //     const face = e.currentFace.face;
  //     const point = e.currentFace.point;
  //     const object = e.currentTarget;
  //     const geometry = object.geometry;
  //     object.updateMatrixWorld();
  //     const indices = new Set<number>();
  //     const triangles = new Set();
  //     const uvAttr = geometry.attributes.uv;
  //     const normalAttr = geometry.attributes.normal;
  //     const posAttr = geometry.attributes.position;
  //     const posArray = posAttr.array;
  //     const indexAttr = geometry.index;
  //     const indexArray = indexAttr.array;

  //     const inverseMatrix = new THREE.Matrix4();
  //     inverseMatrix.copy(object.matrixWorld).invert();
  //     const localPoint = new THREE.Vector3();
  //     localPoint.copy(point).applyMatrix4(inverseMatrix);

  //     const defectSize = 1000;
  //     const sphere = new THREE.Sphere();
  //     sphere.center.copy(localPoint);
  //     sphere.radius = defectSize;

  //     const tempVec = new THREE.Vector3();
  //     const bvh = geometry.boundsTree;
  //     bvh.shapecast({
  //       intersectsBounds: (box: THREE.Box3) => {
  //         const intersects = sphere.intersectsBox(box);
  //         const { min, max } = box;
  //         if (intersects) {
  //           for (let x = 0; x <= 1; x++) {
  //             for (let y = 0; y <= 1; y++) {
  //               for (let z = 0; z <= 1; z++) {
  //                 tempVec.set(
  //                   x === 0 ? min.x : max.x,
  //                   y === 0 ? min.y : max.y,
  //                   z === 0 ? min.z : max.z
  //                 );
  //                 if (!sphere.containsPoint(tempVec)) {
  //                   return INTERSECTED;
  //                 }
  //               }
  //             }
  //           }
  //           return CONTAINED;
  //         }
  //         return intersects ? INTERSECTED : NOT_INTERSECTED;
  //       },
  //       intersectsTriangle: (tri: THREE.Triangle, index: number, contained: boolean) => {
  //         const triIndex = index;
  //         triangles.add(triIndex);
  //         const i3 = 3 * index;
  //         const a = i3 + 0;
  //         const b = i3 + 1;
  //         const c = i3 + 2;
  //         const va = indexAttr.getX(a);
  //         const vb = indexAttr.getX(b);
  //         const vc = indexAttr.getX(c);
  //         if (contained) {
  //           indices.add(va);
  //           indices.add(vb);
  //           indices.add(vc);
  //         } else {
  //           if (sphere.containsPoint(tri.a)) {
  //             indices.add(va);
  //           }
  //           if (sphere.containsPoint(tri.b)) {
  //             indices.add(vb);
  //           }
  //           if (sphere.containsPoint(tri.c)) {
  //             indices.add(vc);
  //           }
  //         }
  //         return false;
  //       }
  //     });
  //     if (!indices.size && face) {
  //       const { a, b, c } = face;
  //       [a, b, c].forEach((index) => {
  //         if (!indices.has(index)) {
  //           indices.add(index);
  //         }
  //       })
  //     }
  //     if (indices.size) {
  //       console.log(342, object);
  //       const newGeometry = new THREE.BufferGeometry();
  //       const triangleMap: { triangleIndex: number; vertices: number[]; uvs: number[]; }[] = [];
  //       indices.forEach((index) => {
  //         const normal = tempVec.fromBufferAttribute(normalAttr, index);
  //         if (normal.dot(face.normal) <= 0) return;
  //         const position = tempVec.fromBufferAttribute(posAttr, index);
  //         const list = getAllIndicesUsingPoint(position, indexArray, posArray);
  //         list.forEach(([a, b, c]) => {
  //           const vertices: number[] = [];
  //           const uvs: number[] = [];
  //           [a, b, c].forEach((i) => {
  //             vertices.push(
  //               posAttr.getX(i),
  //               posAttr.getY(i),
  //               posAttr.getZ(i),
  //             );
  //             uvs.push(
  //               uvAttr.getX(i),
  //               uvAttr.getY(i),
  //             );
  //           });
  //           triangleMap.push({
  //             vertices,
  //             uvs,
  //             triangleIndex: a,
  //           });
  //         });
  //       });
  //       const positionList = flatten(triangleMap.map(v => v.vertices));
  //       const uvList = flatten(triangleMap.map(v => v.uvs));
  //       const indexList = new Array(Math.floor(positionList.length / 3)).fill(undefined).map((_, i) => {
  //         return i;
  //       });
  //       newGeometry.setAttribute(
  //         'position',
  //         new THREE.Float32BufferAttribute(positionList, 3)
  //       );
  //       newGeometry.setAttribute(
  //         'uv',
  //         new THREE.Float32BufferAttribute(uvList, 2)
  //       );
  //       newGeometry.setIndex(indexList);
  //       newGeometry.computeVertexNormals();

  //       const gridMaterial = new GridMaterial({
  //         side: THREE.DoubleSide,
  //         wireframe: true
  //       });
  //       const boxGeometry = new THREE.BoxGeometry(defectSize, 1, defectSize);
  //       const quaternion = new THREE.Quaternion();
  //       quaternion.setFromUnitVectors(face.normal, THREE.Object3D.DEFAULT_UP);
  //       boxGeometry.applyQuaternion(quaternion);
  //       boxGeometry.translate(localPoint.x, localPoint.y, localPoint.z);
  //       // const newMesh = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({
  //       //   color: 0xffffff * Math.random(),
  //       //   depthTest: false
  //       // }));
  //       // object.add(newMesh);
  //       const meshBrush = new Brush(newGeometry.clone(), gridMaterial);
  //       meshBrush.updateMatrixWorld();
  //       const boxBrush = new Brush(boxGeometry.clone(), gridMaterial);
  //       boxBrush.updateMatrixWorld();
  //       const resultObject = csgEvaluator.evaluate(
  //         meshBrush,
  //         boxBrush,
  //         INTERSECTION
  //       );
  //       resultObject.geometry.groups.length = 0;
  //       resultObject.material = applyMeshGridSkin(resultObject, {
  //         mapTextureURL: require('@/../public/image/2988D88A-8E41-4471-9AF4-22C3F0D67BF4.png')
  //       });
  //       resultObject.renderOrder = 100;
  //       object.add(resultObject);
  //     }
  //   }
  //   bridgeModel.traverse(e => {
  //     const child = e as THREE.Mesh;
  //     if (!child.isMesh) return;
  //     child.geometry.boundsTree!.refit();
  //     child.on('click', clickEvent);
  //   });

  //   return () => {
  //     bridgeModel.traverse(e => {
  //       const child = e as THREE.Mesh;
  //       if (!child.isMesh) return;
  //       child.off('click', clickEvent);
  //     });
  //   }
  // }, [bridgeModel, getAllIndicesUsingPoint, applyMeshGridSkin]);

  return (
    <div className={styles.bimContainer}>
      <Spin spinning={isToolLoading} tip={tooltip}>
        <div className={styles.sceneContainer}>
          <div ref={sceneRef} className={styles.scene} />
        </div>
      </Spin>
    </div>
  )
}

export default Bim;
