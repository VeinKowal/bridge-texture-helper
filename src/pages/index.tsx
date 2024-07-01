import type { FC } from 'react';
import React, { } from 'react';
import styles from './index.less';
import Bim from './bim';
import Dashboard from './dashboard';

type HomePageProps = unknown;

const HomePage: FC<HomePageProps> = () => {
  return (
    <div className={styles.homePageContainer}>
      <Bim />
      <Dashboard />
    </div>
  )
}

export default HomePage;
