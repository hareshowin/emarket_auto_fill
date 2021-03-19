'use strict';
module.exports = options => {
  return async function envLimit(ctx, next) {
    ctx.logger.info('allowed env: ', options.allowedEnv);
    const { env } = ctx.app.config;
    if (new Set(options.allowedEnv).has(env)) {
      await next();
    } else {
      ctx.throw(APP_CONST.ERR_CODE.FORBIDDEN, 'Invalid Environment.');
    }
  };
};

