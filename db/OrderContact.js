"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
	class OrderContact extends Model {
		static associate(models) {
			OrderContact.belongsTo(models.User, {
				foreignKey: "createdBy",
				as: "user",
			});
		}
	}
	OrderContact.init(
		{
			name: DataTypes.STRING,
			address: DataTypes.STRING,
			phone: DataTypes.STRING,
			email: {
				type: DataTypes.STRING,
				allowNull: true,
				validate: {
					isEmail: true,
				},
			},
			createdBy: {
				type: DataTypes.INTEGER,
				allowNull: true, // Can be null for guest orders
			},
		},
		{
			sequelize,
			modelName: "OrderContact",
		}
	);
	return OrderContact;
};
