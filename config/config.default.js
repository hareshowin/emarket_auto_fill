'use strict';

module.exports = appInfo => {
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name ;

  // add your config here
  config.middleware = [ 'errHandle' ];

  // const Op = require('sequelize').Op;
  // const operatorsAliases = {
  //   $eq: Op.eq,
  //   $ne: Op.ne,
  //   $gte: Op.gte,
  //   $gt: Op.gt,
  //   $lte: Op.lte,
  //   $lt: Op.lt,
  //   $not: Op.not,
  //   $in: Op.in,
  //   $notIn: Op.notIn,
  //   $is: Op.is,
  //   $like: Op.like,
  //   $notLike: Op.notLike,
  //   $iLike: Op.iLike,
  //   $notILike: Op.notILike,
  //   $regexp: Op.regexp,
  //   $notRegexp: Op.notRegexp,
  //   $iRegexp: Op.iRegexp,
  //   $notIRegexp: Op.notIRegexp,
  //   $between: Op.between,
  //   $notBetween: Op.notBetween,
  //   $overlap: Op.overlap,
  //   $contains: Op.contains,
  //   $contained: Op.contained,
  //   $adjacent: Op.adjacent,
  //   $strictLeft: Op.strictLeft,
  //   $strictRight: Op.strictRight,
  //   $noExtendRight: Op.noExtendRight,
  //   $noExtendLeft: Op.noExtendLeft,
  //   $and: Op.and,
  //   $or: Op.or,
  //   $any: Op.any,
  //   $all: Op.all,
  //   $values: Op.values,
  //   $col: Op.col,
  // };
  // config.sequelize = {
  //   operatorsAliases, // 操作符别名
  // };
  
  config.logger = {
    level: 'INFO',
    consoleLevel: 'DEBUG',
  };

  exports.cors = {
    enable: true,
    package: 'egg-cors',
  };

  config.security = {
    // 关闭csrf
    csrf: {
      enable: false,
      ignoreJSON: true
    },
  };

  config.cors = {
    origin:'*',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH'
  };

  config.cluster = {
    listen: {
      port: 2800,
      // hostname: '127.0.0.1',
      // path: '/var/run/egg.sock',
    },
  };
  
  config.ipAllowed = {
    allowedIps: [ '127.0.0.1' ],
  };

  return config;
};
