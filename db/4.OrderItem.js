'use strict';
import { Model } from 'sequelize';
export default (sequelize, DataTypes) => {
  class OrderItem extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }
  OrderItem.init(
    {
      quantity: DataTypes.INTEGER,
      price: DataTypes.DECIMAL(10, 2),
      orderId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Orders',
          key: 'id'
        }
      },
      productId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Products',
          key: 'id'
        }
      }
    },
    {
      sequelize,
      modelName: 'OrderItem',
    }
  );
  return OrderItem;
};