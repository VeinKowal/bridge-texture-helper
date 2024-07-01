import { CSS3DSprite, CSS3DObject } from '../lib/renderers/CSS3DRenderer';
import { Group, Sprite, SpriteMaterial } from 'three';
import Marker from './Marker';

class DomMarker extends Group {
  constructor(options) {
    super();
    this.isDomMarker = true;
    this.domElement = options.dom;
    this.userData.type = 'Marker';
    this.createMarker(options);
  }

  createMarker(options) {
    let object;
    let obj;

    const {
      isSprite,
      dom,
      localPosition,
      id,
      parent,
      complete,
      size,
      keepSize = false
    } = options;

    if (!dom) return false;

    if (isSprite) {
      obj = new CSS3DSprite(dom);
    } else {
      obj = new CSS3DObject(dom);
    }

    if (obj) {
      const mat = new SpriteMaterial({
        sizeAttenuation: !keepSize,
        opacity: 0,
        depthTest: false
      });
      object = new Sprite(mat);
      Marker.setVisible(obj, !!keepSize);
      object.add(obj);
    }

    if (object) {
      this.add(object);
      id && +id && (this.id = +id);
      size && object.scale.set(size, size, size);
      parent && parent.add(this);

      if (localPosition) {
        const [x, y, z] = localPosition;
        object.position.set(x, y, z);
      }
    } else {
      return false;
    }

    complete && complete(this, dom, { cssObj: obj, spriteObj: object });
  }

  destroy() {
    this.parent?.remove(this);
    this.domElement?.remove();
  }
}

export default DomMarker;
