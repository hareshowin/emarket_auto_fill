'use strict';
module.exports = options => {
  options;
  return async function errHandle(ctx, next) {
    const startTs = Date.now();
    try {
      await next();
    } catch (err) {
      ctx.logger.debug('err handle: ');
      ctx.logger.debug(err);
      // ctx.status = err.status || 500;
      return ctx.error(err.status || 500, err.message || '服务器内部错误.');
    } finally {
      const endTs = Date.now();
      ctx.logger.debug(`处理完毕,耗时${endTs - startTs}ms`);
    }

  };
};