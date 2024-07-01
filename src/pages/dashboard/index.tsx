/**
 *@description 大屏组件.
 *@author guoweiyu.
 *@date 2024-06-28 09:43:52.
*/
import type { FC } from 'react';
import React, { } from 'react';
import styles from './index.less';
import BridgeSelector from './components/bridgeSelector';

type DashboardProps = unknown;

const Dashboard: FC<DashboardProps> = () => {
  return (
    <div className={styles.dashboardContainer}>
      <BridgeSelector />
    </div>
  )
}

export default Dashboard;
