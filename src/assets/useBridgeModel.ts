/**
 *@description 根据url创建桥梁模型.
 *@author guoweiyu.
 *@date 2022-12-08 11:35:40.
*/
import type { Mesh } from 'three';
import App from '@/components/app';
import React, { useState, useCallback, useEffect } from 'react';
import { useModel } from '@umijs/max';
import * as THREE from 'three';

export const GRAY_COLOR = '#d8dee3';

const useBridgeModel = (app?: App, modelURL?: string, modelType?: string) => {
  const { setToolLoading, setTooltip } = useModel('global');
  const [rawBridgeModel, setRawBridgeModel] = useState<Mesh>();

  // 预处理桥梁模型
  const preProcessModel = useCallback((model: Mesh) => {
    const rawMaterial = new THREE.MeshPhongMaterial({
      color: GRAY_COLOR,
      side: THREE.DoubleSide,
      transparent: false,
    });
    model.userData.modelType = modelType;
    model.traverse((e) => {
      const child = e as Mesh;
      if (!child.isMesh) {
        return;
      }
      // TODO: 预处理模型构件
      // fix: gltf/glb模型丢失颜色显得暗淡的问题
      if (modelType === 'glb' || modelType === 'gltf') {
        const childMaterial = child.material as THREE.MeshPhongMaterial;
        child.userData.textureMaterial = childMaterial;
        if (childMaterial.map) {
          childMaterial.map.encoding = THREE.LinearEncoding;
          childMaterial.map.needsUpdate = true;
          childMaterial.needsUpdate = true;;
        }
      } else if (modelType === 'obj') {
        child.material = rawMaterial;
      }
    });

    setRawBridgeModel(model);
  }, [modelType]);

  // 生成模型
  const createModel = useCallback(
    (url, complete) => {
      setToolLoading(true);
      app?.create({
        type: modelType === 'obj' ? App.MODEL_TYPES.OBJ : App.MODEL_TYPES.GLB,
        url: url,
        complete: (model: Mesh) => {
          setToolLoading(false);
          complete && complete(model);
        },
        process: (info: any) => {
          const { downloaded } = info;
          if (!downloaded) {
            const { loaded } = info;
            const { total } = info;
            const percent = total === 0 ? 0.0 : loaded / total;
            if (percent > 0.99) {
              setTooltip('Rendering');
            } else {
              setTooltip(`Downloading Model ... ${(percent * 100).toFixed(2)}%`);
            }
          } else {
            const t = info.tip;
            setTooltip(t);
          }
        },
      });
    },
    [app, modelType, setTooltip],
  );

  useEffect(() => {
    if (!modelURL || !modelType) {
      return;
    }
    createModel(modelURL, preProcessModel);
  }, [modelURL, modelType, createModel, preProcessModel]);

  return (
    {
      rawBridgeModel,
      setRawBridgeModel,
    }
  )
}

export default useBridgeModel;

