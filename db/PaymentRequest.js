"use strict";
import { Model, DataTypes } from "sequelize";
export default (sequelize) => {
	class PaymentRequest extends Model {
		static associate(models) {
			PaymentRequest.belongsTo(models.Order, {
				foreignKey: "orderId",
				as: "order",
			});
		}
	}
	PaymentRequest.init(
		{
			id: {
				type: DataTypes.UUID,
				defaultValue: DataTypes.UUIDV4,
				primaryKey: true,
			},
			orderId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			amount: {
				type: DataTypes.DECIMAL(10, 2),
				allowNull: false,
			},
			paymentType: {
				type: DataTypes.STRING,
				allowNull: true, // Can be null until paid
			},
			status: {
				type: DataTypes.STRING,
				defaultValue: "Pending", // Pending, Paid
			},
			paidDate: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			code: {
				type: DataTypes.STRING,
				unique: true,
			},
		},
		{
			sequelize,
			modelName: "PaymentRequest",
			updatedAt: false, // No need for an updated at field
		}
	);
	return PaymentRequest;
};
