"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class Session extends Model {
    static associate(models) {
      Session.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
      });
    }
  }
  Session.init(
    {
      userId: DataTypes.INTEGER,
      deviceId: DataTypes.UUID,
      deviceType: DataTypes.STRING,
      sessionToken: DataTypes.STRING,
      trusted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Session",
    },
  );
  return Session;
};
