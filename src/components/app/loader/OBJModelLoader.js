import ModelLoader from './ModelLoader';
import { MTLLoader } from '../lib/loaders/MTLLoader';
import { OBJLoader } from '../lib/loaders/OBJLoader';
import { Importer, ImportSettings } from '../lib/exporters/import/importer';
import { InputFilesFromUrls } from '../lib/exporters/import/importerfiles';
import { DoubleSide } from 'three';

class OBJModelLoader extends ModelLoader {
  load(options) {
    const {
      url,
      mtlUrl,
      textureUrl,
      complete,
      process,
      autoCenter = true
    } = options;
    if (!url) return;
    let res;
    const promise = new Promise((resolve) => {
      res = resolve;
    });
    if (mtlUrl) {
      const mtlLoader = new MTLLoader();
      if (textureUrl) {
        mtlLoader.setResourcePath(textureUrl);
      }
      mtlLoader.load(mtlUrl, (mtl) => {
        if (mtl) {
          mtl.preload();
        }
        const ovImporter = new Importer();
        const settings = new ImportSettings();
        const files = InputFilesFromUrls(
          [url, mtlUrl, textureUrl].filter((e) => !!e)
        );
        ovImporter.ImportFiles(files, settings, {
          onLoadStart: () => {},
          onFileListProgress: () => {},
          onFileLoadProgress: () => {},
          onImportStart: () => {},
          onImportSuccess: () => {},
          onImportError: () => {}
        });
        this.ovImporter = ovImporter;
        res(mtl);
      });
    } else {
      res();
    }
    promise.then((mtl) => {
      const loader = new OBJLoader();
      if (mtl) {
        loader.setMaterials(mtl);
      }
      loader.load(
        url,
        (model) => {
          model.traverse((child) => {
            if (!child.isMesh) return;
            child.geometry.computeVertexNormals();
            child.geometry.computeBoundsTree();
            const rawMaterial = child.material;
            if (!rawMaterial) return;
            if (Array.isArray(rawMaterial)) {
              rawMaterial.forEach((m) => {
                m.side = DoubleSide;
              });
            } else {
              rawMaterial.side = DoubleSide;
            }
          });
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
    });
  }
}

export default OBJModelLoader;
