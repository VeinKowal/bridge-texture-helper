import ImgMarker from './ImgMarker';
import DomMarker from './DomMarker';
import { Object3D, Vector3 } from 'three';

export default class Marker extends Object3D {
  static create(options) {
    const { dom, url } = options || {};
    if (!dom && !url) {
      console.error('请设置节点或图片');
    }

    if (dom && url) {
      console.error('请勿同时设置节点与图片（默认返回节点标识）');
    }

    if (dom) {
      return new DomMarker(options);
    }

    if (url) {
      return new ImgMarker(options);
    }
  }

  /**
   * @description 根据相机与节点位置控制显隐 如果消失在场景外 则div也消失.
   * @param {paramType} paramName - paramDescription.
   * @return {void}.
   */
  static setVisible = (obj, keepSize) => {
    obj.onAfterRender = (renderer, scene, camera) => {
      const pc = camera.position;
      const ps = obj.getWorldPosition(new Vector3());
      const unitVectorB = ps.clone().normalize();
      const projectVector = unitVectorB.clone().multiplyScalar(pc.clone().dot(unitVectorB));
      const distance = pc.distanceTo(projectVector);
      const scale = distance / 100;
      // 根据相机与节点位置更改marker大小 以此保证大小尽量不因为距离改变.
      keepSize && obj.scale.set(scale, scale, scale);
      distance > camera.far ? (obj.visible = false) : (obj.visible = true);
    };
    return obj;
  };
}
