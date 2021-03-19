const Subscription = require("egg").Subscription;
/**
 * every day
 */
class DayChange extends Subscription {
  static get schedule() {
    return {
      cron: '5 0 * * * *',
      type: "worker",
    };
  }

  async subscribe() {
    if(this.app.DayChangeIP)
    {
      this.logger.info(`[DAY CHANGE] Is running, cancel...`);
      return
    }

    this.app.DayChangeIP = true;
    
    try{
      let weekDay = new Date().getDay() ;
      if(weekDay % 2 == 0) { // Tue, Thu, Sat
        for(let i = 0 ; i < this.app.WebList.length ; i ++) {
          let tmpWeb = this.app.WebList[i] ;
          let ret2 = await this.ctx.curl('https://api.trongrid.io/wallet/withdrawbalance', {
                  method: 'POST',
                  dataType: 'json',
                  data: {"owner_address":tmpWeb.defaultAddress.base58,"visible":true},
                  headers: {
                      'Content-Type': 'application/json; charset=utf-8',
                  },
                  timeout: 30000,
              });
          this.logger.info(ret2.data);
          let tradeobj = JSON.parse(ret2.data) ; // await tmpWeb.transactionBuilder.withdrawBalance();
          let signedtxn = await tmpWeb.trx.sign(tradeobj);
          let receipt = await tmpWeb.trx.sendRawTransaction(signedtxn);
          this.logger.info(receipt) ;
        }
      }
    }catch(error)
    {
      this.logger.info(`[DAY CHANGE] ERROR:${error}`);
    }finally{
      this.app.DayChangeIP = false ;
    }
  }
}

module.exports = DayChange;
