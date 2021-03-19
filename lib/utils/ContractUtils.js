
module.exports = app => {
  
  if(!app.cUtils) app.cUtils = {};

  app.cUtils.getABI = function(address) {
    if (!app.contractsABI) {
      app.contractsABI = {};
    }

    return app.contractsABI[address];
  };

  app.cUtils.setABI = function(address, abi, name) {
    if (!app.contractsABI) {
      app.contractsABI = {};
    }
    app.contractsABI[address] = abi;
  }

  app.cUtils.getEventListener = function(address, event){
    if (!app.contractsListener) {
      app.contractsListener = {};
    }

    return app.contractsListener[`${address}@${event}`];
  }

  app.cUtils.setEventListener = function(address, event, callback){
    if (!app.contractsListener) {
      app.contractsListener = {};
    }

    app.contractsListener[`${address}@${event}`] = {
      address: address,
      evt: event,
      callback: callback
    };
  }

  app.cUtils.removeEventListener = function(address, event){
    if (app.contractsListener) {
      delete app.contractsListener[`${address}@${event}`];
    }
  }

  app.cUtils.sleep = function (time){
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
          resolve();
      }, time);
  })
}
};