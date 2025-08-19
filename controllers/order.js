import asyncHandler from "../middlewares/async.js";
import ErrorResponse from "../utils/errorResponse.js";

export const getOrders = asyncHandler(async (req, res, next) => {
	const { Order } = req.db.ecommerce.models;
	const orders = await Order.findAll({ where: { userId: req.user.id } });
	res.status(200).json({ success: true, data: orders });
});

export const getOrder = asyncHandler(async (req, res, next) => {
	const { Order } = req.db.ecommerce.models;
	const order = await Order.findOne({
		where: { id: req.params.id, userId: req.user.id },
		include: ["user", "products"],
	});
	if (!order) {
		return next(
			new ErrorResponse(`Order not found with id of ${req.params.id}`, 404),
		);
	}
	res.status(200).json({ success: true, data: order });
});

export const createOrder = asyncHandler(async (req, res, next) => {
	const { Order, Product, OrderContact } = req.db.ecommerce.models;
	const { items, contact } = req.body;

	if (!contact || !contact.name || !contact.address || !contact.phone) {
		return next(new ErrorResponse("Please provide contact information", 400));
	}

	// Create the contact record
	const orderContact = await OrderContact.create({
		...contact,
		createdBy: req.user ? req.user.id : null,
	});

	let total = 0;
	for (const item of items) {
		const product = await Product.findByPk(item.productId);
		total += product.price * item.quantity;
	}
	const vat = total * 0.10;

	const order = await Order.create({
		userId: req.user ? req.user.id : null,
		contactId: orderContact.id,
		total,
		vat,
	});

	// Create a corresponding payment request
	await req.db.ecommerce.models.PaymentRequest.create({
		orderId: order.id,
		amount: order.total,
	});

	for (const item of items) {
		const product = await Product.findByPk(item.productId);
		await order.addProduct(product, {
			through: { quantity: item.quantity, price: product.price },
		});
	}
	res.status(201).json({ success: true, data: order });
});

// @desc    Get all orders (Admin)
// @route   GET /api/v1/orders/admin/all
// @access  Private (Admin)
export const getAllOrdersAdmin = asyncHandler(async (req, res, next) => {
	const { Order } = req.db.ecommerce.models;
	const {
		status,
		sortBy = "createdAt",
		sortOrder = "DESC",
		page = 1,
		limit = 10,
	} = req.query;

	let where = {};
	if (status) {
		where.status = status;
	}

	const offset = (page - 1) * limit;

	const { count, rows } = await Order.findAndCountAll({
		where,
		include: ["user", "contact", "paymentRequest"],
		order: [[sortBy, sortOrder]],
		limit: parseInt(limit),
		offset: parseInt(offset),
	});

	res.status(200).json({
		success: true,
		data: rows,
		pagination: {
			total: count,
			pages: Math.ceil(count / limit),
			currentPage: parseInt(page),
		},
	});
});

// @desc    Update order status (Admin)
// @route   PUT /api/v1/orders/:id/status
// @access  Private (Admin)
export const updateOrderStatusAdmin = asyncHandler(async (req, res, next) => {
	const { Order } = req.db.ecommerce.models;
	const { status } = req.body;

	const allowedStatuses = ["Awaiting Payment", "Processing", "Shipped", "Done"];
	if (!allowedStatuses.includes(status)) {
		return next(new ErrorResponse(`Invalid status: ${status}`, 400));
	}

	const order = await Order.findByPk(req.params.id, { include: ["paymentRequest"] });
	if (!order) {
		return next(
			new ErrorResponse(`Order not found with id of ${req.params.id}`, 404),
		);
	}

	// --- Corrected Logic ---
	// If the new status is anything other than "Awaiting Payment" and the payment
	// has not already been marked as "Paid", we update the payment status.
	if (status !== "Awaiting Payment" && order.paymentRequest && order.paymentRequest.status !== "Paid") {
		const paymentRequest = await order.getPaymentRequest();
		paymentRequest.status = "Paid";
		paymentRequest.paymentType = "admin_confirmed";
		paymentRequest.paidDate = new Date();
		await paymentRequest.save();
	}

	// Finally, update the order status itself.
	order.status = status;
	await order.save();

	res.status(200).json({ success: true, data: order });
});

// @desc    Get single order (Admin)
// @route   GET /api/v1/orders/admin/:id
// @access  Private (Admin)
export const getOrderAdmin = asyncHandler(async (req, res, next) => {
	const { Order, Product } = req.db.ecommerce.models; // Make sure to get Product model
	const order = await Order.findByPk(req.params.id, {
		include: [
			"user",
			"contact",
			{
				model: Product,
				as: "products",
				include: ["images"], // Include the images associated with the product
			},
			"paymentRequest",
		],
	});
	if (!order) {
		return next(
			new ErrorResponse(`Order not found with id of ${req.params.id}`, 404),
		);
	}
	res.status(200).json({ success: true, data: order });
});

export const getOrdersByContact = asyncHandler(async (req, res, next) => {
	const { Order, OrderContact } = req.db.ecommerce.models;
	const { phone } = req.params;

	const contacts = await OrderContact.findAll({ where: { phone } });
	if (!contacts.length) {
		return res.status(200).json({ success: true, data: [] });
	}

	const contactIds = contacts.map(c => c.id);
	const orders = await Order.findAll({
		where: { contactId: contactIds },
		include: ["products"],
	});

	res.status(200).json({ success: true, data: orders });
});
