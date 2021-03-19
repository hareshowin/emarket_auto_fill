const Subscription = require("egg").Subscription;
const TronWeb = require('tronweb')
/**
 * run every minutes
 */
class MinuteTask extends Subscription {
  static get schedule() {
    return {
      interval: '1m',
      type: "worker",
      immediate: true,
      // disable: true,
    };
  }

  async subscribe() {
    if(this.app.MinuteTaskIP)
    {
      this.logger.info(`[MINUTE TASK] is running, cancel...`);
      return
    }

    this.app.MinuteTaskIP = true;

    // Init Your TronWeb List here!
    if(!this.app.WebList) { 
      this.app.WebList = [] ;
      for(let i = 0; i <= this.app.config.pkList.length; i ++) {
        let tmpWeb = new TronWeb(
            this.app.config.tronConf.fullNode,
            this.app.config.tronConf.solNode,
            this.app.config.tronConf.eventNode,
            this.app.config.pkList[i],
          ); 
        tmpWeb.setHeader({"TRON-PRO-API-KEY": this.app.config.tronConf.apiKey});
        tmpWeb.needRefresh = true ;
        this.app.WebList.push(tmpWeb) ;
      }
    }

    try{
      let m = new Date().getMinutes() ;
      for(let i = 0 ; i < this.app.WebList.length ; i ++) {
        if(m%this.app.WebList.length == i || m > 56 ) {
          await this.getAddressInfo(this.app.WebList[i]) ;
        } else if(this.app.WebList[i].needRefresh) {
          await this.getAddressInfo(this.app.WebList[i]) ;
        }
      }
      await this.checkEnergeMarket() ;
    }catch(error)
    {
      this.logger.info(`[MINUTE TASK] ERROR:${error}`);
    }finally{
      this.app.MinuteTaskIP = false ;
    }
  }

  async getAddressInfo(tmpWeb) {
    let pendAddr = tmpWeb.defaultAddress.base58 ;
    let curl_url = `https://apilist.tronscan.org/api/account?address=${pendAddr}&only_unconfirmed=true` ;
    this.logger.info('CURL_URL: ', curl_url) ;
    let ret = await this.ctx.curl(curl_url, {
        headers: {
          'TRON-PRO-API-KEY': this.app.config.tronConf.apiKey,
        },
        dataType: 'json',
        timeout: 30000,
    });
    ret = ret.data ;
    this.app.energyRate = ret.bandwidth.totalEnergyLimit/ret.bandwidth.totalEnergyWeight ; // 31.42xxx  = 31.4
    tmpWeb.voteTotal = ret.voteTotal ;
    tmpWeb.frozenTotal = ret.accountResource.frozen_balance_for_energy.frozen_balance || 0 ; 
    tmpWeb.curBalance = Math.floor(ret.balance/1000000) ;

    let s = `\nFreeze TRX:Energy = ${this.app.energyRate}\n Address：[${tmpWeb.defaultAddress.base58}], Balance(TRX): ${tmpWeb.curBalance}, ` ;
    tmpWeb.freezeDict = {} ;
    let frozenDetail = '' ;
    let ts = new Date().getTime() ;
    for (let i = 0 ; i < ret.delegated.sentDelegatedResource.length ; i ++) {
      let item = ret.delegated.sentDelegatedResource[i] ;
      tmpWeb.freezeDict[item.to] = item.expire_time_for_energy ;
      tmpWeb.frozenTotal += item.frozen_balance_for_energy ;
      frozenDetail += `To:[${item.to}], Amount:[${item.frozen_balance_for_energy}], Expire: [${item.expire_time_for_energy}]\n` ;
    }
    tmpWeb.frozenTotal = Math.floor(tmpWeb.frozenTotal/1000000) ;
    s += `Voted: [${tmpWeb.voteTotal}]/Can Vote: [${tmpWeb.frozenTotal}]\n`;
    s += frozenDetail ;
    this.logger.info(s) ;
    
    let d = new Date() ;
    let keephours = {1:1, 7:1, 13:1, 19:1, 5:1, 11:1, 17:1, 23:1} ;
    if(d.getHours() in keephours && d.getMinutes() > 56) {// will not unfreeze in case of miss vote
      if(tmpWeb.frozenTotal > tmpWeb.voteTotal) {
        this.logger.info(`[${tmpWeb.defaultAddress.base58}] is voting:  [${this.app.config.tronConf.voteAddr}] => ${tmpWeb.frozenTotal}`) ;
        let voteDetail = {} ;
        voteDetail[this.app.config.tronConf.voteAddr] = tmpWeb.frozenTotal;
        let tradeobj = await tmpWeb.transactionBuilder.vote( voteDetail, tmpWeb.defaultAddress.hex);
        let signedtxn = await tmpWeb.trx.sign(tradeobj);
        let receipt = await tmpWeb.trx.sendRawTransaction(signedtxn);
        this.logger.info(receipt) ;
      }
    } else {
      let mill_ts = d.getTime();
      for(let addr in tmpWeb.freezeDict) {
        if(addr in this.app.config.fillAddr) { // those addresses will keep freezed
          continue ;
        }
        if(mill_ts > tmpWeb.freezeDict[addr]) {
          this.logger.info(`Unfreeze [${addr}]`) ;
          let tradeobj = await tmpWeb.transactionBuilder.unfreezeBalance("ENERGY", tmpWeb.defaultAddress.base58, addr);
          let signedtxn = await tmpWeb.trx.sign(tradeobj);
          let receipt = await tmpWeb.trx.sendRawTransaction(signedtxn);
          this.logger.info(receipt) ;
          this.app.MinuteTaskIP = false ;
          tmpWeb.needRefresh = true ;
          return ;
        }
      }
    }
    tmpWeb.needRefresh = false ;
  }

  async checkEnergeMarket() {
    let curl_url = `http://47.88.1.182:30001/list-order` ;
    this.logger.info('CURL_URL: ', curl_url) ;
    let ret = await this.ctx.curl(curl_url, {
        method: 'POST',
        headers: {
          'TRON-PRO-API-KEY': this.app.config.tronConf.apiKey,
        },
        dataType: 'json',
        data: {orderby: 'price'},
        timeout: 30000,
    });
    ret = ret.data ;
    if(ret.status == 1) {
      let orderList = ret.data.info ;
      for(let i = 0 ; i < orderList.length; i ++)  {
        let order = orderList[i] ;
        let doWeb = await this.findBestWeb(order) ;
        if(doWeb) {
          this.logger.info(order) ;
          let amount = order.web_max ;
          let order_id = order.order_id ;
          let tradeobj = await doWeb.transactionBuilder.freezeBalance(doWeb.toSun(order.freeze_trx), 3, "ENERGY", doWeb.defaultAddress.hex, order.receiver);
          let signedtxn = await doWeb.trx.sign(tradeobj);
          let post_data = {order_id, amount, signedtxn: JSON.stringify(signedtxn)} ;
          let curl_url = `http://47.88.1.182:30001/fill-order` ;
          this.logger.info('CURL_URL: ', curl_url) ;
          ret = await this.ctx.curl(curl_url, {
              method: 'POST',
              headers: {
                'TRON-PRO-API-KEY': this.app.config.tronConf.apiKey,
              },
              dataType: 'json',
              data: post_data,
              timeout: 30000,
          });
          ret = ret.data;
          this.logger.info(ret);
          if(ret.status == 1) {
            doWeb.curBalance -= order.freeze_trx-order.web_income ;
            this.app.orderInfo.total_freeze += order.freeze_trx ;
            this.app.orderInfo.day_freeze += order.freeze_trx ;
            this.app.orderInfo.total_income += order.web_income ;
            this.app.orderInfo.day_income += order.web_income ;
            let web_apy = order.web_income*365/(3*order.freeze_trx) ;
            this.logger.info(`[${doWeb.defaultAddress.base58}] Order[${order.order_id}] Filled!，Freeze TRX [${order.freeze_trx}], Income[${order.web_income}], APY[${web_apy}]！`);
            doWeb.needRefresh = true ;
          } 
          break ;
        }
      }
    }
  }

  async findBestWeb(order) {
    if(this.app.WebList.length == 0) {
     return undefined ;
    }
    let recvAddr58 = this.app.WebList[0].address.fromHex(order.receiver) ;
    let trxMax = Math.ceil(order.left_amount*this.app.config.toleRate/this.app.energyRate) ; 
    let trxMin = Math.ceil(order.min_amount*this.app.config.toleRate/this.app.energyRate) ; 
    this.logger.info(`findBestWeb: ${order.order_id}, Receiver:${recvAddr58}, TRX_MAX: [${trxMax}], TRX_MIN: [${trxMin}]`) ;

    let maxList = [] ; // can take whole order amount
    let minList = [] ; // under whole order amount
    for(let i = 0 ; i < this.app.WebList.length ; i ++) {
      if(recvAddr58 != this.app.WebList[i].defaultAddress.base58) { // Not self
        if(this.app.WebList[i].curBalance - 5 >= trxMax) {
          maxList.push(this.app.WebList[i]) ;
        } else if(this.app.WebList[i].curBalance - 5 >= trxMin) {
          minList.push(this.app.WebList[i])
        }
      }
    }
    
    if(maxList.length == 0 && minList.length == 0) {
      return undefined ;
    }

    let doWeb ;
    if(maxList.length > 0) { // take whole, choose minimal 
      doWeb = maxList[0] ;
      for(let i = 1 ; i < maxList.length ; i ++) {
        if(maxList[i].curBalance < doWeb.curBalance) {
          doWeb = maxList[i] ;
        }
      } 
    } else { // under whole, buy as much as you can!
      doWeb = minList[0] ;
      for(let i = 1 ; i < minList.length ; i ++) {
        if(minList[i].curBalance > doWeb.curBalance) {
          doWeb = minList[i] ;
        }
      } 
    }

    if(doWeb.curBalance >= trxMax+5) { 
      order.freeze_trx = trxMax ;
      order.web_max = order.left_amount ;
      order.web_income = parseFloat(doWeb.fromSun(order.left_payout)) ;
      return doWeb ;
    } else if(doWeb.curBalance >= trxMin+5) {
      let maxBal = doWeb.curBalance-5 ; 
      let max_amount =  Math.floor(order.min_amount*maxBal/trxMin/100)*100 ;

      let all_income = max_amount*order.price*3; // total income
      order.freeze_trx = maxBal ;                // freeze TRXs
      order.web_max = max_amount ;               // amount in energies
      order.web_income = parseFloat(doWeb.fromSun(all_income-this.getTaxFee(all_income)))  ; // true income
      return doWeb ;
    } else {
      return undefined ;
    }
  }

  getTaxFee(payout) {
    let tax_fee = parseInt(payout*this.app.config.paramConf.tax_pencent) ;
    if(tax_fee < this.app.config.paramConf.min_tax) {
      tax_fee = this.app.config.paramConf.min_tax ;
    }
    return tax_fee ;
  }
}

module.exports = MinuteTask;
