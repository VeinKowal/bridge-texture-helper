import * as THREE from 'three';
import {
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast
} from 'three-mesh-bvh';
import { CSS3DRenderer } from '../lib/renderers/CSS3DRenderer';
import { EffectComposer } from '../lib/postprocessing/EffectComposer';
import { RenderPass } from '../lib/postprocessing/RenderPass';
import { OutlinePass } from '../lib/postprocessing/OutlinePass';
import { ShaderPass } from '../lib/postprocessing/ShaderPass';
import { FXAAShader } from '../lib/postprocessing/FXAAShader';
import { OrbitControls } from '../lib/controls/OrbitControls';
import { Interaction, PointerEvents } from '../lib/interaction/Interaction';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

class ThreeInitializer {
  static init(config) {
    const { renderDom } = config;
    const { clientWidth: width, clientHeight: height } = renderDom;
    const camera = ThreeInitializer.initCamera(config);
    const scene = ThreeInitializer.initScene(config);
    const cssRenderer = ThreeInitializer.initCSSRender(config);
    const renderer = ThreeInitializer.initRenderer(config);
    const cssOrbitControl = ThreeInitializer.initOrbitControl(
      camera,
      cssRenderer
    );
    const orbitControl = ThreeInitializer.initOrbitControl(camera, renderer);
    const lights = ThreeInitializer.initLights(scene);
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const outlinePass = new OutlinePass(
      new THREE.Vector2(width, height),
      scene,
      camera
    );
    const effectFXAA = new ShaderPass(FXAAShader);
    effectFXAA.uniforms.resolution.value.set(1 / width, 1 / height);
    const interaction = new Interaction(cssRenderer, scene, camera);
    const raycaster = PointerEvents.init(new THREE.Raycaster(), interaction);
    return {
      renderDom,
      camera,
      scene,
      cssRenderer,
      renderer,
      cssOrbitControl,
      orbitControl,
      lights,
      composer,
      renderPass,
      outlinePass,
      effectFXAA,
      interaction,
      raycaster
    };
  }

  static initCamera(config) {
    const { renderDom, useOrthographic } = config;
    const { clientWidth: width, clientHeight: height } = renderDom;
    let camera;
    if (useOrthographic) {
      camera = new THREE.OrthographicCamera(
        width / -2,
        width / 2,
        height / 2,
        height / -2,
        0.1,
        10000
      );
    } else {
      camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 1000000);
    }
    camera.up = new THREE.Vector3(0, 1, 0);
    return camera;
  }

  static initScene(config) {
    const { background } = config;
    const scene = new THREE.Scene();
    if (background instanceof THREE.Texture) {
      scene.background = background;
    } else if (background) {
      const backgroundColor = new THREE.Color(background);
      scene.background = backgroundColor;
    }
    return scene;
  }

  static initCSSRender(config) {
    const { renderDom } = config;
    const { clientWidth: width, clientHeight: height } = renderDom;
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(width, height);
    renderDom.appendChild(cssRenderer.domElement);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.zIndex = '1';
    return cssRenderer;
  }

  static initRenderer(config) {
    const {
      antialias = true,
      alpha = true,
      logarithmicDepthBuffer = true,
      renderDom
    } = config;
    const { clientWidth: width, clientHeight: height } = renderDom;
    const renderer = new THREE.WebGLRenderer({
      antialias,
      alpha,
      logarithmicDepthBuffer
    });
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderDom.appendChild(renderer.domElement);
    return renderer;
  }

  static initOrbitControl(camera, renderer) {
    const orbitControl = new OrbitControls(camera, renderer.domElement);
    orbitControl.enableZoom = true;
    orbitControl.enableDamping = true;
    orbitControl.enablePan = true;
    orbitControl.rotateSpeed = 0.5;
    orbitControl.dampingFactor = 0.1;
    orbitControl.maxDistance = Infinity;
    orbitControl.minDistance = 0.1;
    return orbitControl;
  }

  static initLights(scene) {
    const addShadowedLight = (x, y, z, color, intensity) => {
      const d = 1;
      const directionalLight = new THREE.DirectionalLight(color, intensity);
      directionalLight.position.set(x, y, z);
      directionalLight.castShadow = true;
      directionalLight.shadow.camera.left = -d;
      directionalLight.shadow.camera.right = d;
      directionalLight.shadow.camera.top = d;
      directionalLight.shadow.camera.bottom = -d;
      directionalLight.shadow.camera.near = 1;
      directionalLight.shadow.camera.far = 4;
      directionalLight.shadow.bias = -0.002;
      return directionalLight;
    };
    // 添加环境光，提供基础光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, 5.0);
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 100);
    const directLight1 = addShadowedLight(0, 1000000, 0, 0xffffff, 1.0);
    const directLight2 = addShadowedLight(0, -1000000, 0, 0xffffff, 0.5);

    scene.add(ambientLight, hemisphereLight);
    scene.add(pointLight);
    scene.add(directLight1, directLight2);

    return {
      ambientLight,
      hemisphereLight,
      pointLight,
      directLight1,
      directLight2
    };
  }

  static updateRender(config) {
    const { renderDom, renderer, composer, effectFXAA } = config;
    const { clientWidth: width, clientHeight: height } = renderDom;
    renderer.setSize(width, height);
    composer.setSize(width, height);
    effectFXAA.uniforms.resolution.value.set(1 / width, 1 / height);
  }

  static updateCamera(config) {
    const { renderDom, camera } = config;
    const { clientWidth: width, clientHeight: height } = renderDom;
    camera.aspect = height === 0 ? 1 : width / height;
    if (camera.isOrthographicCamera) {
      camera.left = width / -2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = height / -2;
    }
    camera.updateProjectionMatrix();
  }
}

export default ThreeInitializer;
