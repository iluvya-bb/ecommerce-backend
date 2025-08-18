import asyncHandler from "../middlewares/async.js";
import ErrorResponse from "../utils/errorResponse.js";

export const checkout = asyncHandler(async (req, res, next) => {
	const { Order, Product, OrderContact, PaymentRequest } = req.db.ecommerce.models;
	const { items, contact } = req.body;

	if (!items || items.length === 0) {
		return next(new ErrorResponse("Please provide items to order", 400));
	}
	if (!contact || !contact.name || !contact.address || !contact.phone) {
		return next(new ErrorResponse("Please provide contact information", 400));
	}

	// Create the contact record
	const orderContact = await OrderContact.create({
		...contact,
		createdBy: req.user ? req.user.id : null,
	});

	// Calculate total and validate products
	let total = 0;
	for (const item of items) {
		const product = await Product.findByPk(item.productId);
		if (!product) {
			return next(new ErrorResponse(`Product with id ${item.productId} not found`, 404));
		}
		total += product.price * item.quantity;
	}
	const vat = total * 0.10;

	// Create the order
	const order = await Order.create({
		userId: req.user ? req.user.id : null,
		contactId: orderContact.id,
		total,
		vat,
	});

	// Add items to the order and create payment request
	for (const item of items) {
		const product = await Product.findByPk(item.productId);
		await order.addProduct(product, {
			through: { quantity: item.quantity, price: product.price },
		});
	}

	await PaymentRequest.create({
		orderId: order.id,
		amount: order.total,
	});

	res.status(201).json({ success: true, data: order });
});
