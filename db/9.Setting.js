'use strict';
import { Model } from 'sequelize';
export default (sequelize, DataTypes) => {
  class Setting extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }
  Setting.init(
    {
      key: DataTypes.STRING,
      value: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'Setting',
    }
  );
  return Setting;
};
