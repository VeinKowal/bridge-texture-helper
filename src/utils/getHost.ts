const getByEnv = () => {
  let host = '';

  const env = process.env.API_ENV;

  switch (env) {
    case 'stage': {
      const { domain } = document;
      const { port } = document.location;
      host = `${domain}:${port}`;
      break;
    }
    case 'prod': {
      host = 'www.intellibridge.cn';
      break;
    }
    default: {
      host = '192.168.0.101';
      break;
    }
  }
  return host;
};

export default getByEnv();
