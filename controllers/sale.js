import { Op } from "sequelize";
import asyncHandler from "../middlewares/async.js";
import ErrorResponse from "../utils/errorResponse.js";

// @desc    Get all sales (admin)
// @route   GET /api/v1/sales
// @access  Admin
export const getSales = asyncHandler(async (req, res, next) => {
	const { Sale, Category, Product } = req.db.ecommerce.models;

	const sales = await Sale.findAll({
		order: [
			["isEnabled", "DESC"],
			["priority", "DESC"],
			["createdAt", "DESC"],
		],
	});

	// Enrich with target details
	const enrichedSales = await Promise.all(
		sales.map(async (sale) => {
			const saleData = sale.toJSON();
			if (sale.targetType === "category" && sale.targetId) {
				const category = await Category.findByPk(sale.targetId);
				saleData.targetName = category?.name || "Устгагдсан";
			} else if (sale.targetType === "product" && sale.targetId) {
				const product = await Product.findByPk(sale.targetId);
				saleData.targetName = product?.name || "Устгагдсан";
			} else {
				saleData.targetName = "Бүх бүтээгдэхүүн";
			}
			return saleData;
		})
	);

	res.status(200).json({
		success: true,
		count: sales.length,
		data: enrichedSales,
	});
});

// @desc    Get single sale
// @route   GET /api/v1/sales/:id
// @access  Admin
export const getSale = asyncHandler(async (req, res, next) => {
	const { Sale, Category, Product } = req.db.ecommerce.models;

	const sale = await Sale.findByPk(req.params.id);

	if (!sale) {
		return next(new ErrorResponse("Хямдрал олдсонгүй", 404));
	}

	const saleData = sale.toJSON();

	// Get target details
	if (sale.targetType === "category" && sale.targetId) {
		const category = await Category.findByPk(sale.targetId);
		saleData.targetName = category?.name;
	} else if (sale.targetType === "product" && sale.targetId) {
		const product = await Product.findByPk(sale.targetId);
		saleData.targetName = product?.name;
	}

	res.status(200).json({
		success: true,
		data: saleData,
	});
});

// @desc    Create sale
// @route   POST /api/v1/sales
// @access  Admin
export const createSale = asyncHandler(async (req, res, next) => {
	const { Sale } = req.db.ecommerce.models;
	const {
		title,
		description,
		targetType,
		targetId,
		discountType,
		discountValue,
		maxDiscountAmount,
		startDate,
		endDate,
		isEnabled,
		priority,
		badgeText,
	} = req.body;

	// Validate discount value
	if (discountType === "percentage" && discountValue > 100) {
		return next(new ErrorResponse("Хувийн хөнгөлөлт 100-аас ихгүй байх ёстой", 400));
	}

	// Handle banner image
	let bannerImage = null;
	if (req.file) {
		bannerImage = req.file.path;
	}

	const sale = await Sale.create({
		title,
		description,
		targetType,
		targetId: targetType !== "all" ? targetId : null,
		discountType,
		discountValue,
		maxDiscountAmount,
		startDate: startDate || null,
		endDate: endDate || null,
		isEnabled: isEnabled !== undefined ? isEnabled : true,
		priority: priority || 0,
		bannerImage,
		badgeText,
	});

	res.status(201).json({
		success: true,
		data: sale,
	});
});

// @desc    Update sale
// @route   PUT /api/v1/sales/:id
// @access  Admin
export const updateSale = asyncHandler(async (req, res, next) => {
	const { Sale } = req.db.ecommerce.models;

	let sale = await Sale.findByPk(req.params.id);

	if (!sale) {
		return next(new ErrorResponse("Хямдрал олдсонгүй", 404));
	}

	const {
		title,
		description,
		targetType,
		targetId,
		discountType,
		discountValue,
		maxDiscountAmount,
		startDate,
		endDate,
		isEnabled,
		priority,
		badgeText,
	} = req.body;

	// Validate discount value
	if (discountType === "percentage" && discountValue > 100) {
		return next(new ErrorResponse("Хувийн хөнгөлөлт 100-аас ихгүй байх ёстой", 400));
	}

	// Handle banner image
	let bannerImage = sale.bannerImage;
	if (req.file) {
		bannerImage = req.file.path;
	}

	await sale.update({
		title,
		description,
		targetType,
		targetId: targetType !== "all" ? targetId : null,
		discountType,
		discountValue,
		maxDiscountAmount,
		startDate: startDate || null,
		endDate: endDate || null,
		isEnabled,
		priority,
		bannerImage,
		badgeText,
	});

	res.status(200).json({
		success: true,
		data: sale,
	});
});

// @desc    Delete sale
// @route   DELETE /api/v1/sales/:id
// @access  Admin
export const deleteSale = asyncHandler(async (req, res, next) => {
	const { Sale } = req.db.ecommerce.models;

	const sale = await Sale.findByPk(req.params.id);

	if (!sale) {
		return next(new ErrorResponse("Хямдрал олдсонгүй", 404));
	}

	await sale.destroy();

	res.status(200).json({
		success: true,
		data: {},
	});
});

// @desc    Toggle sale enabled status
// @route   PUT /api/v1/sales/:id/toggle
// @access  Admin
export const toggleSale = asyncHandler(async (req, res, next) => {
	const { Sale } = req.db.ecommerce.models;

	const sale = await Sale.findByPk(req.params.id);

	if (!sale) {
		return next(new ErrorResponse("Хямдрал олдсонгүй", 404));
	}

	await sale.update({
		isEnabled: !sale.isEnabled,
	});

	res.status(200).json({
		success: true,
		data: sale,
	});
});

// @desc    Get active sales (public)
// @route   GET /api/v1/sales/active
// @access  Public
export const getActiveSales = asyncHandler(async (req, res, next) => {
	const { Sale } = req.db.ecommerce.models;
	const now = new Date();

	const sales = await Sale.findAll({
		where: {
			isEnabled: true,
			[Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: now } }],
			[Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: now } }],
		},
		order: [
			["priority", "DESC"],
			["createdAt", "DESC"],
		],
	});

	res.status(200).json({
		success: true,
		count: sales.length,
		data: sales,
	});
});

// @desc    Get sale price for a product
// @route   GET /api/v1/sales/product/:productId/price
// @access  Public
export const getProductSalePrice = asyncHandler(async (req, res, next) => {
	const { Sale, Product, Category } = req.db.ecommerce.models;
	const models = req.db.ecommerce.models;

	const product = await Product.findByPk(req.params.productId, {
		include: [{ model: Category, as: "categories" }],
	});

	if (!product) {
		return next(new ErrorResponse("Бүтээгдэхүүн олдсонгүй", 404));
	}

	const bestSale = await Sale.getBestSaleForProduct(
		product.id,
		parseFloat(product.price),
		models
	);

	if (!bestSale) {
		return res.status(200).json({
			success: true,
			data: {
				productId: product.id,
				originalPrice: parseFloat(product.price),
				salePrice: null,
				sale: null,
			},
		});
	}

	const salePrice = bestSale.calculateDiscountedPrice(parseFloat(product.price));

	res.status(200).json({
		success: true,
		data: {
			productId: product.id,
			originalPrice: parseFloat(product.price),
			salePrice,
			discountAmount: parseFloat(product.price) - salePrice,
			sale: {
				id: bestSale.id,
				title: bestSale.title,
				discountType: bestSale.discountType,
				discountValue: bestSale.discountValue,
				badgeText: bestSale.badgeText,
				endDate: bestSale.endDate,
			},
		},
	});
});

// @desc    Get all products with sale prices
// @route   GET /api/v1/sales/products-with-prices
// @access  Public
export const getProductsWithSalePrices = asyncHandler(async (req, res, next) => {
	const { Sale, Product, Category } = req.db.ecommerce.models;
	const models = req.db.ecommerce.models;

	const products = await Product.findAll({
		where: { isVisible: true },
		include: [
			{ model: Category, as: "categories", through: { attributes: [] } },
			"images",
		],
	});

	const productsWithPrices = await Promise.all(
		products.map(async (product) => {
			const productData = product.toJSON();
			const bestSale = await Sale.getBestSaleForProduct(
				product.id,
				parseFloat(product.price),
				models
			);

			if (bestSale) {
				const salePrice = bestSale.calculateDiscountedPrice(parseFloat(product.price));
				productData.salePrice = salePrice;
				productData.discountAmount = parseFloat(product.price) - salePrice;
				productData.sale = {
					id: bestSale.id,
					title: bestSale.title,
					discountType: bestSale.discountType,
					discountValue: bestSale.discountValue,
					badgeText: bestSale.badgeText,
					endDate: bestSale.endDate,
				};
			} else {
				productData.salePrice = null;
				productData.sale = null;
			}

			return productData;
		})
	);

	res.status(200).json({
		success: true,
		count: productsWithPrices.length,
		data: productsWithPrices,
	});
});
