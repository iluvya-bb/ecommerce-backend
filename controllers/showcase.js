import asyncHandler from "../middlewares/async.js";
import ErrorResponse from "../utils/errorResponse.js";

// For admins - get all showcase items
export const getShowcasesAdmin = asyncHandler(async (req, res, next) => {
	const { Showcase } = req.db.ecommerce.models;
	const showcases = await Showcase.findAll();
	res.status(200).json({ success: true, data: showcases });
});

// For public - get only active showcase items
export const getShowcasedCategories = asyncHandler(async (req, res, next) => {
	const { Category } = req.db.ecommerce.models;
	const categories = await Category.findAll({ where: { isShowcased: true } });
	res.status(200).json({ success: true, data: categories });
});

// Get a single showcase item by slug
export const getShowcaseBySlug = asyncHandler(async (req, res, next) => {
	const { Category, Product } = req.db.ecommerce.models;
	const category = await Category.findOne({
		where: { slug: req.params.slug },
		include: [
			{
				model: Product,
				as: "products",
			},
		],
	});
	if (!category) {
		return next(
			new ErrorResponse(
				`Showcase not found with slug of ${req.params.slug}`,
				404,
			),
		);
	}
	res.status(200).json({ success: true, data: category });
});

// Create a showcase item
export const createShowcase = asyncHandler(async (req, res, next) => {
	const { Showcase } = req.db.ecommerce.models;
	const { title, description, link, isActive } = req.body;

	let imageUrl = null;
	if (req.files && req.files.length > 0) {
		imageUrl = req.files[0].path;
	}

	const showcase = await Showcase.create({
		title,
		description,
		link,
		isActive,
		imageUrl,
	});

	res.status(201).json({ success: true, data: showcase });
});

// Update a showcase item
export const updateShowcase = asyncHandler(async (req, res, next) => {
	const { Showcase } = req.db.ecommerce.models;
	let showcase = await Showcase.findByPk(req.params.id);
	if (!showcase) {
		return next(
			new ErrorResponse(`Showcase not found with id of ${req.params.id}`, 404),
		);
	}

	if (req.files && req.files.length > 0) {
		req.body.imageUrl = req.files[0].path;
	}

	showcase = await showcase.update(req.body);

	res.status(200).json({ success: true, data: showcase });
});

// Delete a showcase item
export const deleteShowcase = asyncHandler(async (req, res, next) => {
	const { Showcase } = req.db.ecommerce.models;
	const showcase = await Showcase.findByPk(req.params.id);
	if (!showcase) {
		return next(
			new ErrorResponse(`Showcase not found with id of ${req.params.id}`, 404),
		);
	}
	await showcase.destroy();
	res.status(200).json({ success: true, data: {} });
});
