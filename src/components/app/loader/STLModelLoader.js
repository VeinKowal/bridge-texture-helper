import ModelLoader from './ModelLoader';
import { STLLoader } from '../lib/loaders/STLLoader';
import {
  MeshPhongMaterial,
  MeshStandardMaterial,
  DoubleSide,
  Mesh
} from 'three';

class STLModelLoader extends ModelLoader {
  load(options) {
    const { url, material, complete, process, autoCenter = true } = options;
    const loader = new STLLoader();
    loader.load(
      url,
      (geo) => {
        let initMaterial;
        if (geo.hasColors) {
          initMaterial = new MeshPhongMaterial({
            opacity: geo.alpha,
            vertexColors: true,
            side: DoubleSide
          });
        } else {
          initMaterial = new MeshStandardMaterial();
        }
        if (material) {
          initMaterial = material;
        }
        const model = new Mesh(geo, initMaterial);
        if (autoCenter) {
          this.moveToCenter(model);
        }
        this.add(model);
        complete?.(model);
      },
      (info) => {
        process?.(info);
      }
    );
  }
}

export default STLModelLoader;
