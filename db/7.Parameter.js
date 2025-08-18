'use strict';
import { Model } from 'sequelize';
export default (sequelize, DataTypes) => {
  class Parameter extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }
  Parameter.init(
    {
      key: DataTypes.STRING,
      value: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'Parameter',
    }
  );
  return Parameter;
};