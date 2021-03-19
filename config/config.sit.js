'use strict';

module.exports = appInfo => {
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name ;

  // 波场测式服的配置
  config.tronConf = {
    fullNode: 'https://api.shasta.trongrid.io',
    solNode: 'https://api.shasta.trongrid.io',
    eventNode: 'https://api.shasta.trongrid.io',
  }

  // 以下地址不取消质押
  // Below address will keep freezed!
  config.fillAddr = {
    // 'TYK5jLgjdgU9nQd2EotYGfiGb4UEh5fFVT': true,
  }

  // 容错，最少设置为1.003，否则有可能导致出售不足
  // Tolerance rate when freeze. at least 1.003
  config.toleRate = 1.003 ; 

  config.paramConf = {
    tax_pencent: 0.2, // tax rate
    min_tax:     0,   // min tax fee
  }

  config.logger = {
    dir: '/data/NodeJSPre/logs/',
    level: 'DEBUG'
  }

  config.cluster = {
    listen: {
      port: 30224,
      // hostname: '127.0.0.1',
      // path: '/var/run/egg.sock',
    },
  }

  return config;
};
