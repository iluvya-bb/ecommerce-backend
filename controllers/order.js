import asyncHandler from "../middlewares/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import { generatePaymentCode } from "../utils/codeGenerator.js";

export const getOrders = asyncHandler(async (req, res, next) => {
	const { Order, OrderContact, User, Product } = req.db.ecommerce.models;
	const { Op } = require("sequelize");

	// Get the current user's email and phone
	const user = await User.findByPk(req.user.id);
	if (!user) {
		return next(new ErrorResponse("User not found", 404));
	}

	// Build conditions to find orders:
	// 1. Orders directly linked to user via userId
	// 2. Orders where OrderContact.email matches user's email
	// 3. Orders where OrderContact.phone matches user's phone
	const contactConditions = [];
	if (user.email) {
		contactConditions.push({ email: user.email.toLowerCase() });
	}
	if (user.phone) {
		contactConditions.push({ phone: user.phone });
	}

	// Find all OrderContacts matching user's email or phone
	let contactIds = [];
	if (contactConditions.length > 0) {
		const matchingContacts = await OrderContact.findAll({
			where: { [Op.or]: contactConditions },
			attributes: ["id"],
		});
		contactIds = matchingContacts.map((c) => c.id);
	}

	// Build the final where clause: userId matches OR contactId is in the matching list
	const whereClause = {
		[Op.or]: [
			{ userId: req.user.id },
			...(contactIds.length > 0 ? [{ contactId: { [Op.in]: contactIds } }] : []),
		],
	};

	const orders = await Order.findAll({
		where: whereClause,
		include: [
			{
				model: Product,
				as: "products",
				include: ["images"],
			},
			"contact",
			"paymentRequest",
		],
		order: [["createdAt", "DESC"]],
	});

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
	const { Order, Product, OrderContact, PaymentRequest } = req.db.ecommerce.models;
	const { items, contact } = req.body;

	if (!contact || !contact.name || !contact.address || !contact.phone || !contact.email) {
		return next(new ErrorResponse("Please provide complete contact information including email", 400));
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

	// Generate a unique payment code
	const paymentCode = await generatePaymentCode(req.db);

	// Create a corresponding payment request
	await PaymentRequest.create({
		orderId: order.id,
		amount: order.total,
		code: paymentCode,
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
	const { Order, OrderContact, User } = req.db.ecommerce.models;
	const { Op } = require("sequelize");
	const {
		status,
		sortBy = "createdAt",
		sortOrder = "DESC",
		page = 1,
		limit = 10,
		q, // Search term for name, email, phone
	} = req.query;

	let where = {};
	if (status) {
		where.status = status;
	}

	// If search term is provided, find matching orders by contact info or user info
	if (q && q.trim()) {
		const searchTerm = q.trim().toLowerCase();

		// Search for matching contacts (by name, email, or phone)
		const matchingContacts = await OrderContact.findAll({
			where: {
				[Op.or]: [
					{ name: { [Op.iLike]: `%${searchTerm}%` } },
					{ email: { [Op.iLike]: `%${searchTerm}%` } },
					{ phone: { [Op.like]: `%${searchTerm}%` } },
				],
			},
			attributes: ["id"],
		});
		const contactIds = matchingContacts.map((c) => c.id);

		// Search for matching registered users (by name, email, or phone)
		const matchingUsers = await User.findAll({
			where: {
				[Op.or]: [
					{ name: { [Op.iLike]: `%${searchTerm}%` } },
					{ email: { [Op.iLike]: `%${searchTerm}%` } },
					{ phone: { [Op.like]: `%${searchTerm}%` } },
				],
			},
			attributes: ["id"],
		});
		const userIds = matchingUsers.map((u) => u.id);

		// Check if search term looks like an order ID
		const isNumeric = /^\d+$/.test(searchTerm);

		// Combine all search conditions
		const searchConditions = [];
		if (contactIds.length > 0) {
			searchConditions.push({ contactId: { [Op.in]: contactIds } });
		}
		if (userIds.length > 0) {
			searchConditions.push({ userId: { [Op.in]: userIds } });
		}
		if (isNumeric) {
			searchConditions.push({ id: parseInt(searchTerm) });
		}

		if (searchConditions.length > 0) {
			where[Op.or] = searchConditions;
		} else {
			// No matches found, return empty result
			return res.status(200).json({
				success: true,
				data: [],
				pagination: {
					total: 0,
					pages: 0,
					currentPage: parseInt(page),
				},
			});
		}
	}

	const offset = (page - 1) * limit;

	const { count, rows } = await Order.findAndCountAll({
		where,
		include: ["user", "contact", "paymentRequest"],
		order: [[sortBy, sortOrder]],
		limit: parseInt(limit),
		offset: parseInt(offset),
		distinct: true, // Ensure correct count with includes
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
	const { Order, SalesTransaction } = req.db.ecommerce.models;
	const { status } = req.body;

	const allowedStatuses = ["Awaiting Payment", "Processing", "Shipped", "Done", "Cancelled"];
	if (!allowedStatuses.includes(status)) {
		return next(new ErrorResponse(`Invalid status: ${status}`, 400));
	}

	const order = await Order.findByPk(req.params.id, { include: ["paymentRequest"] });
	if (!order) {
		return next(
			new ErrorResponse(`Order not found with id of ${req.params.id}`, 404),
		);
	}

	// If the new status is anything other than "Awaiting Payment" and the payment
	// has not already been marked as "Paid", we update the payment status.
	if (status !== "Awaiting Payment" && status !== "Cancelled" && order.paymentRequest && order.paymentRequest.status !== "Paid") {
		const paymentRequest = await order.getPaymentRequest();
		paymentRequest.status = "Paid";
		paymentRequest.paymentType = "admin_confirmed";
		paymentRequest.paidDate = new Date();
		await paymentRequest.save();

		// Record admin-confirmed payment transaction
		await SalesTransaction.create({
			type: "order_payment",
			amount: parseFloat(order.total),
			currency: "MNT",
			description: `Админ баталгаажуулсан төлбөр - Захиалга #${order.id}`,
			orderId: order.id,
			userId: order.userId,
			paymentRequestId: paymentRequest.id,
			paymentMethod: "admin_confirmed",
			status: "completed",
			transactionDate: new Date(),
		});
	}

	// If cancelling an order, record cancellation transaction
	if (status === "Cancelled" && order.status !== "Cancelled") {
		await SalesTransaction.create({
			type: "cancelled",
			amount: parseFloat(order.total),
			currency: "MNT",
			description: `Захиалга цуцлагдсан - Захиалга #${order.id}`,
			orderId: order.id,
			userId: order.userId,
			paymentRequestId: order.paymentRequest?.id,
			status: "cancelled",
			transactionDate: new Date(),
		});
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
	const { Order, OrderContact, Product } = req.db.ecommerce.models;
	const { phone } = req.params;
	const { email } = req.query;

	// Build search criteria - search by phone OR email
	const { Op } = require("sequelize");
	const whereConditions = [];

	if (phone) {
		whereConditions.push({ phone });
	}
	if (email) {
		whereConditions.push({ email });
	}

	if (whereConditions.length === 0) {
		return res.status(200).json({ success: true, data: [] });
	}

	const contacts = await OrderContact.findAll({
		where: { [Op.or]: whereConditions }
	});

	if (!contacts.length) {
		return res.status(200).json({ success: true, data: [] });
	}

	const contactIds = contacts.map(c => c.id);
	const orders = await Order.findAll({
		where: { contactId: contactIds },
		include: [
			{
				model: Product,
				as: "products",
				include: ["images"],
			},
			"contact",
			"paymentRequest",
		],
		order: [["createdAt", "DESC"]],
	});

	res.status(200).json({ success: true, data: orders });
});

// @desc    Lookup orders by phone and/or email (for guests)
// @route   POST /api/v1/orders/lookup
// @access  Public
export const lookupOrders = asyncHandler(async (req, res, next) => {
	const { Order, OrderContact, Product } = req.db.ecommerce.models;
	const { phone, email } = req.body;

	if (!phone && !email) {
		return next(new ErrorResponse("Утасны дугаар эсвэл имэйл оруулна уу", 400));
	}

	const { Op } = require("sequelize");
	const whereConditions = [];

	if (phone) {
		whereConditions.push({ phone });
	}
	if (email) {
		whereConditions.push({ email: email.toLowerCase() });
	}

	const contacts = await OrderContact.findAll({
		where: { [Op.or]: whereConditions }
	});

	if (!contacts.length) {
		return res.status(200).json({ success: true, data: [] });
	}

	const contactIds = contacts.map(c => c.id);
	const orders = await Order.findAll({
		where: { contactId: contactIds },
		include: [
			{
				model: Product,
				as: "products",
				include: ["images"],
			},
			"contact",
			"paymentRequest",
		],
		order: [["createdAt", "DESC"]],
	});

	res.status(200).json({ success: true, data: orders });
});

// @desc    Get single order by ID (public - for tracking)
// @route   GET /api/v1/orders/track/:id
// @access  Public
export const trackOrder = asyncHandler(async (req, res, next) => {
	const { Order, Product } = req.db.ecommerce.models;
	const order = await Order.findByPk(req.params.id, {
		include: [
			{
				model: Product,
				as: "products",
				include: ["images"],
			},
			"contact",
			"paymentRequest",
		],
	});

	if (!order) {
		return next(new ErrorResponse(`Захиалга олдсонгүй: ${req.params.id}`, 404));
	}

	res.status(200).json({ success: true, data: order });
});
