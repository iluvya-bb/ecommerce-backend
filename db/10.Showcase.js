"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
	class Showcase extends Model {
		static associate(models) {
			// define association here
		}
	}
	Showcase.init(
		{
			title: DataTypes.STRING,
			description: DataTypes.TEXT,
			imageUrl: DataTypes.STRING,
			link: DataTypes.STRING,
			isActive: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
			},
		},
		{
			sequelize,
			modelName: "Showcase",
		},
	);
	return Showcase;
};
