import { CSS3DObject } from '../lib/renderers/CSS3DRenderer';
import { Group, Sprite, SpriteMaterial, TextureLoader } from 'three';
import Marker from './Marker';

class ImgMarker extends Group {
  constructor(config) {
    super();
    this.isImgMarker = true;
    this.userData.type = 'Marker';
    this.createMarker(config);
  }

  createMarker(config) {
    let marker;
    const image = document.createElement('img');

    const {
      id,
      url,
      parent,
      localPosition,
      size,
      keepSize,
      isSprite,
      complete
    } = config;

    if (!url) return false;

    if (isSprite) {
      const map = new TextureLoader().load(url);
      
      map.minFilter = THREE.NearestFilter;
      map.magFilter = THREE.NearestFilter;
      map.generateMipmaps = true;
      map.minFilter = THREE.LinearMipmapLinearFilter;
      map.needsUpdate = true;

      const spriteMaterial = new SpriteMaterial({
        map,
        sizeAttenuation: !keepSize,
        depthTest: false
      });
      marker = new Sprite(spriteMaterial);
    } else {
      image.src = url;
      const object = new CSS3DObject(image);
      if (object) {
        const mat = new SpriteMaterial({
          sizeAttenuation: !keepSize,
          opacity: 0,
          depthTest: false
        });
        marker = new Sprite(mat);
        Marker.setVisible(object, !!keepSize);
        marker.add(object);
      }
    }

    if (marker) {
      this.add(marker);
      id && +id && (this.id = +id);
      size && marker.scale.setScalar(size * 10);
      parent && parent.add(this);

      if (localPosition) {
        const [x, y, z] = localPosition;
        marker.position.set(x, y, z);
      }
    } else return false;

    complete && complete(this, isSprite ? null : image);
  }
}

export default ImgMarker;
