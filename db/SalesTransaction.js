"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
	class SalesTransaction extends Model {
		static associate(models) {
			// Association with Order
			SalesTransaction.belongsTo(models.Order, {
				foreignKey: "orderId",
				as: "order",
			});

			// Association with User (customer)
			SalesTransaction.belongsTo(models.User, {
				foreignKey: "userId",
				as: "user",
			});

			// Association with PaymentRequest
			SalesTransaction.belongsTo(models.PaymentRequest, {
				foreignKey: "paymentRequestId",
				as: "paymentRequest",
			});
		}
	}

	SalesTransaction.init(
		{
			// Transaction type
			type: {
				type: DataTypes.ENUM(
					"order_payment",      // Customer paid for an order
					"qpay_payment",       // Payment via QPay
					"bank_transfer",      // Payment via bank transfer
					"refund",             // Refund to customer
					"discount",           // Discount applied (for tracking)
					"shipping_fee",       // Shipping fee collected
					"cancelled"           // Cancelled order
				),
				allowNull: false,
			},

			// Amount of this transaction
			amount: {
				type: DataTypes.DECIMAL(12, 2),
				allowNull: false,
			},

			// Currency
			currency: {
				type: DataTypes.STRING(3),
				allowNull: false,
				defaultValue: "MNT",
			},

			// Description
			description: {
				type: DataTypes.STRING,
				allowNull: true,
			},

			// Order reference
			orderId: {
				type: DataTypes.INTEGER,
				allowNull: true,
				references: {
					model: "Orders",
					key: "id",
				},
			},

			// Customer reference
			userId: {
				type: DataTypes.INTEGER,
				allowNull: true,
				references: {
					model: "Users",
					key: "id",
				},
			},

			// Payment request reference
			paymentRequestId: {
				type: DataTypes.UUID,
				allowNull: true,
				references: {
					model: "PaymentRequests",
					key: "id",
				},
			},

			// Original amount before any discounts
			originalAmount: {
				type: DataTypes.DECIMAL(12, 2),
				allowNull: true,
			},

			// Discount amount if any
			discountAmount: {
				type: DataTypes.DECIMAL(12, 2),
				allowNull: true,
				defaultValue: 0,
			},

			// Payment method used
			paymentMethod: {
				type: DataTypes.STRING,
				allowNull: true,
				comment: "qpay, bank_transfer, cash, etc.",
			},

			// External reference (QPay invoice ID, bank reference, etc.)
			externalReference: {
				type: DataTypes.STRING,
				allowNull: true,
			},

			// Additional metadata
			metadata: {
				type: DataTypes.JSON,
				allowNull: true,
			},

			// Status
			status: {
				type: DataTypes.ENUM("pending", "completed", "failed", "refunded", "cancelled"),
				allowNull: false,
				defaultValue: "completed",
			},

			// Transaction date
			transactionDate: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: DataTypes.NOW,
			},

			// Customer info snapshot (for guest orders)
			customerName: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			customerEmail: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			customerPhone: {
				type: DataTypes.STRING,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "SalesTransaction",
			tableName: "SalesTransactions",
			timestamps: true,
			indexes: [
				{ fields: ["type"] },
				{ fields: ["orderId"] },
				{ fields: ["userId"] },
				{ fields: ["status"] },
				{ fields: ["transactionDate"] },
				{ fields: ["paymentMethod"] },
			],
		},
	);

	return SalesTransaction;
};
