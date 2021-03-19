'use strict';

module.exports = app => {
  app.beforeStart(async () => {
    app.logger.info('egg-web3插件加载...');
    // web3实例化 合约实例化
    require('./lib/contractLoader')(app);
    app.web3.eth.isSyncing(function(error, sync) {
      if (!error) {
        app.logger.debug('sync:', sync);
        // stop all app activity
        if (sync === true) {
          // we use `true`, so it stops all filters, but not the web3.eth.syncing polling
          process.exit(1);
          // show sync info
        } else if (sync) {
          app.logger.error('正在同步: ' + sync.currentBlock);
          app.logger.error(`还差${parseInt(sync.highestBlock - sync.currentBlock)}个区块...`);
          process.exit(1);
          // re-gain app operation
        } else {
          // run your app init function...
          // web3事件监听
          require('./lib/index')(app);
        }
      } else {
        app.logger.error(error);
        process.exit(1);
      }
    });
  });
};
