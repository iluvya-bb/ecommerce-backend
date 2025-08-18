import asyncHandler from "../middlewares/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import fs from "fs";
import path from "path";

export const getCategories = asyncHandler(async (req, res, next) => {
	const { Category } = req.db.ecommerce.models;
	const categories = await Category.findAll({
		where: { isVisible: true },
		include: ["images"],
	});
	res.status(200).json({ success: true, data: categories });
});

export const getCategory = asyncHandler(async (req, res, next) => {
	const { Category } = req.db.ecommerce.models;
	const category = await Category.findByPk(req.params.id, {
		include: ["images"],
	});
	if (!category) {
		return next(
			new ErrorResponse(`Category not found with id of ${req.params.id}`, 404),
		);
	}
	res.status(200).json({ success: true, data: category });
});

export const createCategory = asyncHandler(async (req, res, next) => {
	const { Category } = req.db.ecommerce.models;
	const { name, description, isFeatured, isVisible } = req.body;

	let imgUrl = null;
	if (req.files && req.files.length > 0) {
		imgUrl = req.files[0].path;
	}

	const category = await Category.create({
		name,
		description,
		isFeatured,
		isVisible,
		imgUrl,
	});

	res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req, res, next) => {
	const { Category, Image } = req.db.ecommerce.models;
	let category = await Category.findByPk(req.params.id);
	if (!category) {
		return next(
			new ErrorResponse(`Category not found with id of ${req.params.id}`, 404),
		);
	}

	if (req.files && req.files.length > 0) {
		req.body.imgUrl = req.files[0].path;
		// Optionally, delete the old image file from storage here
	}

	category = await category.update(req.body);

	res.status(200).json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req, res, next) => {
	const { Category } = req.db.ecommerce.models;
	const category = await Category.findByPk(req.params.id);
	if (!category) {
		return next(
			new ErrorResponse(`Category not found with id of ${req.params.id}`, 404),
		);
	}
	await category.destroy();
	res.status(200).json({ success: true, data: {} });
});

export const deleteCategoryImage = asyncHandler(async (req, res, next) => {
	const { Image } = req.db.ecommerce.models;
	const categoryId = req.params.id;

	const image = await Image.findOne({ where: { categoryId: categoryId } });

	if (!image) {
		return next(
			new ErrorResponse(`No image found for category with id of ${categoryId}`, 404)
		);
	}

	// Construct file path
	const filePath = path.join(process.cwd(), image.url);

	// Delete file from filesystem
	fs.unlink(filePath, (err) => {
		if (err) {
			// Log the error but don't block the db deletion
			console.error(`Failed to delete image file: ${filePath}`, err);
		}
	});

	// Delete image from database
	await image.destroy();

	res.status(200).json({ success: true, data: {} });
});
