import Tool from './Tool';
import * as THREE from 'three';

class MarkerDraggableTool extends Tool {
  static raycaster = new THREE.Raycaster();

  static getNormalizedCanvasRelativePosition = (e, domElement) => {
    const boundingRect = domElement.getBoundingClientRect();
    const clientX =
      Number.isNaN(+e.clientX) && e.changedTouches.length
        ? e.changedTouches[0].clientX
        : e.clientX;
    const clientY =
      Number.isNaN(+e.clientY) && e.changedTouches.length
        ? e.changedTouches[0].clientY
        : e.clientY;
    return {
      x: ((clientX - boundingRect.left) / boundingRect.width) * 2 - 1,
      y: ((clientY - boundingRect.top) / boundingRect.height) * -2 + 1
    };
  };

  static isObjectVisible = (object) => {
    if (object.visible === false) return false;
    if (object.parent === null) return true;
    return MarkerDraggableTool.isObjectVisible(object.parent);
  };

  static apply = (mesh, options = {}) => {
    const { app, objects, complete } = options;
    if (!app) {
      return;
    }
    const { renderDom, camera, scene } = app;
    const { domElement, children } = mesh;
    const object = children[0];
    const moveObjectByEventInfo = (e) => {
      const pointerPosition =
        MarkerDraggableTool.getNormalizedCanvasRelativePosition(e, renderDom);
      MarkerDraggableTool.raycaster.setFromCamera(pointerPosition, camera);
      const intersects = MarkerDraggableTool.raycaster
        .intersectObjects(objects ? [objects] : scene.children, true)
        ?.filter(
          (e) =>
            !e.object.isSprite && MarkerDraggableTool.isObjectVisible(e.object)
        );
      if (intersects?.length) {
        const nearestIntersect = intersects[0];
        object.position.copy(nearestIntersect.point);
        return nearestIntersect.point;
      }
    };
    const onPointerMove = (e) => {
      moveObjectByEventInfo(e);
    };
    const onPointerUp = (e) => {
      renderDom.removeEventListener('pointermove', onPointerMove);
      renderDom.removeEventListener('pointerup', onPointerUp);
      const point = moveObjectByEventInfo(e);
      complete?.(point);
    };
    const onPointerDown = (e) => {
      e.stopPropagation();
      renderDom.addEventListener('pointermove', onPointerMove);
      renderDom.addEventListener('pointerup', onPointerUp);
    };
    domElement.addEventListener('pointerdown', onPointerDown);
  };
}

export default MarkerDraggableTool;
