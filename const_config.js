'use strict';
const path = require('path');
const fs = require('fs');
const CONST = require('./const.js');

module.exports = app => {

  freezeObj(CONST);
  // 挂着到全局
  Object.defineProperty(global, 'APP_CONST', {
    get() {
      return CONST;
    },
  });
  // 挂载到app下
  Object.defineProperty(app, 'CONST', {
    get() {
      return CONST;
    },
  });


  // 让对象所有属性不可修改
  function freezeObj(obj) {
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      keys.forEach(key => {
        Object.freeze(obj, key);
        freezeObj(obj[key]);
      });
    }
  }

};
