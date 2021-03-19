'use strict';
const path = require('path');
const Web3 = require('web3');
const ABI = Symbol('loadedAbis');

module.exports = app => {
  loadAbi(app);
};

// 加载合约abi
function loadAbi(app) {
  // app.logger.debug(app.baseDir, app.config.web3.abiDir);
  const abiDir = path.join(app.baseDir, app.config.web3.abiDir);
  app.loader.loadToApp(abiDir, ABI, {
    inject: app,
    // caseStyle: 'upper',
    ignore: 'index.js',
  });

  const { contractAddress } = app.config.web3;
  // web3实例化
  const web3 = new Web3(Web3.givenProvider || (app.config.web3.listenIp + ':' + app.config.web3.listenPort));
  Object.defineProperty(app, 'web3', {
    value: web3,
    writable: false,
    configurable: false,
  });

  // 合约实例化
  Object.defineProperty(app, 'contract', {
    value: {},
    writable: false,
    configurable: false,
  });
  for (const name of Object.keys(app[ABI])) {
    app.logger.info(`[${name}][${contractAddress[name]}]合约实例化...`);
    const abi = app[ABI][name];
    const address = contractAddress[name];
    if (!address) { throw new Error(`${name}合约缺少address`); }
    app.contract[name] = new web3.eth.Contract(abi, contractAddress[name], {
      from: app.config.web3.wallet_address, // default from address
      gas: 2000000, // default gas price in wei, 20 gwei in this case
    });
    app.contract[name].___name = name;
  }
  // console.log(app.contract);
}
