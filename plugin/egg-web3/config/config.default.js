'use strict';

/**
 * egg-web3 default config
 * @member Config#web3
 * @property {String} SOME_KEY - some description
 */


exports.web3 = {
  client: 'parity', // 节点客户端 geth or parity
  listenIp: 'ws://127.0.0.1', // ws监听url
  listenPort: 8202,
  // 合约地址映射
  contractAddress,
  // 合约事件handler映射
  eventHandler,
  // 主账号信息
  wallet_address: '',
  wallet_pwd: '',
  // 合约事件模型名
  eventModel: '',
  // 合约abi目录
  abiDir: '/app/abi',
  // 记录lastBlock的文件路径
  lastBlockRecordPath: '/__lastBlock.txt',
  //
  fromBlock: 7000000,
};
