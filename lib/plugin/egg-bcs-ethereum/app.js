"use strict";

const BlockChainImpl = require('./app/core/BlockChainImpl');

module.exports = app => {
  app.beforeStart(async () => {
    app.logger.info('plugin: egg-bcs-ethereum start');
    app.lastHandledBlock = 9664703;
    app.bcsImpl = new BlockChainImpl(app);

    require('./app/core/EventQueue')(app);
  });
};
