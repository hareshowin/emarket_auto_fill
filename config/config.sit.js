'use strict';

module.exports = appInfo => {
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name ;

  // Tron NetWord Config
  config.tronConf = {
    apiKey:'', // fetch it at https://www.trongrid.io/
    /*
    TronGrid    ：https://www.trongrid.io/
    Get API Key ：https://www.trongrid.io/
    Use API Key ：https://cn.developers.tron.network/reference#%E5%A6%82%E4%BD%95%E4%BD%BF%E7%94%A8api-key 
    Set API Key in Tronweb：https://cn.developers.tron.network/reference#tronweb-object
    Tronweb Github: https://github.com/tronprotocol/tronweb
    */
    fullNode: 'https://api.shasta.trongrid.io',
    solNode: 'https://api.shasta.trongrid.io',
    eventNode: 'https://api.shasta.trongrid.io',
    voteAddr: '' , // vote address in hex
  };

  // private key here! KEEP SECRET!!!
  config.pkList = [
    '',
  ]

  // Below address will keep freezed!
  config.fillAddr = {
    // 'TYK5jLgjdgU9nQd2EotYGfiGb4UEh5fFVT': true,
  }

  // if have more that one address, some transfer will happen among them
  // before transfer, double check address in case transfers to wrong address !!!!
  config.selfAddr = {

  }

  config.toleRate = 1.003 ; // 容错

  config.paramConf = {
    tax_pencent: 0.2, // tax rate
    min_tax:     0,   // min tax fee
  }

  config.logger = {
    dir: '',  // logs directory
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
