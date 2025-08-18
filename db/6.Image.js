'use strict';
import { Model } from 'sequelize';
export default (sequelize, DataTypes) => {
  class Image extends Model {
    static associate(models) {
      Image.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
      Image.belongsTo(models.Category, { foreignKey: 'categoryId', as: 'category' });
    }
  }
  Image.init(
    {
      url: DataTypes.STRING,
      productId: DataTypes.INTEGER,
      categoryId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'Image',
    }
  );
  return Image;
};