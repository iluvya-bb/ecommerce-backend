'use strict';
import { Model } from 'sequelize';
export default (sequelize, DataTypes) => {
  class Product extends Model {
    static associate(models) {
      Product.belongsToMany(models.Category, {
        through: models.ProductCategory,
        foreignKey: 'productId',
        as: 'categories',
      });
      Product.belongsToMany(models.Order, {
        through: models.OrderItem,
        foreignKey: "productId",
        otherKey: "orderId",
        as: "orders",
      });
      Product.hasMany(models.Image, { foreignKey: 'productId', as: 'images' });
    }
  }
  Product.init(
    {
      name: DataTypes.STRING,
      description: DataTypes.TEXT,
      price: DataTypes.DECIMAL(10, 2),
      stock: DataTypes.INTEGER,
      featuredImage: DataTypes.STRING,
      isFeatured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'Product',
    }
  );
  return Product;
};
