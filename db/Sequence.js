"use strict";
import { Model, DataTypes } from "sequelize";
export default (sequelize) => {
	class Sequence extends Model {}
	Sequence.init(
		{
			date: {
				type: DataTypes.STRING,
				primaryKey: true,
			},
			value: {
				type: DataTypes.INTEGER,
				defaultValue: 1,
			},
		},
		{
			sequelize,
			modelName: "Sequence",
			timestamps: false,
		}
	);
	return Sequence;
};
