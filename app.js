"use strict";

const TronWeb = require('tronweb')
const fs = require("fs")

module.exports = app => {
  app.beforeStart(async () => {
    app.logger.info("egg env__: ", app.config.env);
    app.logger.info("node env__: ", process.env.NODE_ENV);
    app.BigNumber = require("bignumber.js");
    // 常量配置加载
    require('./const_config.js')(app);

    // ContractUtils(app);
    require('./app/event-handlers')(app);

    app.curID =  22000021301 ; // 从哪个开始找起

    app.isMaintain = true ;

    app.check_cnt = 0 ; // 检查次数
    app.check_id_cnt = 0 ; // 向合约读取ID次数
    app.isLazyMode = false ; // 是否应该减少检测
    app.isStopMode = false ; // 是否应该停止检测

  app.orderInfo = {data: {}, max_apy: 0, total_freeze: 0, total_income: 0, day_freeze: 0, day_income: 0, day_cnt: 0, day_energy: 0, offcial_income: 0} ; // 暂存的所有订单

  });
};
