import Tool from './Tool';
import { Raycaster, Vector2, MeshBasicMaterial } from 'three';

class CutTool extends Tool {
  static areaPointsSet = new Set();
  static raycaster = new Raycaster();

  static isPolygonAreaContain(point, polygon) {
    //判断两条线段是否相交
    const checkCross = (p1, p2, p3, p4) => {
      let v1 = { x: p1.x - p3.x, y: p1.y - p3.y },
        v2 = { x: p2.x - p3.x, y: p2.y - p3.y },
        v3 = { x: p4.x - p3.x, y: p4.y - p3.y },
        v = crossMul(v1, v3) * crossMul(v2, v3);

      v1 = { x: p3.x - p1.x, y: p3.y - p1.y };
      v2 = { x: p4.x - p1.x, y: p4.y - p1.y };

      v3 = { x: p2.x - p1.x, y: p2.y - p1.y };
      return v <= 0 && crossMul(v1, v3) * crossMul(v2, v3) <= 0 ? true : false;
    };

    //计算向量叉乘
    const crossMul = (v1, v2) => {
      return v1.x * v2.y - v1.y * v2.x;
    };

    const p1 = point;
    const p2 = { x: 1000000000000, y: point.y };
    let p3, p4;
    let count = 0;
    //对每条边都和射线作对比
    for (let i = 0; i < polygon.length - 1; i += 1) {
      p3 = polygon[i];
      p4 = polygon[i + 1];
      if (checkCross(p1, p2, p3, p4) == true) {
        count += 1;
      }
    }
    p3 = polygon[polygon.length - 1];

    p4 = polygon[0];
    if (checkCross(p1, p2, p3, p4) == true) {
      count += 1;
    }

    return count % 2 == 0 ? false : true;
  }

  static createRandomPoint(points) {
    const minX = Math.min(...points.map((e) => e.x));
    const maxX = Math.max(...points.map((e) => e.x));
    const minY = Math.min(...points.map((e) => e.y));
    const maxY = Math.max(...points.map((e) => e.y));
    const x = Math.random() * (maxX - minX) + minX;
    const y = Math.random() * (maxY - minY) + minY;
    return { x, y };
  }

  static createAreaPoint(points) {
    let isAreaPoint = false;
    let point;
    while (!isAreaPoint) {
      point = CutTool.createRandomPoint(points);
      const condition1 = !CutTool.areaPointsSet.has(`${point.x} ${point.y}`);
      const condition2 = CutTool.isPolygonAreaContain(point, points);
      if (condition1 && condition2) {
        isAreaPoint = true;
      }
    }
    return new Vector2().copy(point);
  }

  static createRaycaster(point, camera, mesh) {
    CutTool.raycaster.setFromCamera(point, camera);
    return CutTool.raycaster.intersectObjects(mesh.children, true);
  }

  static cutBufferGeometry(geometry, faceIndex) {
    const totalCount = geometry.attributes.position.array.length;
    const cutIndex = faceIndex * 3;
    const cutCount = 3;
    const groups = geometry.groups;
    // 如果给定的索引大于现有的顶点数，直接返回
    if (cutIndex >= totalCount) {
      return;
    }
    let isAdjoin = false;
    for (let i = 0; i < groups.length; i += 1) {
      const group = groups[i];
      // 如果找到相邻的组并且材质索引相同，合并组
      if (group.materialIndex === 1) {
        if (group.start <= cutIndex && group.start + group.count >= cutIndex) {
          group.count = cutIndex + cutCount - group.start; // 增加组的顶点数量
          isAdjoin = true;
          return;
        }
      }
    }
    if (!isAdjoin) {
      geometry.addGroup(cutIndex, cutCount, 1);
    }
    const _tempGroups = geometry.groups;
    geometry.clearGroups();
    const opacityGroups = _tempGroups
      .filter((e) => e.materialIndex === 1)
      .sort((a, b) => {
        return a.start - b.start;
      });
    const lengthOpacityGroups = opacityGroups.length;
    opacityGroups.forEach((group, index) => {
      const { start, count } = group;
      if (index === 0) {
        if (start !== 0) {
          geometry.addGroup(0, start, 0);
        }
      } else {
        const previousGroup = opacityGroups[index - 1];
        const preStart = previousGroup.start;
        const preEnd = preStart + previousGroup.count;
        const opacityCount = start - preEnd;
        geometry.addGroup(preEnd, opacityCount, 0);
      }
      if (index === lengthOpacityGroups - 1) {
        const end = start + count;
        if (end !== totalCount) {
          geometry.addGroup(end, totalCount, 0);
        }
      }
      geometry.addGroup(start, count, 1);
    });
    // console.log(
    //   cutIndex,
    //   geometry.groups.map((e) => ({
    //     start: e.start,
    //     count: e.count,
    //     materialIndex: e.materialIndex
    //   }))
    // );
  }

  static apply(mesh, options = {}) {
    const { points = [], precision = 9, camera } = options;
    const rayLength = precision;
    CutTool.areaPointsSet.clear();
    const vertices = new Array(rayLength)
      .fill('')
      .map(() => {
        const point = CutTool.createAreaPoint(points);
        CutTool.areaPointsSet.add(`${point.x} ${point.y}`);
        const intersects = CutTool.createRaycaster(point, camera, mesh);
        if (intersects?.length) {
          return intersects[0];
        }
      })
      .filter((e) => !!e)
      .sort((a, b) => {
        return a.faceIndex - b.faceIndex;
      });
    const filterVertices = vertices.reduce((accumulator, currentObject) => {
      // 检查是否已经存在相同的faceIndex
      const existingObject = accumulator.find(
        (item) => item.faceIndex === currentObject.faceIndex
      );
      // 如果不存在相同的faceIndex，则添加到结果数组中
      if (!existingObject) {
        accumulator.push(currentObject);
      }
      return accumulator;
    }, []);
    // console.log(filterVertices);
    filterVertices.forEach((e) => {
      const { object, faceIndex } = e;
      const { geometry } = object;
      if (!Array.isArray(object.material)) {
        const count = geometry.attributes.position.array.length;
        const materials = [object.material];
        materials.push(
          new MeshBasicMaterial({
            transparent: true,
            opacity: 0
          })
        );
        object.material = materials;
        geometry.addGroup(0, count, 0);
      }
      object.material;
      CutTool.cutBufferGeometry(geometry, faceIndex);
    });
  }
}

export default CutTool;
