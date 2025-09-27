"use strict";
import { Model } from "sequelize";
import slugify from "sequelize-slugify";

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
      slug: {
        type: DataTypes.STRING,
        unique: true,
      },
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
      isShowcased: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Category",
    },
  );

  slugify.slugifyModel(Category, {
    source: ['name'],
    slugOptions: { lower: true },
    overwrite: false,
    column: 'slug'
  });

  return Category;
};
