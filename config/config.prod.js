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
    fullNode: 'https://api.trongrid.io',
    solNode: 'https://api.trongrid.io',
    eventNode: 'https://api.trongrid.io',
    voteAddr: '4167E39013BE3CDD3814BED152D7439FB5B6791409' , // vote address in hex
  };

  // private key here! KEEP SECRET!!!
  config.pkList = [
    '',
  ]

  // Below address will keep freezed!
  config.fillAddr = {
    // 'TYK5jLgjdgU9nQd2EotYGfiGb4UEh5fFVT': true,
  }

  // Tolerance rate when freeze. at least 1.003
  config.toleRate = 1.003 ; 

  config.paramConf = {
    tax_pencent: 0.2, // tax rate
    min_tax:     0,   // min tax fee
  }


  config.logger = {
    dir: '/mnt/data/TokenGoodies/logs/',
    level: 'INFO',
    consoleLevel: 'DEBUG',
  };

  return config;
};
