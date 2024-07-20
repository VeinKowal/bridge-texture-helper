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
        // {

        //   "id": "0351C82DFFDE4F9C8A2060F59F6A167E",

        //   "bridgeId": "53966435CDC111E8AAFA00FF89A70EF0",

        //   "sideType": "下行",

        //   "siteNo": 27,

        //   "partsType": "上部承重构件",

        //   "memberType": "底板",

        //   "memberNo": "27-1-1-0-null",

        //   "memberName": "底板",

        //   "diseaseType": "横向裂缝",

        //   "pierNo": 26,

        //   "pDist": null,

        //   "pDistRange": "6.7",

        //   "insideOutside": "外侧",

        //   "iDist": null,

        //   "iDistRange": "2.4-3.6",

        //   "topBottom": null,

        //   "tDist": null,

        //   "tDistRange": null,

        //   "stakeSide": null,

        //   "sDist": null,

        //   "sDistRange": null,

        //   "crossBeam": null,

        //   "bDist": null,

        //   "bDistRange": null,

        //   "laneNo": null,

        //   "dist": null,

        //   "distRange": null,

        //   "position": null,

        //   "sideFace": null,

        //   "count": 1,

        //   "angle": null,

        //   "minLength": null,

        //   "maxLength": 1200.000,

        //   "minWidth": null,

        //   "maxWidth": 0.100,

        //   "minDepth": null,

        //   "maxDepth": null,

        //   "displacement": null,

        //   "numberDegree": null,

        //   "textDegree": null,

        //   "behaviorDesc": null,

        //   "notes": null,

        //   "repairEffect": null,

        //   "supportGrade": null,

        //   "trend": null,

        //   "diseaseDescRule": "[{position}，][距{pierNo}{pDistRange}m处，][距{insideOutside}{iDistRange}m处，]{count}条{diseaseTypeName}，[角度为{angle}°，]均L=[{minLength,m}～]{maxLength,m}m，W=[{minWidth,mm}～]{maxWidth,mm}mm[，D={maxDepth,mm}mm]",

        //   "inspectionYear": 2020

        // },
        // {

        //   "id": "1B6EECABF32046F9BC215C9DE1A159F8",

        //   "bridgeId": "53966435CDC111E8AAFA00FF89A70EF0",

        //   "sideType": "下行",

        //   "siteNo": 19,

        //   "partsType": "上部承重构件",

        //   "memberType": "腹板",

        //   "memberNo": "19-1-1-0-null",

        //   "memberName": "1#腹板",

        //   "diseaseType": "竖向裂缝",

        //   "pierNo": 18,

        //   "pDist": null,

        //   "pDistRange": "16.0",

        //   "insideOutside": null,

        //   "iDist": null,

        //   "iDistRange": null,

        //   "topBottom": "下缘",

        //   "tDist": null,

        //   "tDistRange": "0-0.9",

        //   "stakeSide": null,

        //   "sDist": null,

        //   "sDistRange": null,

        //   "crossBeam": null,

        //   "bDist": null,

        //   "bDistRange": null,

        //   "laneNo": null,

        //   "dist": null,

        //   "distRange": null,

        //   "position": null,

        //   "sideFace": null,

        //   "count": 1,

        //   "angle": null,

        //   "minLength": null,

        //   "maxLength": 900.000,

        //   "minWidth": null,

        //   "maxWidth": 0.080,

        //   "minDepth": null,

        //   "maxDepth": null,

        //   "displacement": null,

        //   "numberDegree": null,

        //   "textDegree": null,

        //   "behaviorDesc": null,

        //   "notes": null,

        //   "repairEffect": null,

        //   "supportGrade": null,

        //   "trend": null,

        //   "diseaseDescRule": "[{position}，][距{pierNo}{pDistRange}m处，][距{topBottom}{tDistRange}m处，]{count}条{diseaseTypeName}，[角度为{angle}°，]均L=[{minLength,m}～]{maxLength,m}m，W=[{minWidth,mm}～]{maxWidth,mm}mm[，D={maxDepth,mm}mm]",

        //   "inspectionYear": 2020

        // },
        // {
        //   "id": "44A226373D9F4B648F6B8507E309A2BB",
        //   "maxSiteNo": 27,
        //   "taskId": "6A5B8091E79642D7963948AA75DF5D5A",
        //   "diseaseDesc": "距7#墩23.9m处，1处露筋，S=(0.3*0.1)m2，D=2.0m",
        //   "diseaseTypeName": "露筋",
        //   "bridgeId": "53966435CDC111E8AAFA00FF89A70EF0",
        //   "sideType": "上行",
        //   "siteNo": 8,
        //   "positionTypeId": "0iJ3SAS",
        //   "positionTypeName": "上部结构",
        //   "memberTypeId": "0iJ3SAS0jbkwjv0laUHuQ",
        //   "memberType": "翼板",
        //   "memberNo": "8-1-3-0-null",
        //   "memberName": "3#翼板",
        //   "diseaseTypeId": "0iJ3SAS0jbkwjv0lbj7aJ",
        //   "evaluationIndexId": "0iJ3SAS0000046",
        //   "pierNo": 7,
        //   "pDistRange": "23.9",
        //   "iDistRange": "0",
        //   "count": 1,
        //   "maxLength": 300,
        //   "maxWidth": 100,
        //   "maxDepth": 2000,
        //   "diseaseDescId": "A5A4C058EE2C4972B46578CF73A75027",
        //   "inspectionUser": "58D7DEEB84C84F2C9D66B3C2193B4A8E",
        //   "inspectionUserName": "张浩",
        //   "inspectionDateStr": "2021-01-08",
        //   "diseaseDescRule": "[距{pierNo}{pDistRange}m处，][距{insideOutside}{iDistRange}m处，]{count}处{diseaseTypeName}，各S=({maxLength,m}*{maxWidth,m})m2[，D={maxDepth,m}m]",
        //   "positionRuleType": 1,
        //   "repairEffect": 0,
        //   "diseasePicture": "6A5B8091E79642D7963948AA75DF5D5A\\53966435CDC111E8AAFA00FF89A70EF0\\2BDF5346193C4A43833BC6C68162CC07.jpg",
        //   "pictureList": [
        //     {
        //       "id": "DFEF4B3128694DA3AF160C8EC3E66019",
        //       "diseaseId": "44A226373D9F4B648F6B8507E309A2BB",
        //       "filePath": "6A5B8091E79642D7963948AA75DF5D5A\\53966435CDC111E8AAFA00FF89A70EF0\\2BDF5346193C4A43833BC6C68162CC07.jpg"
        //     }
        //   ],
        //   "status": 0
        // },
        {
          "id": "6d724fe3bd2d48989edbd201f0b01f28",
          "maxSiteNo": 27,
          "taskId": "A6AAF740E9DC410CB06A270EE454AC0F",
          "diseaseDesc": "距下缘1.5m处，1处破损,S=(0.2*0.05)m2,D=0.05m",
          "diseaseTypeName": "破损",
          "bridgeId": "53966435CDC111E8AAFA00FF89A70EF0",
          "sideType": "下行",
          "siteNo": 1,
          "positionTypeId": "0iJ3SAX",
          "positionTypeName": "下部结构",
          "memberTypeId": "0iJ3SAX0jbkh4D0jbtDtw",
          "memberType": "立柱",
          "memberNo": "1-1-3-0-null",
          "memberName": "1#墩3#立柱",
          "materialType": "27F15A5A07A54621A5D3E43754CB1B1A",
          "diseaseTypeId": "0iJ3SAX0jbkh4D0000007",
          "evaluationIndexId": "0iJ3SAX0000004",
          "topBottom": "下缘",
          "pDistRange": 0,
          "tDistRange": 1.5,
          "count": 1,
          "maxLength": 200,
          "maxWidth": 50,
          "maxDepth": 50,
          "diseaseDescId": "97B1D53BD01D41EBB73B6D6AF95F04E1",
          "inspectionUser": "35680CC1B567451C8E504F4BF9BA3A35",
          "inspectionUserName": "丁俊杰",
          "inspectionDateStr": "2022-03-23",
          "diseaseDescRule": "[距{topBottom}{tDist}m处，]1处{diseaseTypeName},S=({maxLength,m}*{maxWidth,m})m2[,D={maxDepth,m}m]",
          "positionRuleType": 0,
          "diseasePicture": "A6AAF740E9DC410CB06A270EE454AC0F\\53966435CDC111E8AAFA00FF89A70EF0\\509FE52746054892BD7A16CA1BD864EC.jpg",
          "pictureList": [
            {
              "id": "E8C1411451FC4E729FFAB0ABA6F4E86A",
              "diseaseId": "6d724fe3bd2d48989edbd201f0b01f28",
              "filePath": "A6AAF740E9DC410CB06A270EE454AC0F\\53966435CDC111E8AAFA00FF89A70EF0\\509FE52746054892BD7A16CA1BD864EC.jpg"
            }
          ],
          "status": 0
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
