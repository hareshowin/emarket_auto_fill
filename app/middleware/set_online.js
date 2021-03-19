'use strict';
module.exports = () => {
  return async function setOnline(ctx, next) {
    let address = ctx.query.owner;
    if (!address) {
      // ctx.throw(APP_CONST.ERR_CODE.NOT_AUTHED, 'Invalid Visit');
    } else {
      address = address.toLowerCase();
      ctx.service.defencePost.trySetProtect(address);
    }
    await next();
  };
};

