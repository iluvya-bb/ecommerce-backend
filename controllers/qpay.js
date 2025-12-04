import asyncHandler from "../middlewares/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import qpayService from "../services/qpayService.js";

/**
 * @desc    Create QPay invoice for order payment
 * @route   POST /api/v1/qpay/create-invoice/:orderId
 * @access  Public (for guest checkout) or Private
 */
export const createQPayInvoice = asyncHandler(async (req, res, next) => {
	const { orderId } = req.params;
	const { Order, PaymentRequest } = req.db.ecommerce.models;

	// Find the order
	const order = await Order.findByPk(orderId, {
		include: [{ model: PaymentRequest, as: "paymentRequest" }],
	});

	if (!order) {
		return next(new ErrorResponse("Захиалга олдсонгүй", 404));
	}

	// Check if order already has a completed payment
	if (order.paymentRequest?.status === "Paid") {
		return next(new ErrorResponse("Энэ захиалга аль хэдийн төлөгдсөн байна", 400));
	}

	const amount = parseFloat(order.total);

	if (!amount || amount <= 0) {
		return next(new ErrorResponse("Зөв дүн оруулна уу", 400));
	}

	// Validate minimum amount (QPay typically has minimum amounts)
	if (amount < 100) {
		return next(new ErrorResponse("Хамгийн бага дүн 100₮ байна", 400));
	}

	try {
		// Generate unique invoice number
		const invoiceNo = qpayService.generateInvoiceNo(orderId, "ORDER");

		// Create invoice in QPay
		const callbackUrl = `${process.env.API_URL || 'http://localhost:8002'}/qpay/callback`;

		const qpayInvoice = await qpayService.createInvoice({
			sender_invoice_no: invoiceNo,
			invoice_amount: amount,
			invoice_description: `Захиалга #${orderId} - ${order.paymentRequest?.code || invoiceNo}`,
			callback_url: callbackUrl,
		});

		// Update the existing PaymentRequest with QPay info
		if (order.paymentRequest) {
			await order.paymentRequest.update({
				paymentType: "qpay",
				qpayInvoiceId: qpayInvoice.invoice_id,
				qrText: qpayInvoice.qr_text,
				qrImage: qpayInvoice.qr_image,
				urls: qpayInvoice.urls,
				qpayShortUrl: qpayInvoice.qpay_shorturl,
			});
		}

		res.status(201).json({
			success: true,
			data: {
				order_id: orderId,
				payment_request_id: order.paymentRequest?.id,
				invoice_no: invoiceNo,
				qpay_invoice_id: qpayInvoice.invoice_id,
				amount,
				qr_text: qpayInvoice.qr_text,
				qr_image: qpayInvoice.qr_image,
				qpay_shorturl: qpayInvoice.qpay_shorturl,
				urls: qpayInvoice.urls,
			},
		});
	} catch (error) {
		console.error("QPay invoice creation error:", error);
		return next(
			new ErrorResponse(
				error.message || "QPay төлбөр үүсгэхэд алдаа гарлаа",
				500,
			),
		);
	}
});

/**
 * @desc    Check QPay payment status for an order
 * @route   GET /api/v1/qpay/check/:orderId
 * @access  Public
 */
export const checkQPayStatus = asyncHandler(async (req, res, next) => {
	const { orderId } = req.params;
	const { Order, PaymentRequest, SalesTransaction } = req.db.ecommerce.models;

	const order = await Order.findByPk(orderId, {
		include: [{ model: PaymentRequest, as: "paymentRequest" }],
	});

	if (!order) {
		return next(new ErrorResponse("Захиалга олдсонгүй", 404));
	}

	const paymentRequest = order.paymentRequest;

	if (!paymentRequest) {
		return next(new ErrorResponse("Төлбөрийн хүсэлт олдсонгүй", 404));
	}

	if (!paymentRequest.qpayInvoiceId) {
		return next(new ErrorResponse("QPay төлбөр үүсгээгүй байна", 400));
	}

	// If already completed, return the status
	if (paymentRequest.status === "Paid") {
		return res.status(200).json({
			success: true,
			data: {
				status: "Paid",
				amount: paymentRequest.amount,
				paid_at: paymentRequest.paidDate,
				order_status: order.status,
			},
		});
	}

	try {
		// Check payment status from QPay
		const paymentStatus = await qpayService.checkPayment(
			paymentRequest.qpayInvoiceId,
		);

		if (
			paymentStatus.count > 0 &&
			paymentStatus.paid_amount >= parseFloat(paymentRequest.amount)
		) {
			// Payment successful - update order and payment request
			await paymentRequest.update({
				status: "Paid",
				paidDate: new Date(),
				paymentInfo: paymentStatus.rows[0],
			});

			// Update order status
			await order.update({
				status: "Processing",
			});

			// Record sales transaction
			await SalesTransaction.create({
				type: "qpay_payment",
				amount: parseFloat(paymentRequest.amount),
				currency: "MNT",
				description: `QPay төлбөр - Захиалга #${orderId}`,
				orderId: order.id,
				userId: order.userId,
				paymentRequestId: paymentRequest.id,
				paymentMethod: "qpay",
				externalReference: paymentRequest.qpayInvoiceId,
				status: "completed",
				transactionDate: new Date(),
				metadata: paymentStatus.rows[0],
			});

			return res.status(200).json({
				success: true,
				data: {
					status: "Paid",
					amount: paymentRequest.amount,
					paid_at: paymentRequest.paidDate,
					order_status: "Processing",
				},
			});
		}

		// Payment not yet completed
		res.status(200).json({
			success: true,
			data: {
				status: "Pending",
				amount: paymentRequest.amount,
				paid_amount: paymentStatus.paid_amount || 0,
			},
		});
	} catch (error) {
		console.error("QPay status check error:", error);
		return next(
			new ErrorResponse("Төлбөрийн төлөв шалгахад алдаа гарлаа", 500),
		);
	}
});

/**
 * @desc    QPay webhook callback
 * @route   POST /api/v1/qpay/callback
 * @access  Public (but verified)
 */
export const qpayCallback = asyncHandler(async (req, res, next) => {
	const webhookData = req.body;
	console.log("QPay webhook received:", JSON.stringify(webhookData, null, 2));

	const { Order, PaymentRequest, SalesTransaction } = req.db.ecommerce.models;

	try {
		// Verify webhook signature if QPay provides it
		const signature =
			req.headers["x-qpay-signature"] || req.headers["qpay-signature"];

		if (
			signature &&
			!qpayService.verifyWebhookSignature(webhookData, signature)
		) {
			console.error("Invalid webhook signature");
			return res
				.status(400)
				.json({ success: false, message: "Invalid signature" });
		}

		// QPay webhook typically sends: invoice_id, payment_id, amount, status
		const { invoice_id, payment_id, amount, payment_status } = webhookData;

		if (!invoice_id) {
			return res
				.status(400)
				.json({ success: false, message: "Missing invoice_id" });
		}

		// Find payment request by QPay invoice ID
		const paymentRequest = await PaymentRequest.findOne({
			where: { qpayInvoiceId: invoice_id },
		});

		if (!paymentRequest) {
			console.error("Payment request not found for invoice:", invoice_id);
			return res
				.status(404)
				.json({ success: false, message: "Payment request not found" });
		}

		// Skip if already processed
		if (paymentRequest.status === "Paid") {
			return res
				.status(200)
				.json({ success: true, message: "Already processed" });
		}

		// Process payment if successful
		if (payment_status === "PAID" || payment_status === "paid") {
			// Update payment request
			await paymentRequest.update({
				status: "Paid",
				paidDate: new Date(),
				paymentInfo: webhookData,
			});

			// Update order status
			const order = await Order.findByPk(paymentRequest.orderId);
			if (order) {
				await order.update({
					status: "Processing",
				});

				// Record sales transaction
				await SalesTransaction.create({
					type: "qpay_payment",
					amount: parseFloat(paymentRequest.amount),
					currency: "MNT",
					description: `QPay төлбөр (webhook) - Захиалга #${order.id}`,
					orderId: order.id,
					userId: order.userId,
					paymentRequestId: paymentRequest.id,
					paymentMethod: "qpay",
					externalReference: invoice_id,
					status: "completed",
					transactionDate: new Date(),
					metadata: webhookData,
				});
			}

			return res
				.status(200)
				.json({ success: true, message: "Payment processed successfully" });
		}

		// Handle failed or cancelled payments
		if (payment_status === "FAILED" || payment_status === "CANCELLED") {
			await paymentRequest.update({
				status: "Failed",
				paymentInfo: webhookData,
			});

			// Record failed transaction
			const order = await Order.findByPk(paymentRequest.orderId);
			await SalesTransaction.create({
				type: "cancelled",
				amount: parseFloat(paymentRequest.amount),
				currency: "MNT",
				description: `QPay төлбөр амжилтгүй - Захиалга #${paymentRequest.orderId}`,
				orderId: paymentRequest.orderId,
				userId: order?.userId,
				paymentRequestId: paymentRequest.id,
				paymentMethod: "qpay",
				externalReference: invoice_id,
				status: "failed",
				transactionDate: new Date(),
				metadata: webhookData,
			});
		}

		res.status(200).json({ success: true, message: "Webhook processed" });
	} catch (error) {
		console.error("QPay webhook processing error:", error);
		// Always return 200 to QPay to avoid retries
		res.status(200).json({ success: false, message: error.message });
	}
});

/**
 * @desc    Get QPay payment info for an order
 * @route   GET /api/v1/qpay/order/:orderId
 * @access  Public
 */
export const getQPayInfo = asyncHandler(async (req, res, next) => {
	const { orderId } = req.params;
	const { Order, PaymentRequest } = req.db.ecommerce.models;

	const order = await Order.findByPk(orderId, {
		include: [{ model: PaymentRequest, as: "paymentRequest" }],
	});

	if (!order) {
		return next(new ErrorResponse("Захиалга олдсонгүй", 404));
	}

	const paymentRequest = order.paymentRequest;

	if (!paymentRequest || !paymentRequest.qpayInvoiceId) {
		return res.status(200).json({
			success: true,
			data: {
				has_qpay: false,
				order_id: orderId,
				amount: order.total,
				status: paymentRequest?.status || "Pending",
			},
		});
	}

	res.status(200).json({
		success: true,
		data: {
			has_qpay: true,
			order_id: orderId,
			amount: paymentRequest.amount,
			status: paymentRequest.status,
			qr_text: paymentRequest.qrText,
			qr_image: paymentRequest.qrImage,
			qpay_shorturl: paymentRequest.qpayShortUrl,
			urls: paymentRequest.urls,
			paid_at: paymentRequest.paidDate,
		},
	});
});

/**
 * @desc    Cancel a pending QPay payment
 * @route   DELETE /api/v1/qpay/cancel/:orderId
 * @access  Public
 */
export const cancelQPayPayment = asyncHandler(async (req, res, next) => {
	const { orderId } = req.params;
	const { Order, PaymentRequest, SalesTransaction } = req.db.ecommerce.models;

	const order = await Order.findByPk(orderId, {
		include: [{ model: PaymentRequest, as: "paymentRequest" }],
	});

	if (!order) {
		return next(new ErrorResponse("Захиалга олдсонгүй", 404));
	}

	const paymentRequest = order.paymentRequest;

	if (!paymentRequest || !paymentRequest.qpayInvoiceId) {
		return next(new ErrorResponse("QPay төлбөр олдсонгүй", 404));
	}

	if (paymentRequest.status !== "Pending") {
		return next(
			new ErrorResponse("Зөвхөн хүлээгдэж буй төлбөрийг цуцлах боломжтой", 400),
		);
	}

	try {
		// Cancel invoice in QPay
		await qpayService.cancelInvoice(paymentRequest.qpayInvoiceId);

		// Update payment request status
		await paymentRequest.update({
			status: "Cancelled",
			qpayInvoiceId: null,
			qrText: null,
			qrImage: null,
			qpayShortUrl: null,
			urls: null,
		});

		// Record cancellation transaction
		await SalesTransaction.create({
			type: "cancelled",
			amount: parseFloat(paymentRequest.amount),
			currency: "MNT",
			description: `QPay төлбөр цуцлагдсан - Захиалга #${orderId}`,
			orderId: order.id,
			userId: order.userId,
			paymentRequestId: paymentRequest.id,
			paymentMethod: "qpay",
			status: "cancelled",
			transactionDate: new Date(),
		});

		res.status(200).json({
			success: true,
			message: "QPay төлбөр амжилттай цуцлагдлаа",
		});
	} catch (error) {
		console.error("QPay cancellation error:", error);
		return next(new ErrorResponse("QPay төлбөр цуцлахад алдаа гарлаа", 500));
	}
});
