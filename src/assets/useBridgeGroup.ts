/**
 *@description 加载包含上下行模型的zip模型包.
 *@author guoweiyu.
 *@date 2024-06-28 15:09:08.
*/
import type { Mesh, Group } from 'three';
import React, { useState, useEffect } from 'react';
import type App from '@/components/app';
import * as THREE from 'three';
import { Cartesian3 as C3 } from 'cesium';
import gcoord from 'gcoord';
import jsZip from 'jszip';
import request from '@/utils/request';
import umiRequest from 'umi-request';
import { useMemoizedFn } from 'ahooks';
import useBridgeModel from './useBridgeModel';
import { getThreeModelQuaternion } from '@/utils/3d';

const useBridgeGroup = (app?: App, fileUrl?: string) => {
  const [upURL, setUpURL] = useState<string>();
  const [downURL, setDownURL] = useState<string>();
  const [upModelType, setUpModelType] = useState<string>();
  const [downModelType, setDownModelType] = useState<string>();
  const [upConfig, setUpConfig] = useState<Record<string, string | number>>();
  const [downConfig, setDownConfig] = useState<Record<string, string | number>>();
  const [upBridgeModel, setUpBridgeModel] = useState<Mesh>();
  const [downBridgeModel, setDownBridgeModel] = useState<Mesh>();
  const [bridgeGroup, setBridgeGroup] = useState<Group>();
  const { rawBridgeModel: upRawBridgeModel, setRawBridgeModel: setUpRawBridgeModel } = useBridgeModel(app, upURL, upModelType);
  const { rawBridgeModel: downRawBridgeModel, setRawBridgeModel: setDownRawBridgeModel } = useBridgeModel(app, downURL, downModelType);

  const remoteRequest = async (url: string) => {
    return request(url, { responseType: 'arrayBuffer' });
  }

  const localRequest = async (url: string) => {
    return umiRequest(decodeURIComponent(url.replace('@/../public/', '')), { responseType: 'arrayBuffer' })
  }

  const requestModelURL = useMemoizedFn(async (url: string) => {
    const file = url.includes('@') ? await localRequest(url) : remoteRequest(url);
    const zipContent = await jsZip.loadAsync(file);
    const fileNames = Object.keys(zipContent.files);
    const upFileName = fileNames.find(e => e.includes('上行'));
    const downFileName = fileNames.find(e => e.includes('下行'));
    if (upFileName) {
      const upZip = await zipContent.file(upFileName)!.async('blob');
      const upZipContent = await jsZip.loadAsync(upZip);
      const isHasConfig = !!upZipContent.file('modelConfig.json');
      const isOBJModel = !!upZipContent.file('model.obj');
      const isGLBModel = !!upZipContent.file('model.glb');
      const isGLTFModel = !!upZipContent.file('model.gltf');
      let blob: Blob | undefined = undefined;
      if (isHasConfig) {
        const config = await upZipContent.file('modelConfig.json')!.async('string');
        setUpConfig(JSON.parse(config) || {});
      }
      if (isOBJModel) {
        blob = await upZipContent.file('model.obj')!.async('blob');
        setUpModelType('obj');
      }
      if (isGLBModel) {
        blob = await upZipContent.file('model.glb')!.async('blob');
        setUpModelType('glb');
      }
      if (isGLTFModel) {
        blob = await upZipContent.file('model.gltf')!.async('blob');
        setUpModelType('gltf');
      }
      if (blob) {
        const result = window.URL.createObjectURL(blob);
        setUpURL(result);
      }
    }
    if (downFileName) {
      const downZip = await zipContent.file(downFileName)!.async('blob');
      const downZipContent = await jsZip.loadAsync(downZip);
      const isHasConfig = !!downZipContent.file('modelConfig.json');
      const isOBJModel = !!downZipContent.file('model.obj');
      const isGLBModel = !!downZipContent.file('model.glb');
      const isGLTFModel = !!downZipContent.file('model.gltf');
      let blob: Blob | undefined = undefined;
      if (isHasConfig) {
        const config = await downZipContent.file('modelConfig.json')!.async('string');
        setDownConfig(JSON.parse(config) || {});
      }
      if (isOBJModel) {
        blob = await downZipContent.file('model.obj')!.async('blob');
        setDownModelType('obj');
      }
      if (isGLBModel) {
        blob = await downZipContent.file('model.glb')!.async('blob');
        setDownModelType('glb');
      }
      if (isGLTFModel) {
        blob = await downZipContent.file('model.gltf')!.async('blob');
        setDownModelType('gltf');
      }
      if (blob) {
        const result = window.URL.createObjectURL(blob);
        setDownURL(result);
      }
    }
  });

  const customModelByConfig = useMemoizedFn((model, config) => {
    let rotationAngle = 0, longitude = undefined, latitude = undefined;
    let bridgeTotalLength = 635.5;
    bridgeTotalLength = 635.5;
    const { memberConfig } = config;
    const angleData = memberConfig?.find(e => e.name === '水平方位角')?.value;
    const lngData = memberConfig?.find(e => e.name === '桥梁经度')?.value;
    const latData = memberConfig?.find(e => e.name === '桥梁纬度')?.value;
    rotationAngle = angleData;
    longitude = lngData;
    latitude = latData;
    // 调整桥梁比例
    const rawModelSize = new THREE.Box3()
      .setFromObject(model)
      .getSize(new THREE.Vector3());
    const modelLength = rawModelSize.length();
    const scalar = modelLength ? bridgeTotalLength / modelLength : 1;
    const point = gcoord.transform(
      [longitude, latitude],
      gcoord.WGS84,
      gcoord.WGS84,
    )
    model.children[0].scale.setScalar(scalar);
    model.moveToCenter(model.children[0]);
    model.userData.longitude = point[0];
    model.userData.latitude = point[1];
    model.userData.rotationAngle = rotationAngle || 0;
    model.userData.angle = (Math.PI / 180) * (rotationAngle || 0);
    model.userData.scalar = scalar;
    model.userData.bridgeTotalLength = bridgeTotalLength;
    model.userData.modelLength = modelLength;
    model.position.copy(C3.fromDegrees(point[0], point[1]));
    model.setRotationFromQuaternion(
      new THREE.Quaternion(
        ...getThreeModelQuaternion(point[0], point[1], rotationAngle)
      )
    );
    model.updateWorldMatrix(false, true);
    return model;
  });

  useEffect(() => {
    if (!fileUrl) return;
    requestModelURL(fileUrl);
  }, [fileUrl, requestModelURL]);

  useEffect(() => {
    if (!upRawBridgeModel || !upConfig) return;
    const bridgeModel = customModelByConfig(upRawBridgeModel, upConfig);
    bridgeModel.name = `${upConfig?.bridgeInfo?.name || ''}${upConfig?.bridgeInfo?.side || ''}`;
    setUpBridgeModel(bridgeModel);
    setUpRawBridgeModel(undefined);
  }, [upConfig, upRawBridgeModel, customModelByConfig, setUpRawBridgeModel]);

  useEffect(() => {
    if (!downRawBridgeModel || !downConfig) return;
    const bridgeModel = customModelByConfig(downRawBridgeModel, downConfig);
    bridgeModel.name = `${downConfig?.bridgeInfo?.name || ''}${downConfig?.bridgeInfo?.side || ''}`;
    setDownBridgeModel(bridgeModel);
    setDownRawBridgeModel(undefined);
  }, [downConfig, downRawBridgeModel, customModelByConfig, setDownRawBridgeModel]);

  useEffect(() => {
    if (!upBridgeModel || !downBridgeModel) return;
    const group = new THREE.Group();
    group.add(upBridgeModel, downBridgeModel);
    setBridgeGroup(group);
  }, [upBridgeModel, downBridgeModel]);

  return (
    {
      upBridgeModel,
      downBridgeModel,
      bridgeGroup,
      setBridgeGroup,
    }
  )
}

export default useBridgeGroup;
