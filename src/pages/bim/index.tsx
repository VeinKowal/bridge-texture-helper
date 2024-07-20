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
import { isEqual } from 'lodash';
import { useMemoizedFn } from 'ahooks';
import * as THREE from 'three';
import { CONTAINED, INTERSECTED, NOT_INTERSECTED } from 'three-mesh-bvh';
import App from '@/components/app';
import useBridgeGroup from '@/assets/useBridgeGroup';
import { appCameraFitTarget } from '@/components/app/util';

const textureLoader = new THREE.TextureLoader();

type BimProps = unknown;

type FaceLike = {
  a: number;
  b: number;
  c: number;
  normal: THREE.Vector3;
}

const MEMBER_DEFECT_LOCATION: Record<string, ['front' | 'back', 'left' | 'right', 'top' | 'bottom']> = {
  底板: ['front', 'right', 'bottom'],
  腹板: ['front', 'right', 'bottom'],
  翼板: ['front', 'right', 'bottom'],
  立柱: ['front', 'right', 'bottom']
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

  const getRangeDistance = useMemoizedFn((rangeStr: string | number) => {
    if (!rangeStr) return [0, 0, 0, 0];
    if (typeof rangeStr === 'number') {
      const value = rangeStr * 1000;
      return [value, value, value, 0];
    }
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
    const indexArray = geometry.index!.array;

    let a: number | undefined = undefined;
    let b: number | undefined = undefined;
    let c: number | undefined = undefined;
    const normal = new THREE.Vector3();

    const tempVectorA = new THREE.Vector3();
    const tempVectorB = new THREE.Vector3();
    const tempVectorC = new THREE.Vector3();

    let minDistance = Infinity;
    let closestFace: FaceLike | undefined = undefined;
    for (let i = 0; i < indexArray.length; i += 3) {
      tempVectorA.fromBufferAttribute(positionAttr, indexArray[i]);
      tempVectorB.fromBufferAttribute(positionAttr, indexArray[i + 1]);
      tempVectorC.fromBufferAttribute(positionAttr, indexArray[i + 2]);
      const triangle = new THREE.Triangle(tempVectorA, tempVectorB, tempVectorC);
      const projection = new THREE.Vector3();
      triangle.closestPointToPoint(point, projection);
      const distance = projection.distanceTo(point);

      if (distance < minDistance) {
        minDistance = distance;
        a = indexArray[i];
        b = indexArray[i + 1];
        c = indexArray[i + 2];
        triangle.getNormal(normal);
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
    const normalAttr = geometry.attributes.normal;
    const indexAttr = geometry.index!;
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
                  z === 0 ? boxMin.z : boxMax.z,
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
      console.log('贴图中');
      const targetNormal = new THREE.Vector3();
      const faceNormal = localFace.normal;
      indices.forEach((index) => {
        const normal = tempVec.fromBufferAttribute(normalAttr, index);
        if (normal.dot(faceNormal) <= 0) return;
        targetNormal.add(normal);
      });
      targetNormal.divideScalar(indices.size).normalize();
      const defectGeometry = new THREE.PlaneGeometry(defectSize, defectSize);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, targetNormal);
      quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
      defectGeometry.applyQuaternion(quaternion);
      if (targetNormal.y > 0) {
        defectGeometry.translate(0, 0.01, 0);
      } else {
        defectGeometry.translate(0, -0.01, 0);
      }
      const defectMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        depthTest: false,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        side: THREE.DoubleSide
      });
      textureLoader.loadAsync(textureUrl).then((texture) => {
        defectMaterial.map = texture;
        defectMaterial.needsUpdate = true;
      });
      const defectMesh = new THREE.Mesh(defectGeometry, defectMaterial);
      defectMesh.position.copy(localPoint);
      object.add(defectMesh);
      console.log('贴图结束');
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
      const { sideType, memberType, memberNo, pDistRange, iDistRange, tDistRange } = defectInfo;
      const singleBridgeModel = bridgeModel.query(new RegExp(`${sideType}`))?.[0] as THREE.Object3D;
      if (!singleBridgeModel) return;
      const memberModel = singleBridgeModel.query(new RegExp(`${memberType}@${memberNo}`))?.[0] as THREE.Mesh;
      const locationInfo = MEMBER_DEFECT_LOCATION[memberType];
      console.log(memberModel, locationInfo);

      if (memberModel && locationInfo) {
        memberModel.updateMatrixWorld();
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
        if (originLocalPosition && (typeof pDistRange !== 'undefined') && (iDistRange || tDistRange)) {
          const defectLocalPosition = new THREE.Vector3().copy(originLocalPosition);
          const [startDistance1, endDistance1, middleDistance1, length1] = getRangeDistance(pDistRange);
          const [startDistance2, endDistance2, middleDistance2, length2] = getRangeDistance(iDistRange);
          const [startDistance3, endDistance3, middleDistance3, length3] = getRangeDistance(tDistRange);
          const [direct1, direct2, direct3] = locationInfo;
          console.log(middleDistance1, middleDistance2, middleDistance3);
          console.log(length1, length2, length3);
          if (direct3 === 'top') {
            defectLocalPosition.y -= middleDistance3;
            if (direct1 === 'back') {
              defectLocalPosition.x -= middleDistance1;
              if (direct2 === 'left') {
                defectLocalPosition.z -= middleDistance2;
              } else {
                defectLocalPosition.z += middleDistance2;
              }
            } else {
              defectLocalPosition.x += middleDistance1;
              if (direct2 === 'left') {
                defectLocalPosition.z -= middleDistance2;
              } else {
                defectLocalPosition.z += middleDistance2;
              }
            }
          } else {
            defectLocalPosition.y += middleDistance3;
            if (direct1 === 'back') {
              defectLocalPosition.x -= middleDistance1;
              if (direct2 === 'left') {
                defectLocalPosition.z -= middleDistance2;
              } else {
                defectLocalPosition.z += middleDistance2;
              }
            } else {
              defectLocalPosition.x += middleDistance1;
              if (direct2 === 'left') {
                defectLocalPosition.z -= middleDistance2;
              } else {
                defectLocalPosition.z += middleDistance2;
              }
            }
          }
          const face = findClosestTriangle(
            defectLocalPosition,
            geometry,
          );
          if (face) {
            console.log('开始贴图');
            addDefectTexture({
              object: memberModel,
              localFace: face,
              localPoint: defectLocalPosition,
              textureUrl: require('@/../public/image/裂缝.png'),
              defectSize: Math.max(length1, length2, length3) || 1000,
            });
            {
              // 标记face三点位置
              const { a, b, c } = face;
              [a, b, c].forEach((index) => {
                const position = new THREE.Vector3().fromBufferAttribute(positionAttr, index);
                const geo = new THREE.SphereGeometry(100);
                const mat = new THREE.MeshBasicMaterial({
                  color: 0xffffff * Math.random(),
                  // depthTest: false,
                  depthTest: true,
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.copy(position);
                memberModel.add(mesh);
                memberModel.position.y += (memberModel.geometry.boundingSphere?.radius || 0) + 500;
              })
            }
            // {
            //   // 标记病害位置
            //   const geo = new THREE.SphereGeometry(100);
            //   const mat = new THREE.MeshBasicMaterial({
            //     color: 0xff0000,
            //     depthTest: false,
            //     // depthTest: true,
            //   });
            //   const mesh = new THREE.Mesh(geo, mat);
            //   mesh.position.copy(defectLocalPosition);
            //   memberModel.add(mesh);
            // }
            // {
            //   // 标记实际边缘点位置
            //   edgeVertices.forEach((position) => {
            //     const geo = new THREE.SphereGeometry(100);
            //     const mat = new THREE.MeshBasicMaterial({
            //       color: 0xffffff * Math.random(),
            //       depthTest: false,
            //       // depthTest: true,
            //     });
            //     const mesh = new THREE.Mesh(geo, mat);
            //     mesh.position.copy(position);
            //     memberModel.add(mesh);
            //   })
            // }
          }
        }
      }
    });
  }, [bridgeDefectList, bridgeModel, getRangeDistance, addDefectTexture]);

  // 点哪儿贴哪儿
  useEffect(() => {
    if (!bridgeModel) return;
    const clickEvent = (e) => {
      if (e.data.button !== 0) return;
      const face = e.currentFace.face;
      const point = e.currentFace.point;
      const object = e.currentTarget;
      object.updateMatrixWorld();
      console.log(object);

      const inverseMatrix = new THREE.Matrix4();
      inverseMatrix.copy(object.matrixWorld).invert();
      const localPoint = new THREE.Vector3();
      localPoint.copy(point).applyMatrix4(inverseMatrix);

      const defectSize = 1000;
      addDefectTexture({
        object,
        localPoint,
        defectSize,
        localFace: face,
        textureUrl: require('@/../public/image/裂缝.png'),
      });
    }
    bridgeModel.traverse(e => {
      const child = e as THREE.Mesh;
      if (!child.isMesh) return;
      child.geometry.boundsTree?.refit();
      child.on('click', clickEvent);
    });

    return () => {
      bridgeModel.traverse(e => {
        const child = e as THREE.Mesh;
        if (!child.isMesh) return;
        child.off('click', clickEvent);
      });
    }
  }, [bridgeModel, addDefectTexture]);

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
