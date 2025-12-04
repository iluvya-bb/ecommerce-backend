"use strict";
import { Model, Op } from "sequelize";

export default (sequelize, DataTypes) => {
	class Sale extends Model {
		static associate(models) {
			Sale.belongsTo(models.Product, {
				foreignKey: "targetId",
				as: "targetProduct",
				constraints: false,
			});
			Sale.belongsTo(models.Category, {
				foreignKey: "targetId",
				as: "targetCategory",
				constraints: false,
			});
		}

		// Check if sale is currently active
		isActive() {
			if (!this.isEnabled) return false;

			const now = new Date();

			if (this.startDate && new Date(this.startDate) > now) {
				return false;
			}

			if (this.endDate && new Date(this.endDate) < now) {
				return false;
			}

			return true;
		}

		// Calculate discounted price
		calculateDiscountedPrice(originalPrice) {
			if (!this.isActive()) return originalPrice;

			let discount = 0;

			if (this.discountType === "percentage") {
				discount = (originalPrice * this.discountValue) / 100;
				// Apply max discount cap if set
				if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
					discount = this.maxDiscountAmount;
				}
			} else if (this.discountType === "fixed") {
				discount = this.discountValue;
			}

			return Math.max(0, originalPrice - discount);
		}

		// Get discount amount for a price
		getDiscountAmount(originalPrice) {
			const discountedPrice = this.calculateDiscountedPrice(originalPrice);
			return originalPrice - discountedPrice;
		}

		// Find all active sales for a product
		static async findActiveSalesForProduct(productId, models) {
			const now = new Date();
			const product = await models.Product.findByPk(productId, {
				include: [{ model: models.Category, as: "categories" }],
			});

			if (!product) return [];

			const categoryIds = product.categories?.map((c) => c.id) || [];

			const sales = await Sale.findAll({
				where: {
					isEnabled: true,
					[Op.or]: [
						{ startDate: null },
						{ startDate: { [Op.lte]: now } },
					],
					[Op.or]: [
						{ endDate: null },
						{ endDate: { [Op.gte]: now } },
					],
					[Op.or]: [
						{ targetType: "all" },
						{
							targetType: "product",
							targetId: productId,
						},
						{
							targetType: "category",
							targetId: { [Op.in]: categoryIds },
						},
					],
				},
				order: [
					["priority", "DESC"],
					["createdAt", "DESC"],
				],
			});

			return sales.filter((sale) => sale.isActive());
		}

		// Get the best sale for a product (highest discount)
		static async getBestSaleForProduct(productId, originalPrice, models) {
			const sales = await Sale.findActiveSalesForProduct(productId, models);

			if (sales.length === 0) return null;

			let bestSale = null;
			let bestDiscount = 0;

			for (const sale of sales) {
				const discount = sale.getDiscountAmount(originalPrice);
				if (discount > bestDiscount) {
					bestDiscount = discount;
					bestSale = sale;
				}
			}

			return bestSale;
		}
	}

	Sale.init(
		{
			title: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			targetType: {
				type: DataTypes.ENUM("product", "category", "all"),
				allowNull: false,
				defaultValue: "all",
			},
			targetId: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			discountType: {
				type: DataTypes.ENUM("percentage", "fixed"),
				allowNull: false,
				defaultValue: "percentage",
			},
			discountValue: {
				type: DataTypes.FLOAT,
				allowNull: false,
				validate: {
					min: 0,
				},
			},
			maxDiscountAmount: {
				type: DataTypes.FLOAT,
				allowNull: true,
			},
			startDate: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			endDate: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			isEnabled: {
				type: DataTypes.BOOLEAN,
				defaultValue: true,
			},
			priority: {
				type: DataTypes.INTEGER,
				defaultValue: 0,
			},
			bannerImage: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			badgeText: {
				type: DataTypes.STRING,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "Sale",
			indexes: [
				{
					fields: ["targetType", "targetId"],
				},
				{
					fields: ["isEnabled", "startDate", "endDate"],
				},
			],
		}
	);

	return Sale;
};
