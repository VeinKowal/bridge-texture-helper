import { useState } from 'react';
import { useRequest, useToggle } from 'ahooks';
// import { lieshiheBridgeDefects, haidifuheBridgeDefects } from '@/config.js';

export enum THEME {
  总览,
}

// mockData
enum BRIDGE_LIST {
  烈士河大桥,
  海堤复河大桥,
}

const BRIDGE_DEFECTS = {
  // [BRIDGE_LIST.烈士河大桥]: lieshiheBridgeDefects,
  // [BRIDGE_LIST.海堤复河大桥]: haidifuheBridgeDefects,
};

const useGlobal = () => {
  const [selectedTheme, setSelectedTheme] = useState<THEME>(THEME.总览);
  const [selectedBridgeId, setSelectedBridgeId] = useState<number>();
  const [isToolLoading, { set: setToolLoading }] = useToggle(false);
  const [tooltip, setTooltip] = useState<string>();

  // 获取桥梁列表
  const { data: bridgeList, run: getBridgeList, loading: bridgeListLoading } = useRequest(async () => {
    return Object.keys(BRIDGE_LIST).filter(e => !Number.isNaN(+e)).map(e => {
      const bridgeId = +e;
      const bridgeName = BRIDGE_LIST[e];
      return ({
        bridgeId,
        bridgeName,
      });
    })
  }, {
    onSuccess(res) {
      if (!res.length) {
        setSelectedBridgeId(undefined);
        return;
      }
      setSelectedBridgeId(res[0]?.bridgeId);
    }
  });

  // 获取桥梁病害信息列表
  const { data: bridgeDefectList, run: getBridgeDefectList, loading: bridgeDefectListLoading } = useRequest(async () => {
    if (typeof selectedBridgeId === 'undefined') return;
    if (selectedBridgeId === BRIDGE_LIST.烈士河大桥) {
      // test data
      return [
        {

          "id": "0351C82DFFDE4F9C8A2060F59F6A167E",

          "bridgeId": "53966435CDC111E8AAFA00FF89A70EF0",

          "sideType": "下行",

          "siteNo": 27,

          "partsType": "上部承重构件",

          "memberType": "底板",

          "memberNo": "27-1-1-0-null",

          "memberName": "底板",

          "diseaseType": "横向裂缝",

          "pierNo": 26,

          "pDist": null,

          "pDistRange": "6.7",

          "insideOutside": "外侧",

          "iDist": null,

          "iDistRange": "2.4-3.6",

          "topBottom": null,

          "tDist": null,

          "tDistRange": null,

          "stakeSide": null,

          "sDist": null,

          "sDistRange": null,

          "crossBeam": null,

          "bDist": null,

          "bDistRange": null,

          "laneNo": null,

          "dist": null,

          "distRange": null,

          "position": null,

          "sideFace": null,

          "count": 1,

          "angle": null,

          "minLength": null,

          "maxLength": 1200.000,

          "minWidth": null,

          "maxWidth": 0.100,

          "minDepth": null,

          "maxDepth": null,

          "displacement": null,

          "numberDegree": null,

          "textDegree": null,

          "behaviorDesc": null,

          "notes": null,

          "repairEffect": null,

          "supportGrade": null,

          "trend": null,

          "diseaseDescRule": "[{position}，][距{pierNo}{pDistRange}m处，][距{insideOutside}{iDistRange}m处，]{count}条{diseaseTypeName}，[角度为{angle}°，]均L=[{minLength,m}～]{maxLength,m}m，W=[{minWidth,mm}～]{maxWidth,mm}mm[，D={maxDepth,mm}mm]",

          "inspectionYear": 2020

        }, {

          "id": "1B6EECABF32046F9BC215C9DE1A159F8",

          "bridgeId": "53966435CDC111E8AAFA00FF89A70EF0",

          "sideType": "下行",

          "siteNo": 19,

          "partsType": "上部承重构件",

          "memberType": "腹板",

          "memberNo": "19-1-1-0-null",

          "memberName": "1#腹板",

          "diseaseType": "竖向裂缝",

          "pierNo": 18,

          "pDist": null,

          "pDistRange": "16.0",

          "insideOutside": null,

          "iDist": null,

          "iDistRange": null,

          "topBottom": "下缘",

          "tDist": null,

          "tDistRange": "0-0.9",

          "stakeSide": null,

          "sDist": null,

          "sDistRange": null,

          "crossBeam": null,

          "bDist": null,

          "bDistRange": null,

          "laneNo": null,

          "dist": null,

          "distRange": null,

          "position": null,

          "sideFace": null,

          "count": 1,

          "angle": null,

          "minLength": null,

          "maxLength": 900.000,

          "minWidth": null,

          "maxWidth": 0.080,

          "minDepth": null,

          "maxDepth": null,

          "displacement": null,

          "numberDegree": null,

          "textDegree": null,

          "behaviorDesc": null,

          "notes": null,

          "repairEffect": null,

          "supportGrade": null,

          "trend": null,

          "diseaseDescRule": "[{position}，][距{pierNo}{pDistRange}m处，][距{topBottom}{tDistRange}m处，]{count}条{diseaseTypeName}，[角度为{angle}°，]均L=[{minLength,m}～]{maxLength,m}m，W=[{minWidth,mm}～]{maxWidth,mm}mm[，D={maxDepth,mm}mm]",

          "inspectionYear": 2020

        },
      ];
    } else {
      return [];
    }
    return BRIDGE_DEFECTS[selectedBridgeId];
  }, {
    ready: !!(typeof selectedBridgeId !== 'undefined'),
    refreshDeps: [selectedBridgeId],
  });

  return {
    selectedTheme,
    setSelectedTheme,
    selectedBridgeId,
    setSelectedBridgeId,
    isToolLoading,
    setToolLoading,
    tooltip,
    setTooltip,
    bridgeList,
    getBridgeList,
    bridgeListLoading,
    bridgeDefectList,
    getBridgeDefectList,
    bridgeDefectListLoading,
  }
}

export default useGlobal;
