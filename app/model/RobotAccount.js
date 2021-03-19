'use strict';
module.exports = app => {
  const Sequelize = app.Sequelize;
  const { STRING, INTEGER, FLOAT } = Sequelize;

  const Model = app.model.define('robot_account', {
    owner: {
      type: STRING(100),
      set(val) {
        this.setDataValue('owner', val.toLowerCase());
      },
      primaryKey: true,
    },
    private_key: {
      type: STRING(100),
    },
    balance: {
      type: FLOAT,
    },
    type: { // 类型
      type: INTEGER(11),
      defaultValue: 0,
    },
    buy_cnt: {
      type: INTEGER(11),
      defaultValue: 0,
    },
    check_time: {
      type: INTEGER(11),
      defaultValue: 0,
    },
    state: { // 状态
      type: INTEGER(11),
      defaultValue: 0,
    }
  }, {
    timestamps: false,
    freezeTableName: true,
  });

  return Model;
};

