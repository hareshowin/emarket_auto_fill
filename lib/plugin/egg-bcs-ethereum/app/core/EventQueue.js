
module.exports = app => {
  
  if(!app.eventQueue) app.eventQueue = {};

  let eq = app.eventQueue;

  eq._queue = [];

  eq.add = function(e) {
    eq._queue.push(e);
    eq._queue.sort(eq.sortFunc);
  }

  eq.list = function () {
    return eq._queue;
  }

  eq.sortFunc = function(ea, eb) {
    let bn = ea.blockNumber - eb.blockNumber;

    if(bn == 0) 
      return ea.logIndex - eb.logIndex;
    else
      return bn;
  }

  eq.print = function() {
    for(let e of eq._queue) {
      console.log(`> ${e.blockNumber} | ${e.logIndex} | ${e.event} | ${e.id}`);
    }
  }
};