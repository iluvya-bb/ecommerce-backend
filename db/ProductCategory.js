"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
	class ProductCategory extends Model {
		static associate(models) {
			// define association here
		}
	}
	ProductCategory.init(
		{
			productId: {
				type: DataTypes.INTEGER,
				references: {
					model: "Products",
					key: "id",
				},
			},
			categoryId: {
				type: DataTypes.INTEGER,
				references: {
					model: "Categories",
					key: "id",
				},
			},
		},
		{
			sequelize,
			modelName: "ProductCategory",
		}
	);
	return ProductCategory;
};
