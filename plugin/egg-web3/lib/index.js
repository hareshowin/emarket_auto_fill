'use strict';
const EventEmitter = require('events').EventEmitter;
const fs = require('fs');
const path = require('path');

function delay(seconds) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(seconds);
    }, seconds * 1000);
  });
}

function debounce(fn, interval, ctx) {
  const maxCacheCount = 500;
  interval = interval || 0;
  ctx = ctx || this;

  let index = 0; // 计数
  let timer = null;

  return function() {
    index++;
    if (index >= maxCacheCount) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      index = 0;
      fn.apply(ctx, arguments);
    } else {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      timer = setTimeout(function() {
        fn.apply(ctx, arguments);
        index = 0;
      }, interval);
    }

  };
}


class Web3Helper extends EventEmitter {
  constructor(app) {
    super();
    this.app = app;

    this.cacheList = [];
    this.isSyncing = false;
    this.batchList = [];
    this.isProcessing = false;
    this.eventsMap = new Map();
    this.handlerMap = new Map();

    this.makeNewBatch = debounce(() => {
      const list = this.cacheList;
      this.cacheList = [];
      this.batchList.push(list);
      this.syncCache();
    }, 1000);

  }

  // 监听合约事件
  listenWithTrans(contract, eventName, handlePath, fromBlock) {
    fromBlock = fromBlock || 7000000;
    this.app.logger.info(`开始监听事件:[${contract.___name}][${eventName}]...`);
    (contract.events[eventName])({
      fromBlock, // 监听起始区块
      toBlock: 'latest',
    })
      .on('data', event => {
        this.app.logger.debug(`监听到【data】事件: 【${event.event}】【${event.blockNumber}】【${event.id}】`);
        this.addToList(event);

      })
      .on('changed', event => {
        this.app.logger.warn(`监听到【removed】事件: 【${event.event}】【${event.blockNumber}】【${event.id}】`);
        this.addToList(event);

      })
      .on('error', event => {
        this.app.logger.warn(event);
      });

    const address = contract.options.address.toString().toLowerCase();
    this.handlerMap.set(`${address}_${eventName}`, handlePath);

    if (!this.eventsMap.get(contract)) {
      this.eventsMap.set(contract, []);
    }
    this.eventsMap.get(contract).push(eventName);

  }

  // 缓存一批数据
  async syncBatch(list) {
    this.app.logger.info('syncBatch: ', list.length);
    const EventsHis = this.app.model[this.app.config.web3.eventModel];
    const SequelizeService = this.app.model;
    const ids = list.map(v => v.id);

    const dataArr = list.filter(e => !e.removed);
    const removedArr = list.filter(e => e.removed);
    const dataIds = new Set(dataArr.map(e => e.id));
    const removedIds = new Set(removedArr.map(e => e.id));

    const [ existDataArr, existRemovedArr ] = await Promise.all([
      EventsHis.findAll({
        where: {
          id: { $in: ids },
          removed: 0,
        },
      }),
      EventsHis.findAll({
        where: {
          id: { $in: ids },
          removed: 1,
        },
      }),
    ]);

    const deletedIds = new Set();
    existDataArr.forEach(e => {
      if (removedIds.has(e.id)) {
        deletedIds.add(e.id);
      }
    });

    existRemovedArr.forEach(e => {
      if (dataIds.has(e.id)) {
        deletedIds.add(e.id);
      }
    });

    dataArr.forEach(e => {
      if (removedIds.has(e.id)) {
        deletedIds.add(e.id);
      }
    });

    list = list.filter(e => !deletedIds.has(e.id));

    const trans = await SequelizeService.transaction();
    // 先删除掉数据库之前的，再把新的插入
    await EventsHis.destroy({
      where: {
        id: { $in: [ ...deletedIds ] },
      },
      transaction: trans,
    });

    await EventsHis.bulkCreate(list, { ignoreDuplicates: true, transaction: trans });

    // 事务提交
    await trans.commit();
  }

  async syncCache() {
    if (this.isSyncing) {
      return;
    }
    this.isSyncing = true;
    const batch = this.batchList.pop();
    if (batch) {
      this.emit('cacheStart');
      try {
        await this.syncBatch(batch);
      } catch (error) {
        this.app.logger.error('事件缓存同步失败: ', error);
        await delay(3); // 失败3s后重试
        this.batchList.unshift(batch);
      } finally {
        this.isSyncing = false;
        this.syncCache();
      }
    } else {
      // 队列处理完毕
      this.isSyncing = false;
      this.app.logger.info('缓存队列同步完成.');
      this.emit('cacheFinish');
    }
  }

  async addToList(event) {
    let insertData;
    if (this.app.config.web3.client === 'parity') {
      // parity客户端
      insertData = {
        id: event.id,
        returnValues: event.returnValues,
        event: event.event,
        blockNumber: event.blockNumber,
        address: event.address,
        removed: event.type !== 'mined',
        // type: event.type,   //
        logIndex: event.logIndex,
        transactionHash: event.transactionHash,
        transactionIndex: event.transactionIndex,
      };
    } else if (this.app.config.web3.client === 'geth') {
      // geth客户端
      insertData = {
        id: event.id,
        returnValues: event.returnValues,
        event: event.event,
        blockNumber: event.blockNumber,
        address: event.address,
        removed: event.removed,
        // type: type, //
        logIndex: event.logIndex,
        transactionHash: event.transactionHash,
        transactionIndex: event.transactionIndex,

      };
    } else {
      throw new Error('客户端只能是geth或parity.');
    }
    this.cacheList.push(insertData);
    this.makeNewBatch();
  }

  // 开始监听新的区块
  listenNewBlock() {
    const safeProcessConfirmEvents = this.safeInvokeAfterCache(this.processConfirmEvents, 3000);
    let warnTimer = null;
    const warnMinutes = 2;
    this.app.web3.eth.subscribe('newBlockHeaders', (error, result) => {
      if (error) {
        this.app.logger.error(error);
      } else {
        if (result.number && !Number.isNaN(result.number)) {
          this.app.logger.debug('发现新区块: ', result.number, result.hash);
          this.emit('newBlock', result.number, result.hash);// 发射事件

          ((blockNumber, hash) => {
            // 记录当前监听到的区块编号，下次启动从此编号开始监听
            this.recordLastBlock(blockNumber);
            this.lastBlock = blockNumber;
            this.lastTime = Date.now();
            this.lastHash = hash;
            warnTimer && clearTimeout(warnTimer);
            warnTimer = null;
            warnTimer = setTimeout(() => {
              this.app.logger.warn(`超过${warnMinutes}分钟没有监听到新区块...`);
            }, warnMinutes * 60 * 1000);

            // 处理一批确认事件
            safeProcessConfirmEvents(blockNumber);

            // 获取过去事件
            this.getAllPastEvents(blockNumber - 4, blockNumber - 1)
              .then(events => {
                this.app.logger.debug(`查询[${blockNumber - 4}] - [${blockNumber - 1}]: `, events.length);
                events.forEach(event => {
                  this.addToList(event);
                });
              })
              .catch(err => {
                this.app.logger.error(`查询[${blockNumber - 4}] - [${blockNumber - 1}]事件出错:`, err.message);
              });
          })(result.number, result.hash);
        }
      }
    })
      .on('data', function(blockHeader) {
        blockHeader;
        // sails.myLog.log('发现新区块: ', blockHeader.number, blockHeader.hash);
        // eventEmitter.emit('newBlock', blockHeader.number, blockHeader.hash);//发射事件
      });
  }

  async getPastEvents(contract, event, fromBlock, toBlock) {
    const events = await contract.getPastEvents(event, {
      fromBlock,
      toBlock,
    }, (error, events) => {
      if (events.length) {
        this.app.logger.debug(`查询到${event}: ${events.length}个`);
      }
    });

    return events;
  }

  async getAllPastEvents(fromBlock, toBlock) {
    const promiseArr = [];
    this.eventsMap.forEach((events, contract) => {
      events.forEach(event => {
        promiseArr.push(this.getPastEvents(contract, event, fromBlock, toBlock));
      });
    });
    const arr = await Promise.all(promiseArr);
    return arr.reduce((a, b) => [].concat(a, b));
  }

  // 处理单个事件
  processEvent(event, handlePath, eggCtx) {
    return (async () => {
      let trans;
      let commited = false;
      const timestamp = Date.now();
      let noHandle = false;
      const warnTimer = setInterval(() => {
        this.app.logger.warn(`${event.event}[${event.id}]事件处理时间过长: ${(Date.now() - timestamp) / 1000}s`);
      }, 5000);
      try {
        const paths = handlePath.split('.');
        const serviceName = paths[0];
        const funcName = paths[1];
        const dataPromise = eggCtx.service[serviceName][funcName].bind(eggCtx.service[serviceName]);

        if (dataPromise) {
          trans = await this.app.model.transaction();
          await dataPromise(event, trans);

          // 事务提交
          await trans.commit();
          commited = true;
          this.app.logger.info(`${event.event}[${event.blockNumber}][${event.id}]事件处理成功 ${(Date.now() - timestamp) / 1000}s.`);
        } else {
          noHandle = true;
        }
        clearInterval(warnTimer);
        if (noHandle) {
          const msg = `${event.event}事件没有handler`;
          this.app.logger.error(msg);
          // 抛出没有handle异常
          throw new Error(msg);
        }
        // 返回成功
        return 1;
      } catch (error) {
        this.app.logger.error(`${event.event}[${event.blockNumber}][${event.id}]事件处理错误: ${error.toString()}`);
        this.app.logger.error(error);
        event.err_msg = error.toString();
        if (trans && !commited) {
          // 回滚
          try {
            await trans.rollback();
            this.app.logger.debug(`${event.event}[${event.id}]回滚成功.`);
          } catch (error) {
            this.app.logger.error(`${event.event}[${event.id}]回滚失败.`);
            this.app.logger.error(error.toString());
          }
        }
        clearInterval(warnTimer);
        // 返回失败
        return 0;
      }
    })();
  }


  async processConfirmEvents(blockNumber) {
    if (this.isProcessing) {
      return this.app.logger.warn('isProcessing...'); // 必须是阻塞的，同一时间只能有一个处理队列
    }
    if (this.isSyncing) {
      // 同步事件与处理事件 不可同时进行，容易造成错乱
      this.app.logger.warn('同步事件与处理事件 同时进行，可能会造成错乱.');
    }

    this.isProcessing = true;
    let events = null;
    try {
      try {
        events = await this.popEvents(blockNumber);
        events;
      } catch (error) {
        throw new Error(`从事件缓存表取数据失败: ${error.message}.`);
      }

      // 创建匿名ctx
      const eggCtx = this.app.createAnonymousContext();
      eggCtx.blockNumber = blockNumber;

      const total = events.length;
      let success = 0;
      let fail = 0;
      fail;
      const fails = [];

      if (events && events.length) {
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          // 处理事件
          try {
            const address = event.address.toLowerCase();
            const result = await this.processEvent(event, this.handlerMap.get(`${address}_${event.event}`), eggCtx);
            if (result) {
              success++;
            } else {
              fail++;
              fails.push(event);
            }
          } catch (error) {
            this.app.logger.warn(error);
          } finally {
            // 处理过的事件,不管成功还是失败,都要从缓存表中删除
            await event.destroy();
          }
        }

        // 批量插入到失败记录表
        try {
          const insertDatas = fails.map(v => {
            const { id, event, returnValues, timestamp, blockNumber, address, transactionHash, err_msg } = v;
            return { event_id: id, event, returnValues, timestamp, blockNumber, address, transactionHash, err_msg };
          });
          insertDatas.length && this.app.logger.error(insertDatas);
          // todo:
          // await this.app.model.FailEvents.bulkCreate(insertDatas);
        } catch (error) {
          // throw error;
          this.app.logger.error('事件处理错误记录表插入失败: ', error.toString());
        } finally {
          this.app.logger.info(`处理事件完毕: ${success} / ${total}`);
        }
      } else {
        // sails.myLog.log('没有未处理确认事件.');
      }

    } catch (error) {
      this.app.logger.error(error);
    } finally {
      this.isProcessing = false;
    }
  }

  popEvents(blockNumber) {
    const EventsHis = this.app.model[this.app.config.web3.eventModel];
    return EventsHis.findAll({
      where: {
        blockNumber: { $lt: blockNumber - 6 },
        removed: 0,
      },
      order: [
        [ 'blockNumber' ],
        [ 'transactionIndex' ],
        [ 'logIndex' ],
      ],
      limit: 1000,
    });
  }


  safeInvokeAfterCache(fn, delay, ctx) {
    ctx = ctx || this;
    let timer = null;
    let invoked = false;
    let args = [];

    this.on('cacheStart', () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        this.app.logger.debug('开始缓存事件,事件处理被中断...');
      }
    });
    // 接收到cacheFinish事件意味着队列内所有的事件全部写入到缓存表内，可以认为是绝对安全的
    this.on('cacheFinish', () => {
      if (invoked) {
        this.app.logger.debug('事件缓存同步完成,3s后尝试恢复事件处理...');
        timer = setTimeout(() => {
          fn.apply(ctx, args);
          invoked = false;
          args = [];
        }, delay);
      }
    });

    function func() {
      if (invoked) {
        return;
      }
      invoked = true;
      args = Array.prototype.slice.apply(arguments);
      timer = setTimeout(() => {
        fn.apply(ctx, args);
        invoked = false;
        args = [];
      }, delay);
    }
    return func;
  }

  recordLastBlock(str) {
    // const p = path.join(this.app.baseDir, this.app.config.web3.lastBlockRecordPath);
    const p = this.getLastBlockPath();
    fs.writeFile(p, str.toString(), function() { return; });
  }

  getLastBlock() {
    // const p = path.join(this.app.baseDir, this.app.config.web3.lastBlockRecordPath);
    const p = this.getLastBlockPath();
    const data = fs.readFileSync(p, 'utf-8');
    return parseInt(data);
  }
  getLastBlockPath() {
    const p = path.join(this.app.baseDir, this.app.config.web3.lastBlockRecordPath);
    try {
      fs.accessSync(p, fs.constants.F_OK);
    } catch (err) {
      // 不存在
      fs.writeFileSync(p, this.app.config.web3.fromBlock, 'utf-8');
    }
    return p;
  }

}

module.exports = app => {

  const web3Helper = new Web3Helper(app);
  const { contract } = app;
  // console.log(contract);
  // 自动监听合约事件
  const web3HandlerMap = app.config.web3.eventHandler;
  const keys = Object.keys(web3HandlerMap);
  const fromBlock = web3Helper.getLastBlock() || 7000000;
  app.logger.info(`listen from block ${fromBlock}`);
  keys.forEach(key => {
    const arr = key.split('.');
    const contractName = arr[0];
    const eventName = arr[1];
    // console.log(contract[contractName]);
    web3Helper.listenWithTrans(contract[contractName], eventName, web3HandlerMap[key], fromBlock);
  });

  // 开始监听新区块事件
  web3Helper.listenNewBlock();

  app.web3Helper = web3Helper;
};
