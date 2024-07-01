import ModelLoader from './ModelLoader';
import { GLTFLoader } from '../lib/loaders/GLTFLoader';

class GLTFModelLoader extends ModelLoader {
  load(options) {
    const {
      url,
      complete,
      process,
      autoCenter = true
    } = options;
    if (!url) return;
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        const { scene } = gltf;
        if (!scene) return;
        scene.traverse((child) => {
          if (!child.isMesh) return;
          child.geometry.computeVertexNormals();
          child.geometry.computeBoundsTree();
        });
        if (autoCenter) {
          this.moveToCenter(scene);
        }
        this.add(scene);
        complete?.(this);
      },
      (info) => {
        process?.(info);
      },
    );
  }
}

export default GLTFModelLoader;
