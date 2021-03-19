'use strict';

// had enabled by egg
// exports.static = true;

const path = require('path');

// exports.web3 = {
//   enable: false,
//   // package: 'egg-web3'
//   path: path.join(__dirname, '../plugin/egg-web3'),
// };

// exports.bcsEthereum = {
//   enable: true,
//   // package: 'egg-bcs-ethereum',
//   path: path.join(__dirname, '../lib/plugin/egg-bcs-ethereum'),
// };

// exports.sequelize = {
//   enable: true,
//   package: 'egg-sequelize',
// };

exports.cors = {
  enable: true,
  package: 'egg-cors',
};
