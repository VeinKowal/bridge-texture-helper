import { Group, BoxHelper } from 'three';

class ModelLoader extends Group {
  constructor() {
    super();
  }

  moveToCenter = (mesh) => {
    const model = mesh ?? this.children[0];
    if (!model) return;
    model.applyMatrix4(this.matrixWorld);
    const box = new BoxHelper(model);
    if (!box.geometry.boundingSphere) {
      box.geometry.computeBoundingSphere();
    }
    const boundSphere = box.geometry.boundingSphere;
    const { x, y, z } = boundSphere.center;
    model.position.x -= x;
    model.position.y -= y;
    model.position.z -= z;
  };
}

export default ModelLoader;
