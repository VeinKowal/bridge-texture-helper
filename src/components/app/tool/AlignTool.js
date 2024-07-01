import Tool from './Tool';
import * as THREE from 'three';

class AlignTool extends Tool {
  static apply = (mesh, options = {}) => {
    const { isReverse } = options;
    const ratio = isReverse ? -1 : 1;
    // 计算物体的包围盒
    const boundingBox = new THREE.Box3().setFromObject(mesh);

    // 找到包围盒的尺寸
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    // 找到最小的轴
    const minDimension = Math.min(size.x, size.y, size.z);
    let rotationEuler = new THREE.Euler(0, 0, 0);

    // 如果最小的轴不是 y 轴，则计算旋转角度
    if (minDimension !== size.y) {
      if (minDimension === size.x) {
        // 使 x 轴与 y 轴平行
        rotationEuler = new THREE.Euler(0, 0, (Math.PI / 2) * ratio);
      } else {
        // 使 z 轴与 y 轴平行
        rotationEuler = new THREE.Euler((Math.PI / 2) * ratio, 0, 0);
      }
    }

    // 创建旋转矩阵
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationFromEuler(rotationEuler);

    // 应用旋转矩阵到物体
    mesh.applyMatrix4(rotationMatrix);
  };
}

export default AlignTool;
