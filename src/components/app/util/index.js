// 常用业务工具
import * as THREE from 'three';

/**
 * @description 操作相机飞行至观察位置.
 * @param {App} app.
 * @param {Object} options - 配置项
 * @property {Object3D} options.target - 需要观察的对象，缺省则默认为场景中所有物体.
 * @property {number} options.time - 相机飞行时间.
 * @property {[number, number, number]} options.angle - 观察角度.
 * @property {number} options.ratio - 设定相机与观察目标的距离是物体包围球直径的多少倍.
 * @property {number} options.distance - 设定相机与观察目标的距离在ratio的基础上再增多少单位.
 * @property {() => void} options.complete - 相机飞行结束的回调函数.
 * @return {void}.
 */
export const appCameraFitTarget = (app, options) => {
  if (!app) return;
  const {
    time = 0,
    angle = [0, 0, 0],
    ratio = 1,
    distance = 0,
    complete
  } = options || {};
  // 如果没有指定对象，默认囊括所有模型
  const target = options?.target || app.scene;
  // 计算相机到物体中心的距离
  const radius =
    new THREE.Box3()
      .setFromObject(target)
      .getSize(new THREE.Vector3())
      .length() *
      ratio +
    distance;
  // 限制相机缩放的最大距离
  app.controls.forEach((control) => {
    control.maxDistance = radius * 2;
  });
  app.flyToTarget({
    target,
    time,
    angle,
    radius,
    complete
  });
};
