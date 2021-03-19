'use strict';
module.exports = options => {
  return async function getUser(ctx, next) {
    ctx.logger.debug('get user.');
    const { env } = ctx.app.config;
    // 本地测试地址
    const testAddress = env === 'local' ? options.localTestAddress : undefined;

    let address = ctx.query.owner || testAddress;
    if (!address) {
      // ctx.throw(APP_CONST.ERR_CODE.NOT_AUTHED, 'Invalid Visit.');
    } else {
      address = address.toLowerCase();
      ctx.state.user = {
        address,
      };
    }

    await next();
  };
};

