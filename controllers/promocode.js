import asyncHandler from "../middlewares/async.js";
import ErrorResponse from "../utils/errorResponse.js";

// @desc    Get all promo codes
// @route   GET /api/v1/promocodes
// @access  Admin
export const getPromoCodes = asyncHandler(async (req, res, next) => {
	const { PromoCode, Category, Product } = req.db.ecommerce.models;

	const promoCodes = await PromoCode.findAll({
		include: [
			{ model: Category, as: "category" },
			{ model: Product, as: "product" },
		],
		order: [["createdAt", "DESC"]],
	});

	res.status(200).json({
		success: true,
		count: promoCodes.length,
		data: promoCodes,
	});
});

// @desc    Get single promo code
// @route   GET /api/v1/promocodes/:id
// @access  Admin
export const getPromoCode = asyncHandler(async (req, res, next) => {
	const { PromoCode, Category, Product } = req.db.ecommerce.models;

	const promoCode = await PromoCode.findByPk(req.params.id, {
		include: [
			{ model: Category, as: "category" },
			{ model: Product, as: "product" },
		],
	});

	if (!promoCode) {
		return next(new ErrorResponse("Промо код олдсонгүй", 404));
	}

	res.status(200).json({
		success: true,
		data: promoCode,
	});
});

// @desc    Create promo code
// @route   POST /api/v1/promocodes
// @access  Admin
export const createPromoCode = asyncHandler(async (req, res, next) => {
	const { PromoCode } = req.db.ecommerce.models;
	const {
		code,
		description,
		discountType,
		discountValue,
		applicableType,
		applicableCategoryId,
		applicableProductId,
		minPurchaseAmount,
		expirationDate,
		usageLimit,
		maxUsesPerUser,
		isActive,
	} = req.body;

	// Validate discount value
	if (discountType === "percent" && discountValue > 100) {
		return next(new ErrorResponse("Хувийн хөнгөлөлт 100-аас ихгүй байх ёстой", 400));
	}

	// Check for duplicate code
	const existing = await PromoCode.findOne({ where: { code: code.toUpperCase() } });
	if (existing) {
		return next(new ErrorResponse("Энэ код аль хэдийн бүртгэгдсэн байна", 400));
	}

	const promoCode = await PromoCode.create({
		code: code.toUpperCase(),
		description,
		discountType,
		discountValue,
		applicableType,
		applicableCategoryId: applicableType === "category" ? applicableCategoryId : null,
		applicableProductId: applicableType === "product" ? applicableProductId : null,
		minPurchaseAmount,
		expirationDate,
		usageLimit,
		maxUsesPerUser,
		isActive: isActive !== undefined ? isActive : true,
	});

	res.status(201).json({
		success: true,
		data: promoCode,
	});
});

// @desc    Update promo code
// @route   PUT /api/v1/promocodes/:id
// @access  Admin
export const updatePromoCode = asyncHandler(async (req, res, next) => {
	const { PromoCode } = req.db.ecommerce.models;

	let promoCode = await PromoCode.findByPk(req.params.id);

	if (!promoCode) {
		return next(new ErrorResponse("Промо код олдсонгүй", 404));
	}

	const {
		code,
		description,
		discountType,
		discountValue,
		applicableType,
		applicableCategoryId,
		applicableProductId,
		minPurchaseAmount,
		expirationDate,
		usageLimit,
		maxUsesPerUser,
		isActive,
	} = req.body;

	// Validate discount value
	if (discountType === "percent" && discountValue > 100) {
		return next(new ErrorResponse("Хувийн хөнгөлөлт 100-аас ихгүй байх ёстой", 400));
	}

	// Check for duplicate code (excluding current)
	if (code && code.toUpperCase() !== promoCode.code) {
		const existing = await PromoCode.findOne({ where: { code: code.toUpperCase() } });
		if (existing) {
			return next(new ErrorResponse("Энэ код аль хэдийн бүртгэгдсэн байна", 400));
		}
	}

	await promoCode.update({
		code: code ? code.toUpperCase() : promoCode.code,
		description,
		discountType,
		discountValue,
		applicableType,
		applicableCategoryId: applicableType === "category" ? applicableCategoryId : null,
		applicableProductId: applicableType === "product" ? applicableProductId : null,
		minPurchaseAmount,
		expirationDate,
		usageLimit,
		maxUsesPerUser,
		isActive,
	});

	res.status(200).json({
		success: true,
		data: promoCode,
	});
});

// @desc    Delete promo code
// @route   DELETE /api/v1/promocodes/:id
// @access  Admin
export const deletePromoCode = asyncHandler(async (req, res, next) => {
	const { PromoCode } = req.db.ecommerce.models;

	const promoCode = await PromoCode.findByPk(req.params.id);

	if (!promoCode) {
		return next(new ErrorResponse("Промо код олдсонгүй", 404));
	}

	await promoCode.destroy();

	res.status(200).json({
		success: true,
		data: {},
	});
});

// @desc    Validate promo code
// @route   POST /api/v1/promocodes/validate
// @access  Public
export const validatePromoCode = asyncHandler(async (req, res, next) => {
	const { PromoCode, Product, Category } = req.db.ecommerce.models;
	const { code, cartTotal, cartItems } = req.body;

	if (!code) {
		return next(new ErrorResponse("Промо код оруулна уу", 400));
	}

	const promoCode = await PromoCode.findOne({
		where: { code: code.toUpperCase() },
		include: [
			{ model: Category, as: "category" },
			{ model: Product, as: "product" },
		],
	});

	if (!promoCode) {
		return next(new ErrorResponse("Промо код олдсонгүй", 404));
	}

	// Check if valid
	if (!promoCode.isValid()) {
		if (!promoCode.isActive) {
			return next(new ErrorResponse("Энэ промо код идэвхгүй байна", 400));
		}
		if (promoCode.expirationDate && new Date(promoCode.expirationDate) < new Date()) {
			return next(new ErrorResponse("Энэ промо кодын хугацаа дууссан байна", 400));
		}
		if (promoCode.usageLimit && promoCode.timesUsed >= promoCode.usageLimit) {
			return next(new ErrorResponse("Энэ промо код ашиглах лимит дууссан байна", 400));
		}
	}

	// Check minimum purchase
	if (!promoCode.meetsMinimumPurchase(cartTotal)) {
		return next(
			new ErrorResponse(
				`Захиалгын дүн хамгийн багадаа ${promoCode.minPurchaseAmount}₮ байх ёстой`,
				400
			)
		);
	}

	// Calculate applicable amount based on cart items
	let applicableAmount = cartTotal;

	if (promoCode.applicableType !== "all" && cartItems) {
		applicableAmount = 0;
		for (const item of cartItems) {
			if (promoCode.applicableType === "product" && item.productId === promoCode.applicableProductId) {
				applicableAmount += item.price * item.quantity;
			}
			if (promoCode.applicableType === "category" && item.categoryIds?.includes(promoCode.applicableCategoryId)) {
				applicableAmount += item.price * item.quantity;
			}
		}
	}

	// Calculate discount
	const discountedPrice = promoCode.apply(applicableAmount);
	const discountAmount = applicableAmount - discountedPrice;

	res.status(200).json({
		success: true,
		data: {
			code: promoCode.code,
			discountType: promoCode.discountType,
			discountValue: promoCode.discountValue,
			discountAmount,
			applicableType: promoCode.applicableType,
			originalTotal: cartTotal,
			finalTotal: cartTotal - discountAmount,
		},
	});
});

// @desc    Toggle promo code active status
// @route   PUT /api/v1/promocodes/:id/toggle
// @access  Admin
export const togglePromoCode = asyncHandler(async (req, res, next) => {
	const { PromoCode } = req.db.ecommerce.models;

	const promoCode = await PromoCode.findByPk(req.params.id);

	if (!promoCode) {
		return next(new ErrorResponse("Промо код олдсонгүй", 404));
	}

	await promoCode.update({
		isActive: !promoCode.isActive,
	});

	res.status(200).json({
		success: true,
		data: promoCode,
	});
});
