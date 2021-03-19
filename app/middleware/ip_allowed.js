'use strict';
module.exports = options => {
  return async function ipAllowed(ctx, next) {
    ctx.logger.info('allowedIps: ', options.allowedIps);
    if (new Set(options.allowedIps).has(ctx.ip)) {
      await next();
    } else {
      return ctx.throw(APP_CONST.ERR_CODE.FORBIDDEN, 'IP Refuse.');
    }
  };
};

