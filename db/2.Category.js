"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      Category.belongsToMany(models.Product, {
        through: models.ProductCategory,
        foreignKey: 'categoryId',
        as: 'products',
      });
      Category.hasMany(models.Image, {
        foreignKey: "categoryId",
        as: "images",
      });
    }
  }
  Category.init(
    {
      name: DataTypes.STRING,
      description: DataTypes.TEXT,
      isFeatured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      isVisible: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      imgUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Category",
    },
  );
  return Category;
};
