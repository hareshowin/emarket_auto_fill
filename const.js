'use strict';
module.exports = {
  ERR_CODE: {
    NO_ERROR: 0,
    PARAM_ERROR: -1, //参数错误
    DATA_ERROR: -2,  //数据错误
    EXECUTE_ERROR: -3, //执行错误
    NOT_AUTHED: -4,    // 登录状态错误
    NO_RIGHT: -5, // 没有权限
    SYS_ERROR: -6, // 系统错误
    TRX_ERROR: -7, // 余额不足
  },
};
