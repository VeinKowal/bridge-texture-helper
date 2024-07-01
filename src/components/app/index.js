import './patch/Object3D';
import * as TWEEN from '@tweenjs/tween.js';
import * as THREE from 'three';
import ThreeInitializer from './initializer/ThreeInitializer';
import { PointerEvents } from './lib/interaction/Interaction';
import OBJModelLoader from './loader/OBJModelLoader';
import STLModelLoader from './loader/STLModelLoader';
import PLYModelLoader from './loader/PLYModelLoader';
import GLTFModelLoader from './loader/GLTFModelLoader';
import Marker from './marker/Marker';
import AlignTool from './tool/AlignTool';
import CutTool from './tool/CutTool';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { ExporterObj } from './lib/exporters/exporterobj';
import { CreateObjectUrl } from './lib/exporters/io/bufferutils.js';

class App {
  static LOGIN_EVENT_TYPES = {
    UPDATE: 0
  };
  static MODEL_TYPES = {
    OBJ: 0,
    STL: 1,
    PLY: 2,
    GLTF: 3,
    GLB: 4,
    MARKER: 5
  };
  static TOOL_TYPES = {
    ALIGN: 0,
    CUT: 1
  };
  animate;

  /**
   * @param {object} [config]
   * @param {HTMLDivElement} [config.renderDom] - 需要挂载到的dom节点
   */
  constructor(config) {
    const {
      renderDom,
      camera,
      scene,
      cssRenderer,
      renderer,
      cssOrbitControl,
      orbitControl,
      composer,
      renderPass,
      outlinePass,
      effectFXAA,
      interaction,
      raycaster
    } = ThreeInitializer.init(config);
    this.renderDom = renderDom;
    this.camera = camera;
    this.scene = scene;
    this.cssRenderer = cssRenderer;
    this.renderer = renderer;
    this.cssOrbitControl = cssOrbitControl;
    this.orbitControl = orbitControl;
    this.controls = [orbitControl, cssOrbitControl];
    this.composer = composer;
    this.renderPass = renderPass;
    this.outlinePass = outlinePass;
    this.effectFXAA = effectFXAA;
    this.interaction = interaction;
    this.raycaster = raycaster;
    this.updateEvents = new Map();
    this.init();
  }

  init = () => {
    this.run();
    window.addEventListener('resize', this.onResize);
  };

  run = () => {
    TWEEN.update();
    this.animate = requestAnimationFrame(this.run);

    // 运行已注册的更新方法
    this.updateEvents.forEach((events) => {
      if (events?.length) {
        events.forEach((e) => {
          e?.(this);
        });
      }
    });

    // 后处理未开启时
    // cssrenderer应放置于renderer上方，control下方
    if (!this.isPostprocessing) {
      if (!this.view) {
        this.controls.forEach((control) => control.update());
      }
      this.cssRenderer.render(this.scene, this.camera);
      if (!this.view) {
        this.renderer.render(this.scene, this.camera);
      }
    }

    // 当后处理开始后
    if (this.isPostprocessing) {
      if (!this.view) {
        this.controls.forEach((control) => control.update());
        this.renderer.render(this.scene, this.camera);
      }
      // 这两句置于下方
      // 防止css3object抖动
      this.cssRenderer.render(this.scene, this.camera);
    }

    // 抗锯齿生效
    this.composer.render();
  };

  login = (name, func, type) => {
    if (type === App.LOGIN_EVENT_TYPES.UPDATE) {
      const eventList = this.updateEvents.get(name);
      if (eventList) {
        eventList.push(func);
      } else {
        this.updateEvents.set(name, [func]);
      }
    }
  };

  onResize = () => {
    ThreeInitializer.updateRender({
      renderDom: this.renderDom,
      renderer: this.renderer,
      composer: this.composer,
      effectFXAA: this.effectFXAA
    });
    ThreeInitializer.updateRender({
      renderDom: this.renderDom,
      renderer: this.cssRenderer,
      composer: this.composer,
      effectFXAA: this.effectFXAA
    });
    ThreeInitializer.updateCamera({
      renderDom: this.renderDom,
      camera: this.camera
    });
  };

  destroy() {
    PointerEvents.removeAllEvents(this.interaction);
    this.animate && cancelAnimationFrame(this.animate);
    window.removeEventListener('resize', this.onResize);
    this.scene.traverse((child) => {
      const { geometry, material } = child;
      if (geometry) {
        geometry.destroy?.();
      }
      if (material) {
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose());
        } else {
          material.dispose();
        }
      }
    });
    if (this.renderer && this.renderer.domElement) {
      const { domElement } = this.renderer;
      this.renderer.dispose();
      domElement
        .getContext('webgl')
        ?.getExtension('WEBGL_lose_context')
        ?.loseContext();
      this.renderDom.innerHTML = '';
    }
  }

  /**
   * @param {object} options.
   * @param {App.MODEL_TYPES} [options.type] - 物体类型.
   * @param {string} [options.url] - 资源地址.
   * @description 用于创建常见物体
   */
  create = (options) => {
    const { type } = options;
    if (type === App.MODEL_TYPES.OBJ) {
      const loader = new OBJModelLoader();
      loader.load(options);
      return loader;
    }
    if (type === App.MODEL_TYPES.STL) {
      const loader = new STLModelLoader();
      loader.load(options);
      return loader;
    }
    if (type === App.MODEL_TYPES.PLY) {
      const loader = new PLYModelLoader();
      loader.load(options);
      return loader;
    }
    if (type === App.MODEL_TYPES.GLTF || type === App.MODEL_TYPES.GLB) {
      const loader = new GLTFModelLoader();
      loader.load(options);
      return loader;
    }
    if (type === App.MODEL_TYPES.MARKER) {
      return Marker.create(options);
    }
  };

  apply = (mesh, type, options) => {
    if (!mesh) {
      console.error('No mesh！');
      return;
    }
    if (type === App.TOOL_TYPES.ALIGN) {
      AlignTool.apply(mesh, options);
    }
    if (type === App.TOOL_TYPES.CUT) {
      CutTool.apply(mesh, options);
    }
  };

  export = (params) => {
    const { model, format, autoDownload, complete, options } = params;
    if (format === App.MODEL_TYPES.OBJ) {
      const exporter = new ExporterObj();
      exporter.Export(model, format, (files) => {
        if (!files?.length) {
          console.error('export error');
        } else {
          if (autoDownload) {
            const file = files.find((e) => e.name.includes('obj'));
            if (file) {
              const arrayBuffer = new Uint8Array(file.content);
              this.downloadArrayBufferAsFile(arrayBuffer, 'model.obj');
            }
          }
          complete?.(files);
        }
      });
    }
    if (format === App.MODEL_TYPES.STL) {
      const exporter = new STLExporter();
      const arrayBuffer = exporter.parse(model, options);
      if (autoDownload) {
        this.downloadArrayBufferAsFile(arrayBuffer, 'model.stl');
      }
      complete?.(arrayBuffer);
    }
    if (format === App.MODEL_TYPES.GLTF || format === App.MODEL_TYPES.GLB) {
      const exporter = new GLTFExporter();
      exporter.parse(
        model,
        (arrayBuffer) => {
          if (autoDownload) {
            this.downloadArrayBufferAsFile(arrayBuffer, 'model.glb');
          }
          complete?.(arrayBuffer);
        },
        (err) => {
          console.error(err);
        },
        options
      );
    }
  };

  flyToTarget = (params) => {
    const {
      target,
      up,
      angle = [0, 0, 0],
      radius = 20,
      time = 2000,
      complete
    } = params;
    const { camera, controls } = this;
    let direction = new THREE.Vector3(1, 0, 0);
    let boxCenter = new THREE.Vector3();
    let distance = radius;
    if (Array.isArray(target)) {
      boxCenter.fromArray(target);
    } else if (target instanceof THREE.Object3D) {
      const box = new THREE.Box3().setFromObject(target);
      const boxSize = box.getSize(new THREE.Vector3()).length();
      boxCenter = box.getCenter(new THREE.Vector3());
      const sizeToFitOnScreen = boxSize;
      const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.5;
      const halfFovY = THREE.MathUtils.degToRad(camera.fov * 0.5);
      distance = distance || (halfSizeToFitOnScreen * 0.6) / Math.tan(halfFovY);
    } else {
      return false;
    }
    const radians = angle.map((value) => (value * Math.PI) / 180);
    direction = direction.applyEuler(new THREE.Euler().fromArray(radians));
    let targetPos = new THREE.Vector3().copy(boxCenter);
    targetPos = targetPos.add(direction.multiplyScalar(distance));
    camera.updateProjectionMatrix();

    // fly
    const pos = { ...camera.position };
    const tween = new TWEEN.Tween(pos)
      .to({ ...targetPos }, time)
      .easing(TWEEN.Easing.Linear.None)
      .onStart(() => {
        controls.forEach((control) => {
          control.target.copy(boxCenter);
          control.update();
        });
      })
      .onUpdate(() => {
        Array.isArray(up)
          ? camera.lookAt(...up)
          : camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
        camera.position.set(pos.x, pos.y, pos.z);
      })
      .onComplete(() => {
        controls.forEach((control) => {
          control.target.copy(boxCenter);
          control.update();
        });
        complete && complete();
      });
    tween.start();
  };

  downloadUrlAsFile = (url, fileName) => {
    let link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  downloadArrayBufferAsFile = (arrayBuffer, fileName) => {
    const url = CreateObjectUrl(arrayBuffer);
    this.downloadUrlAsFile(url, fileName);
  };
}

export default App;
