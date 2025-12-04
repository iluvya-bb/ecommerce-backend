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
				allowNull: true, // bank_transfer, qpay
			},
			status: {
				type: DataTypes.STRING,
				defaultValue: "Pending", // Pending, Paid, Failed, Cancelled
			},
			paidDate: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			code: {
				type: DataTypes.STRING,
				unique: true,
			},
			// QPay specific fields
			qpayInvoiceId: {
				type: DataTypes.STRING,
				allowNull: true,
				unique: true,
			},
			qrText: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			qrImage: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			qpayShortUrl: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			urls: {
				type: DataTypes.JSON,
				allowNull: true,
			},
			paymentInfo: {
				type: DataTypes.JSON,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "PaymentRequest",
			timestamps: true,
		}
	);
	return PaymentRequest;
};
