module.exports = {
  succ(data, msg = 'success') {
    this.body = {
      status: 1,
      msg,
      data,
    };
  },
  error(status, msg) {
    this.body = {
      status,
      msg,
    };
  },
  throw(code=500, msg='System Error!') {
    const err = new Error(msg) ;
    err.status = code;
    throw err;
  },
};