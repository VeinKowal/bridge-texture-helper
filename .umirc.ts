import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {
    // configProvider
    configProvider: {},
    // themes
    dark: false,
    compact: true,
    // babel-plugin-import
    import: true,
    // less or css, default less
    style: 'less',
  },
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: '桥梁贴图Demo',
  },
  routes: [
    {
      path: '/',
      component: '@/pages/index',
    },
  ],
  npmClient: 'npm',
  history: {
    type: 'hash',
  },
  fastRefresh: true,
  define: {
    'process.env.API_ENV': process.env.API_ENV,
  },
  publicPath: process.env.API_ENV === 'stage' ? './' : '/',
  copy: ['src/config.js'],
});

