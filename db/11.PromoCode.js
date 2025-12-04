"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
	class PromoCode extends Model {
		static associate(models) {
			PromoCode.belongsTo(models.Category, {
				foreignKey: "applicableCategoryId",
				as: "category",
			});
			PromoCode.belongsTo(models.Product, {
				foreignKey: "applicableProductId",
				as: "product",
			});
		}

		// Calculate discounted price
		apply(originalPrice) {
			if (this.discountType === "percent") {
				const discount = (originalPrice * this.discountValue) / 100;
				return Math.max(0, originalPrice - discount);
			} else if (this.discountType === "fixed") {
				return Math.max(0, originalPrice - this.discountValue);
			}
			return originalPrice;
		}

		// Check if promo code is valid
		isValid() {
			const now = new Date();

			// Check if active
			if (!this.isActive) return false;

			// Check expiration
			if (this.expirationDate && new Date(this.expirationDate) < now) {
				return false;
			}

			// Check usage limit
			if (this.usageLimit && this.timesUsed >= this.usageLimit) {
				return false;
			}

			return true;
		}

		// Check if code can be applied to a specific item
		canApplyToItem(itemType, itemId) {
			if (this.applicableType === "all") {
				return true;
			}

			if (this.applicableType === "category" && itemType === "category") {
				return this.applicableCategoryId === itemId;
			}

			if (this.applicableType === "product" && itemType === "product") {
				return this.applicableProductId === itemId;
			}

			return false;
		}

		// Check minimum purchase requirement
		meetsMinimumPurchase(amount) {
			if (!this.minPurchaseAmount) return true;
			return amount >= this.minPurchaseAmount;
		}

		// Increment usage counter
		async redeem() {
			this.timesUsed = (this.timesUsed || 0) + 1;
			await this.save();
		}
	}

	PromoCode.init(
		{
			code: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			discountType: {
				type: DataTypes.ENUM("fixed", "percent"),
				allowNull: false,
				defaultValue: "percent",
			},
			discountValue: {
				type: DataTypes.FLOAT,
				allowNull: false,
				validate: {
					min: 0,
				},
			},
			applicableType: {
				type: DataTypes.ENUM("all", "category", "product"),
				allowNull: false,
				defaultValue: "all",
			},
			applicableCategoryId: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			applicableProductId: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			minPurchaseAmount: {
				type: DataTypes.FLOAT,
				allowNull: true,
				defaultValue: 0,
			},
			expirationDate: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			usageLimit: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			maxUsesPerUser: {
				type: DataTypes.INTEGER,
				allowNull: true,
				defaultValue: 1,
			},
			timesUsed: {
				type: DataTypes.INTEGER,
				defaultValue: 0,
			},
			isActive: {
				type: DataTypes.BOOLEAN,
				defaultValue: true,
			},
		},
		{
			sequelize,
			modelName: "PromoCode",
		}
	);

	return PromoCode;
};
