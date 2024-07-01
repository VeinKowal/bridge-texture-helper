import host from './getHost';

const env = process.env.API_ENV;

export const URL = `${window.location.protocol}//${host}`;

const api = `${URL}/api/v1/`;

export default api;

export const MOCK_API_URL = `http://${document.domain}:${document.location.port}/api/v1/`;
export const WS_API_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'
  }://${host}/api/v1/`;
export const NOTICE_API_URL = `${env === 'prod' ? 'wss' : 'ws'}://${host}/message`;
