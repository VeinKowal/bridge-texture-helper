import * as THREE from "three";

class MouseOverDetectTool {
  static raycaster = new THREE.Raycaster();
  static map = new Map();

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
      y: ((clientY - boundingRect.top) / boundingRect.height) * -2 + 1,
    };
  };

  static isObjectVisible = (object) => {
    if (object.visible === false) return false;
    if (object.parent === null) return true;
    return MouseOverDetectTool.isObjectVisible(object.parent);
  };

  static apply = (options = {}) => {
    const { app, objects, complete } = options;
    if (!app) {
      return;
    }
    const { renderDom, camera, scene } = app;
    const moveObjectByEventInfo = (e) => {
      const pointerPosition =
        MouseOverDetectTool.getNormalizedCanvasRelativePosition(e, renderDom);
      MouseOverDetectTool.raycaster.setFromCamera(pointerPosition, camera);
      const intersects = MouseOverDetectTool.raycaster
        .intersectObjects(objects ? [objects] : scene.children, true)
        ?.filter(
          (e) =>
            !e.object.isSprite && MouseOverDetectTool.isObjectVisible(e.object)
        );
      if (intersects?.length) {
        const nearestIntersect = intersects[0];
        complete?.(nearestIntersect, intersects);
      }
    };
    const onPointerMove = (e) => {
      moveObjectByEventInfo(e);
    };
    renderDom.addEventListener("pointermove", onPointerMove);
    MouseOverDetectTool.map.set(renderDom, onPointerMove);
  };

  static destroy = (dom) => {
    if (!dom) return;
    if (MouseOverDetectTool.has(dom)) {
      const pointerEvent = MouseOverDetectTool.map.get(dom);
      dom.removeEventListener("pointermove", pointerEvent);
      MouseOverDetectTool.map.delete(dom);
    } else {
      MouseOverDetectTool.map.forEach((pointerEvent, renderDom) => {
        renderDom.removeEventListener("pointermove", pointerEvent);
      });
      MouseOverDetectTool.map.clear();
    }
  };
}

export default MouseOverDetectTool;
