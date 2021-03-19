"use strict";

const Web3 = require("web3");
const Tx = require("ethereumjs-tx");
class BlockChainImpl {
  constructor(app) {
    // super();
    this.app = app;
  }

  async isReady() {
    return this.app.web3 != undefined;
  }

  async ready(web3_url) {
    this.app.web3 = new Web3(
      // new Web3.providers.WebsocketProvider("wss://kovan.infura.io/ws")
      new Web3.providers.HttpProvider(web3_url)
    );
  }

  async getBalance(owner){
    return await this.app.web3.eth.getBalance(owner);
  }

  async getLastHandledBlock() {
    /*
    let task = await this.app.model.Task.findOne();
    if (!task) {
      task = await this.app.model.Task.create({
        last_handled_block: this.app.config.fromBlock - 1
      });
    }
    this.app.lastHandledBlock =
      task.last_handled_block < 0 ? 0 : task.last_handled_block;
    */
    return this.app.lastHandledBlock;
  }

  async setLastHandledBlock(block) {
    /*
    let task = await this.app.model.Task.findOne();
    if (!task) {
      task = await this.app.model.Task.create({
        last_handled_block: this.app.config.fromBlock - 1
      });
    }
    await task.update({ last_handled_block: block });
    */
    this.app.lastHandledBlock = block;
  }

  async getLastBlock() {
    return await this.app.web3.eth.getBlockNumber();
  }

  async fetchEvents(fromBlock, block) {
    let toBlock = block - 6;
    this.app.logger.info(`toBlock: ${toBlock}, fromBlock:${fromBlock}`);
    if (toBlock < fromBlock) {
      return toBlock;
    }
    console.log(
      `fetchEvents: ${fromBlock} -> ${toBlock}, blocks: ${toBlock -
      fromBlock +
      1}`
    );

    let listeners = this.app.contractsListener || {};

    for (let key in listeners) {
      let listener = listeners[key];

      // console.log(
      //   `Listener[${fromBlock}][${toBlock}}][${listener.evt}]: ${
      //     listener.address
      //   }`
      // );

      const abi = this.app.cUtils.getABI(listener.address);

      const contract = new this.app.web3.eth.Contract(abi, listener.address);

      let errors, events = await contract.getPastEvents(listener.evt, {
          fromBlock: fromBlock,
          toBlock: toBlock
        });

      if (!errors && events && events.length > 0) {
        console.log(`>> 监听到事件 * ${events.length}`);
        for (const e of events) {
          // console.log(`${JSON.stringify(e)}`);
          e._bsc_listener_key = key;
          this.app.eventQueue.add(e);
          // if (listener.callback) await listener.callback(e);
        }
      }
    }
    return toBlock;
  }

  async handleEvents() {
    let listeners = this.app.contractsListener || {};
    let events = this.app.eventQueue.list();
    let count = 0;

    while (events.length > 0) {
      let e = events.shift();
      let listener = listeners[e._bsc_listener_key];

      if (listener && listener.callback) {
        try {
          await listener.callback(e);
        } catch (error) {
          try {
            this.app.logger.error(
              `[BlockChainService]<handleEvents> event handle error: ${JSON.stringify(
                e
              )}`
            );
          } catch (err) {
            this.app.logger.error(err);
          }
          this.app.logger.error(error);
        }
      }

      count++;
    }

    return count;
  }

  async sendSignedTransaction(data, callback) {
    // this.app.web3.eth.sendSignedTransaction(data).on("receipt", console.log);
    return await this.app.web3.eth.sendSignedTransaction(data);
  }

  async readFromContract(address, funcName, params) {
    const abi = this.app.cUtils.getABI(address);
    const contract = new this.app.web3.eth.Contract(abi, address);
    
    return await contract.methods[funcName].apply(this, params).call();
  }

  async isContRegister(address) {
    const abi = this.app.cUtils.getABI(address);
    return abi ? true: false ;
  }

  async doRegContract(address, abi, name) {
    if(!this.app.cUtils.getABI(address)) {
      this.app.cUtils.setABI(address, JSON.parse(abi), name);
    }
  }

  /**
   * new transaction by contract
   * @param {String}  contractAddress - hexadecimal num to string
   * @param {String}  contractMethod - the method name to send on contract
   * @param {String}  contractMethodParam - json object string
   * @param {String}  privateKey - private key of from address
   * @param {String}  from - from address, hexadecimal num to string
   * @param {String}  gasPrice - gasPrice, decimal num to string, unit:wei
   * @param {String}  gasLimit - gasLimit, decimal num to string
   * @param {String}  value - value, decimal num to string, unit:ether
   */
  async signTransaction(
    contractAddress,
    contractMethod,
    contractMethodParam,
    privateKey,
    from,
    gasPrice,
    gasLimit,
    value
  ) {
    let web3 = this.app.web3;
    let contractABI = this.app.cUtils.getABI(contractAddress);
    // let isCanNew = await TransactionCtr.canReceiveNewTrans(from);
    // if (!isCanNew) {
    //   return { error: ERROR_CODES.TRANS_LAST_TRANS_NOT_RETURN };
    // }
    privateKey = privateKey.substr(privateKey.indexOf("0x") == 0 ? 2 : 0);
    // if (!gasPrice) {
    //   gasPrice = await TransactionCtr.getNormalGasPrice();
    // }

    if (!value) {
      value = "0";
    }


    console.log(`contractABI: ${contractABI}`);
    console.log(`address: ${contractAddress}`);
    console.log(`contractMethod: ${contractMethod}`);

    let abiData = this._getContractMethodABI(
      contractABI,
      contractAddress,
      contractMethod,
      contractMethodParam
    );
    console.log(`==== abiData: `, abiData);

    // if (!gasLimit) {
    //   try {
    //     gasLimit = await web3.eth
    //       .estimateGas({
    //         to: contractAddress,
    //         data: abiData
    //       })
    //       .then(result => result);
    //   } catch (e) {
    //     console.error("newTransByContract gasLimit error: ", e);
    //     gasLimit = "3000000";
    //   }
    // }

    let nonce = await web3.eth.getTransactionCount(from);

    // let sameTrans = TransactionCtr.getPendingTransItemByABIData(abiData, from);
    // if (
    //   sameTrans &&
    //   !sameTrans.transHash &&
    //   Number(sameTrans.gasPrice) < Number(gasPrice)
    // ) {
    //   nonce == sameTrans.nonce;
    // }

    console.log(`==== newTrans nonce:${nonce}  privateKey:${privateKey}`);

    let rawTx = {
      nonce: web3.utils.toHex(nonce),
      from: from,
      to: contractAddress,
      value: web3.utils.toHex(web3.utils.toWei(value, "ether")),
      gasPrice: web3.utils.toHex(gasPrice), //unit: wei
      gasLimit: web3.utils.toHex(gasLimit),
      data: abiData
    };
    let tx = new Tx(rawTx);
    let privateKeyBuffer = new Buffer(privateKey, "hex");
    tx.sign(privateKeyBuffer);

    let serializedTx = tx.serialize();

    return "0x" + serializedTx.toString("hex");
  }
/**
 * Will send a transaction to the smart contract and execute its method. 
 * Note this can alter the smart contract state.
 *
 * @param {String} contractAddress
 * @param {String} contractMethod
 * @param {Object} contractMethodParam
 * @param {String} privateKey
 * @param {Address} from
 * @param {String} gasLimit
 * @param {number} [value=0]
 * @returns {Promise}
 * @memberof BlockChainImpl
 */
async sendContractTransaction(
    contractAddress,
    contractMethod,
    contractMethodParam,
    privateKey,
    from,
    // gasPrice,
    gasLimit,
    value = 0
  ) {
    const signed = await this.signTransaction(
      contractAddress,
      contractMethod,
      contractMethodParam,
      privateKey,
      from,
      await this.getGasPrice(),
      gasLimit,
      value
    );
    return this.sendSignedTransaction(
      signed,
      null
    );

  }
  /**
   * get gas price from block chain
   *
   * @returns {String} - unit: Wei
   * @memberof BlockChainImpl
   */
  async getGasPrice() {
    return await this.app.web3.eth.getGasPrice();
  }

  /**
   * encodes the abi for contractMethod
   * !!! the contract should be send by every address, or do not call this function
   * @return {String} - This can be used to send a transaction, call a method,
   *                    or pass it into another smart contracts method as arguments
   * @param {string}  contractABI - json object string
   * @param {String}  contractAddress - hexadecimal num to string
   * @param {String}  contractMethod - the method name to send on contract
   * @param {String}  contractMethodParam - json object string
   */
  _getContractMethodABI(
    contractABI,
    contractAddress,
    contractMethod,
    contractMethodParam
  ) {
    let contract = new this.app.web3.eth.Contract(
      contractABI,
      contractAddress
    );
    if (contractMethodParam) {
      let paramsObj = contractMethodParam;
      let paramValuesArray = Object.values(paramsObj);
      let transObject = contract.methods[contractMethod](...paramValuesArray);
      return transObject.encodeABI();
    } else {
      let transObject = contract.methods[contractMethod]();
      return transObject.encodeABI();
    }
  }

  /**
   * new transaction to send eto
   * @param {String}  toAddress - hexadecimal num to string
   * @param {String}  fromAddress - the method name to send on contract
   * @param {String}  privateKey - private key of from address
   * @param {String}  gasPrice - gasPrice, decimal num to string, unit:wei
   * @param {String}  gasLimit - gasLimit, decimal num to string
   * @param {String}  value - value, decimal num to string, unit:ether
   */
  async signTransferEthTransaction(
    toAddress,
    fromAddress,
    privateKey,
    gasPrice,
    gasLimit,
    value
  ) {
    let web3 = this.app.web3;
    
    privateKey = privateKey.substr(privateKey.indexOf("0x") == 0 ? 2 : 0);

    if (!value) {
      value = "0";
    }

    let nonce = await web3.eth.getTransactionCount(fromAddress);

    console.log(`==== newTrans nonce:${nonce}  privateKey:${privateKey}`);

    let rawTx = {
      nonce: web3.utils.toHex(nonce),
      from: fromAddress,
      to: toAddress,
      value: web3.utils.toHex(web3.utils.toWei(value, "ether")),
      gasPrice: web3.utils.toHex(gasPrice), //unit: wei
      gasLimit: web3.utils.toHex(gasLimit)
    };
    let tx = new Tx(rawTx);
    let privateKeyBuffer = new Buffer(privateKey, "hex");
    tx.sign(privateKeyBuffer);

    let serializedTx = tx.serialize();

    return "0x" + serializedTx.toString("hex");
  }
}

module.exports = BlockChainImpl;
