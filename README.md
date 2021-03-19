# egg-web3-demo



## QuickStart

<!-- add docs here for user -->
### egg-web3插件
- 插件路径：/plugin/egg-web3
- 插件配置：config.web3 可参考此demo
- 合约ABI目录：路径可配置 config.web3.abiDir
- 合约address配置：参考config.web3.contractAddress
- 合约事件handler配置：参考config.web3.eventHandler,事件处理逻辑全部放在service内，具体handler的写法，参考此demo的service写法，配置格式为：{`${contractName}.${eventName}`: `${serviceName}.${funcName}`}
- 此框架合约事件处理为阻塞式串行队列，非dev环境下，请在启动时加上--workers=1，表示单进程
- __lastBlock.txt文件路径可配置，参考config.web3.lastBlockRecordPath,注意：此文件请加入.gitignore


see [egg docs][egg] for more detail.

### Development

```bash
$ npm i
$ npm run dev
$ open http://localhost:7001/
```

### Deploy

```bash
$ npm start
$ npm stop
```

### npm scripts

- Use `npm run lint` to check code style.
- Use `npm test` to run unit test.
- Use `npm run autod` to auto detect dependencies upgrade, see [autod](https://www.npmjs.com/package/autod) for more detail.


[egg]: https://eggjs.org