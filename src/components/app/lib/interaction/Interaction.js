import { Raycaster } from 'three';

class PointerEvents {
  static POINTER_EVENTS = {
    originPointerUp: 'originPointerUp',
    originPointerDown: 'originPointerDown',
    originClick: 'originClick',
    originMove: 'originMove',
    click: 'click',
    dblclick: 'dblclick',
    pointerdown: 'pointerdown',
    mousemove: 'mousemove',
    pointerup: 'pointerup'
  };
  static INTERACTION_MAP = new Map();
  static SCENE_MAP = new Map();
  static pointerDownPosition;
  static pointerUpPosition;

  static getInteractionFromObject = (object) => {
    let scene;
    if (object.isScene) {
      scene = object;
    } else {
      object.traverseAncestors((parent) => {
        if (parent.isScene) {
          scene = parent;
        }
      });
    }
    if (!scene) {
      console.error('Object3D not found');
      return;
    }
    const interaction = PointerEvents.SCENE_MAP.get(scene);
    if (!interaction) {
      console.error('no interaction!');
      return;
    }
    return interaction;
  };

  static isClickEvent = (position) => {
    if (PointerEvents.pointerDownPosition) {
      return (
        position.x === PointerEvents.pointerDownPosition.x &&
        position.y === PointerEvents.pointerDownPosition.y
      );
    }
    return false;
  };

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

  static init(raycaster, interaction) {
    if (!raycaster) {
      console.error('no raycaster!');
      raycaster = new Raycaster();
    }
    if (!interaction) {
      console.error('no interaction!');
      return raycaster;
    }
    const { render, scene, camera } = interaction;
    const { domElement } = render;
    if (!domElement) {
      console.error('no domElement!');
      return raycaster;
    }
    const eventsMap = new Map();
    const triggerEvents = (eventType, position, data) => {
      const events = eventsMap.get(eventType);
      if (events?.size) {
        const map = new Map();
        events?.forEach(({ target, event }) => {
          map.set(target, event);
        });
        raycaster.setFromCamera(position, camera);
        const intersects = raycaster.intersectObjects([...map.keys()], true);
        if (intersects?.length) {
          const type = eventType;
          const currentFace = intersects[0];
          const currentTarget = intersects[0]?.object;
          if (currentTarget) {
            if (map.has(currentTarget)) {
              const event = map.get(currentTarget);
              const target = currentTarget;
              event({
                type,
                currentFace,
                currentTarget,
                target,
                intersects,
                data
              });
            } else {
              currentTarget.traverseAncestors((parent) => {
                if (map.has(parent)) {
                  const event = map.get(parent);
                  const target = parent;
                  event({
                    type,
                    currentFace,
                    currentTarget,
                    target,
                    intersects,
                    data
                  });
                }
              });
            }
          }
        }
      }
    };
    PointerEvents.INTERACTION_MAP.set(interaction, eventsMap);
    PointerEvents.SCENE_MAP.set(scene, interaction);
    const pointerdownHandler = (e) => {
      PointerEvents.pointerDownPosition =
        PointerEvents.getNormalizedCanvasRelativePosition(e, domElement);
      triggerEvents(
        PointerEvents.POINTER_EVENTS.pointerdown,
        PointerEvents.pointerDownPosition,
        e
      );
    };
    const pointerupHandler = (e) => {
      const pointerUpPosition =
        PointerEvents.getNormalizedCanvasRelativePosition(e, domElement);
      PointerEvents.pointerUpPosition = pointerUpPosition;
      triggerEvents(
        PointerEvents.POINTER_EVENTS.pointerup,
        pointerUpPosition,
        e
      );
      if (PointerEvents.isClickEvent(pointerUpPosition)) {
        triggerEvents(PointerEvents.POINTER_EVENTS.click, pointerUpPosition, e);
      }
    };
    const clickHandler = (e) => {
      if (e.detail === 2) {
        const dblclickPosition =
          PointerEvents.getNormalizedCanvasRelativePosition(e, domElement);
        triggerEvents(
          PointerEvents.POINTER_EVENTS.dblclick,
          dblclickPosition,
          e
        );
      }
    };
    const moveHandler = (e) => {
      const pointerPosition = PointerEvents.getNormalizedCanvasRelativePosition(
        e,
        domElement
      );
      const events = eventsMap.get(PointerEvents.POINTER_EVENTS.mousemove);
      if (events?.size) {
        const map = new Map();
        events?.forEach(({ target, event }) => {
          map.set(target, event);
        });
        raycaster.setFromCamera(pointerPosition, camera);
        const intersects = raycaster.intersectObjects([...map.keys()], true);
        if (intersects?.length) {
          const type = PointerEvents.POINTER_EVENTS.mousemove;
          const currentFace = intersects[0];
          const currentTarget = intersects[0]?.object;
          if (currentTarget) {
            if (map.has(currentTarget)) {
              const event = map.get(currentTarget);
              const target = currentTarget;
              event({
                type,
                currentFace,
                currentTarget,
                target,
                intersects,
                data: e
              });
            } else {
              currentTarget.traverseAncestors((parent) => {
                if (map.has(parent)) {
                  const event = map.get(parent);
                  const target = parent;
                  event({
                    type,
                    currentFace,
                    currentTarget,
                    target,
                    intersects,
                    data: e
                  });
                }
              });
            }
          }
        }
      }
    };
    eventsMap.set(
      PointerEvents.POINTER_EVENTS.originPointerDown,
      pointerdownHandler
    );
    eventsMap.set(
      PointerEvents.POINTER_EVENTS.originPointerUp,
      pointerupHandler
    );
    eventsMap.set(PointerEvents.POINTER_EVENTS.originClick, clickHandler);
    eventsMap.set(PointerEvents.POINTER_EVENTS.originMove, moveHandler);
    domElement.addEventListener('pointerdown', pointerdownHandler);
    domElement.addEventListener('pointerup', pointerupHandler);
    domElement.addEventListener('click', clickHandler);
    domElement.addEventListener('pointermove', moveHandler);
    return raycaster;
  }

  static removeOriginHandler(interaction) {
    const { render } = interaction;
    const { domElement } = render;
    if (!domElement) return;
    const eventsMap = PointerEvents.INTERACTION_MAP.get(interaction);
    const pointerdownHandler = eventsMap.get(
      PointerEvents.POINTER_EVENTS.originPointerDown
    );
    const pointerupHandler = eventsMap.get(
      PointerEvents.POINTER_EVENTS.originPointerUp
    );
    const clickHandler = eventsMap.get(
      PointerEvents.POINTER_EVENTS.originClick
    );
    const moveHandler = eventsMap.get(PointerEvents.POINTER_EVENTS.originMove);
    domElement.removeEventListener('pointerdown', pointerdownHandler);
    domElement.removeEventListener('pointerup', pointerupHandler);
    domElement.removeEventListener('click', clickHandler);
    domElement.removeEventListener('pointermove', moveHandler);
  }

  static removeAllEvents(interaction) {
    if (!interaction) {
      PointerEvents.SCENE_MAP.forEach((interaction) => {
        PointerEvents.removeOriginHandler(interaction);
      });
      PointerEvents.INTERACTION_MAP.clear();
      PointerEvents.SCENE_MAP.clear();
    } else {
      const { scene } = interaction;
      PointerEvents.removeOriginHandler(interaction);
      PointerEvents.INTERACTION_MAP.delete(interaction);
      PointerEvents.SCENE_MAP.delete(scene);
    }
  }

  static destroy() {
    PointerEvents.removeAllEvents();
  }

  static addEventListenerByInteraction(interaction, type, callback, options) {
    if (!callback) {
      console.error('no callbak！');
      return;
    }
    const { target } = options || {};
    const eventsMap = PointerEvents.INTERACTION_MAP.get(interaction);
    const typeEventsMap = eventsMap.get(type);
    const key = `${target?.uuid}${callback}`;
    if (typeEventsMap) {
      typeEventsMap.set(key, {
        target,
        event: callback
      });
    } else {
      const map = new Map();
      map.set(key, {
        target,
        event: callback
      });
      eventsMap.set(type, map);
    }
  }

  static removeEventListenerByInteraction(
    interaction,
    type,
    callback,
    options
  ) {
    const { target } = options || {};
    const eventsMap = PointerEvents.INTERACTION_MAP.get(interaction);
    const typeEventsMap = eventsMap.get(type);
    if (typeEventsMap) {
      typeEventsMap.delete(`${target?.uuid}${callback}`);
    }
  }

  static addEventListenerByObject3D(object, type, callback) {
    const interaction = PointerEvents.getInteractionFromObject(object);
    if (!interaction) {
      return;
    }
    PointerEvents.addEventListenerByInteraction(interaction, type, callback, {
      target: object
    });
  }

  static removeEventListenerByObject3D(object, type, callback) {
    const interaction = PointerEvents.getInteractionFromObject(object);
    if (!interaction) {
      return;
    }
    PointerEvents.removeEventListenerByInteraction(
      interaction,
      type,
      callback,
      {
        target: object
      }
    );
  }
}

class Interaction {
  constructor(render, scene, camera) {
    this.render = render;
    this.scene = scene;
    this.camera = camera;
  }
}

export { PointerEvents, Interaction };
