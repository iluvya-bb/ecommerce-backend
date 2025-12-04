import asyncHandler from "../middlewares/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import { generatePaymentCode } from "../utils/codeGenerator.js";

export const checkout = asyncHandler(async (req, res, next) => {
	const { Order, Product, OrderContact, PaymentRequest, Sale, PromoCode, Category } =
		req.db.ecommerce.models;
	const models = req.db.ecommerce.models;
	const { items, contact, promoCode } = req.body;

	if (!items || items.length === 0) {
		return next(new ErrorResponse("Бүтээгдэхүүн сонгоно уу", 400));
	}
	if (!contact || !contact.name || !contact.address || !contact.phone || !contact.email) {
		return next(
			new ErrorResponse("Холбоо барих мэдээллийг бүрэн оруулна уу", 400)
		);
	}

	// Prepare contact data, prioritizing authenticated user's email
	const contactData = {
		...contact,
		email: req.user ? req.user.email : contact.email,
		createdBy: req.user ? req.user.id : null,
	};

	// Create the contact record
	const orderContact = await OrderContact.create(contactData);

	// Calculate subtotal with sales applied
	let subtotal = 0;
	let totalSaleDiscount = 0;
	const itemsWithPrices = [];

	for (const item of items) {
		const product = await Product.findByPk(item.productId, {
			include: [{ model: Category, as: "categories" }],
		});
		if (!product) {
			return next(new ErrorResponse(`Бүтээгдэхүүн олдсонгүй: ${item.productId}`, 404));
		}

		const originalPrice = parseFloat(product.price);
		let finalPrice = originalPrice;
		let itemSaleDiscount = 0;

		// Apply best sale for this product
		const bestSale = await Sale.getBestSaleForProduct(product.id, originalPrice, models);
		if (bestSale) {
			finalPrice = bestSale.calculateDiscountedPrice(originalPrice);
			itemSaleDiscount = (originalPrice - finalPrice) * item.quantity;
			totalSaleDiscount += itemSaleDiscount;
		}

		subtotal += originalPrice * item.quantity;

		itemsWithPrices.push({
			product,
			quantity: item.quantity,
			originalPrice,
			finalPrice,
			saleDiscount: itemSaleDiscount,
		});
	}

	// Calculate total after sales
	let totalAfterSales = subtotal - totalSaleDiscount;

	// Apply promo code if provided
	let promoDiscount = 0;
	let appliedPromoCode = null;

	if (promoCode) {
		appliedPromoCode = await PromoCode.findOne({
			where: { code: promoCode.toUpperCase() },
		});

		if (!appliedPromoCode) {
			return next(new ErrorResponse("Промо код олдсонгүй", 404));
		}

		if (!appliedPromoCode.isValid()) {
			return next(new ErrorResponse("Промо код хүчингүй эсвэл хугацаа дууссан", 400));
		}

		if (!appliedPromoCode.meetsMinimumPurchase(totalAfterSales)) {
			return next(
				new ErrorResponse(
					`Захиалгын дүн хамгийн багадаа ${appliedPromoCode.minPurchaseAmount}₮ байх ёстой`,
					400
				)
			);
		}

		// Calculate promo discount based on applicable type
		let applicableAmount = totalAfterSales;

		if (appliedPromoCode.applicableType === "product") {
			applicableAmount = 0;
			for (const item of itemsWithPrices) {
				if (item.product.id === appliedPromoCode.applicableProductId) {
					applicableAmount += item.finalPrice * item.quantity;
				}
			}
		} else if (appliedPromoCode.applicableType === "category") {
			applicableAmount = 0;
			for (const item of itemsWithPrices) {
				const categoryIds = item.product.categories?.map((c) => c.id) || [];
				if (categoryIds.includes(appliedPromoCode.applicableCategoryId)) {
					applicableAmount += item.finalPrice * item.quantity;
				}
			}
		}

		if (applicableAmount > 0) {
			const discountedAmount = appliedPromoCode.apply(applicableAmount);
			promoDiscount = applicableAmount - discountedAmount;

			// Redeem the promo code
			await appliedPromoCode.redeem();
		}
	}

	// Calculate final total
	const total = totalAfterSales - promoDiscount;
	const vat = total * 0.1;

	// Create the order
	const order = await Order.create({
		userId: req.user ? req.user.id : null,
		contactId: orderContact.id,
		subtotal,
		saleDiscount: totalSaleDiscount,
		promoDiscount,
		promoCodeId: appliedPromoCode?.id || null,
		promoCodeUsed: appliedPromoCode?.code || null,
		total,
		vat,
	});

	// Add items to the order
	for (const item of itemsWithPrices) {
		await order.addProduct(item.product, {
			through: {
				quantity: item.quantity,
				price: item.finalPrice, // Store the price after sale discount
			},
		});
	}

	// Generate a unique payment code
	const paymentCode = await generatePaymentCode(req.db);

	await PaymentRequest.create({
		orderId: order.id,
		amount: order.total,
		code: paymentCode,
	});

	res.status(201).json({
		success: true,
		data: {
			...order.toJSON(),
			subtotal,
			saleDiscount: totalSaleDiscount,
			promoDiscount,
			promoCodeUsed: appliedPromoCode?.code || null,
			total,
			vat,
		},
	});
});
