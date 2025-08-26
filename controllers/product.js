import { Op } from "sequelize";
import asyncHandler from "../middlewares/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import fs from "fs";
import path from "path";

export const getProducts = asyncHandler(async (req, res, next) => {
	const { Product, Category } = req.db.ecommerce.models;
	const { categoryId, q, minPrice, maxPrice, orderBy, order } = req.query;

	let options = {
		include: [
			{
				model: Category,
				as: "categories",
				through: { attributes: [] }, // Exclude join table attributes
			},
			"images",
		],
		where: {},
		order: [["name", "ASC"]],
	};

	if (categoryId) {
		options.include[0].where = { id: categoryId };
	}

	if (q) {
		options.where.name = {
			[Op.like]: `%${q}%`,
		};
	}

	if (minPrice) {
		options.where.price = {
			...options.where.price,
			[Op.gte]: minPrice,
		};
	}

	if (maxPrice) {
		options.where.price = {
			...options.where.price,
			[Op.lte]: maxPrice,
		};
	}

	if (orderBy && order) {
		const allowedOrderFields = ["name", "price", "stock"];
		const isOrderAllowed = allowedOrderFields.includes(orderBy);
		const isDirectionAllowed = ["ASC", "DESC"].includes(order.toUpperCase());

		if (isOrderAllowed && isDirectionAllowed) {
			options.order = [[orderBy, order.toUpperCase()]];
		}
	}

	const products = await Product.findAll(options);
	res.status(200).json({ success: true, data: products });
});

export const getProduct = asyncHandler(async (req, res, next) => {
	const { Product, Category } = req.db.ecommerce.models;
	const product = await Product.findByPk(req.params.id, {
		include: [
			{
				model: Category,
				as: "categories",
				through: { attributes: [] },
			},
			"images",
		],
	});
	if (!product) {
		return next(
			new ErrorResponse(`Product not found with id of ${req.params.id}`, 404),
		);
	}
	res.status(200).json({ success: true, data: product });
});

export const createProduct = asyncHandler(async (req, res, next) => {
	const { Product, Image } = req.db.ecommerce.models;
	const { categoryIds, ...productData } = req.body;

	// Validation: Ensure at least one image is being uploaded for a new product
	if (!req.files || req.files.length === 0) {
		return next(new ErrorResponse("Please upload at least one image", 400));
	}

	const product = await Product.create(productData);

	if (categoryIds) {
		const parsedCategoryIds = JSON.parse(categoryIds);
		if (parsedCategoryIds.length > 0) {
			await product.setCategories(parsedCategoryIds);
		}
	}

	if (req.files) {
		for (const file of req.files) {
			await Image.create({ url: file.path, productId: product.id });
		}
	}

	// Check if featuredImage is set, if not, set the first uploaded image
	if (!product.featuredImage && req.files && req.files.length > 0) {
		product.featuredImage = req.files[0].path;
		await product.save();
	}

	res.status(201).json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req, res, next) => {
	const { Product, Image } = req.db.ecommerce.models;
	let product = await Product.findByPk(req.params.id);
	if (!product) {
		return next(
			new ErrorResponse(`Product not found with id of ${req.params.id}`, 404),
		);
	}
	const { categoryIds, ...productData } = req.body;

	// Validation: Ensure the product will have at least one image
	const existingImages = await product.getImages();
	if (existingImages.length === 0 && (!req.files || req.files.length === 0)) {
		return next(new ErrorResponse("Please upload at least one image", 400));
	}

	product = await product.update(productData);

	if (categoryIds) {
		const parsedCategoryIds = JSON.parse(categoryIds);
		await product.setCategories(parsedCategoryIds);
	}

	if (req.files) {
		for (const file of req.files) {
			await Image.create({ url: file.path, productId: product.id });
		}
	}

	// Check if featuredImage is set, if not, set the first available image
	if (!product.featuredImage) {
		const images = await product.getImages();
		if (images && images.length > 0) {
			product.featuredImage = images[0].url;
			await product.save();
		}
	}

	res.status(200).json({ success: true, data: product });
});

export const deleteProduct = asyncHandler(async (req, res, next) => {
	const { Product } = req.db.ecommerce.models;
	const product = await Product.findByPk(req.params.id);
	if (!product) {
		return next(
			new ErrorResponse(`Product not found with id of ${req.params.id}`, 404),
		);
	}
	await product.destroy();
	res.status(200).json({ success: true, data: {} });
});

export const deleteProductImage = asyncHandler(async (req, res, next) => {
	const { Image } = req.db.ecommerce.models;
	const { imageId } = req.params;

	const image = await Image.findByPk(imageId);

	if (!image) {
		return next(new ErrorResponse(`Image not found with id of ${imageId}`, 404));
	}

	// Construct file path and delete file
	const filePath = path.join(process.cwd(), image.url);
	fs.unlink(filePath, (err) => {
		if (err) {
			console.error(`Failed to delete image file: ${filePath}`, err);
		}
	});

	await image.destroy();

	res.status(200).json({ success: true, data: {} });
});

export const setFeaturedImage = asyncHandler(async (req, res, next) => {
	const { Product, Image } = req.db.ecommerce.models;
	const productId = req.params.id;
	const { imageId } = req.body;

	const product = await Product.findByPk(productId);
	if (!product) {
		return next(new ErrorResponse(`Product not found with id of ${productId}`, 404));
	}

	const image = await Image.findByPk(imageId);
	if (!image || image.productId !== parseInt(productId)) {
		return next(new ErrorResponse(`Image not found or does not belong to this product`, 404));
	}

	product.featuredImage = image.url;
	await product.save();

	res.status(200).json({ success: true, data: product });
});
