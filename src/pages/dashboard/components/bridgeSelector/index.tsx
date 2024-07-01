/**
 *@description 桥梁选择器.
 *@author guoweiyu.
 *@date 2024-06-28 10:02:13.
*/
import type { FC } from 'react';
import React, { } from 'react';
import styles from './index.less';
import { useModel } from '@umijs/max';

type BridgeSelectorProps = unknown;

const BridgeSelector: FC<BridgeSelectorProps> = () => {
  const { selectedBridgeId, setSelectedBridgeId } = useModel('global');

  return (
    <>

    </>
  )
}

export default BridgeSelector;
