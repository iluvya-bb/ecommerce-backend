'use strict';
import { Model } from 'sequelize';
export default (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
        allowNull: true,
      });
      Order.belongsTo(models.OrderContact, {
        foreignKey: 'contactId',
        as: 'contact',
      });
      Order.hasOne(models.PaymentRequest, {
        foreignKey: 'orderId',
        as: 'paymentRequest',
      });
      Order.belongsToMany(models.Product, {
        through: models.OrderItem,
        foreignKey: "orderId",
        otherKey: "productId",
        as: "products",
      });
      Order.belongsTo(models.PromoCode, {
        foreignKey: 'promoCodeId',
        as: 'promoCode',
        allowNull: true,
      });
    }
  }
  Order.init(
    {
      status: {
        type: DataTypes.STRING,
        defaultValue: "Awaiting Payment", // Awaiting payment, Shipped, Processing, Done
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      saleDiscount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
      promoDiscount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
      promoCodeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      promoCodeUsed: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      total: DataTypes.DECIMAL(10, 2),
      vat: DataTypes.DECIMAL(10, 2),
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Order',
    }
  );
  return Order;
};
