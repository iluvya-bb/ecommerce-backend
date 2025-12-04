import asyncHandler from "../middlewares/async.js";
import { Op, fn, col, literal } from "sequelize";

/**
 * @desc    Get dashboard stats overview
 * @route   GET /api/v1/stats
 * @access  Private (Admin)
 */
export const getDashboardStats = asyncHandler(async (req, res, next) => {
	const { Order, User, Product, Category, SalesTransaction, PaymentRequest } = req.db.ecommerce.models;

	// Get date ranges
	const today = new Date();
	const startOfToday = new Date(today.setHours(0, 0, 0, 0));
	const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
	const startOfYear = new Date(today.getFullYear(), 0, 1);

	// Total revenue (completed orders)
	const totalRevenue = await Order.sum("total", {
		where: { status: { [Op.in]: ["Done", "Processing", "Paid"] } },
	}) || 0;

	// Monthly revenue
	const monthlyRevenue = await Order.sum("total", {
		where: {
			status: { [Op.in]: ["Done", "Processing", "Paid"] },
			createdAt: { [Op.gte]: startOfMonth },
		},
	}) || 0;

	// Today's revenue
	const todayRevenue = await Order.sum("total", {
		where: {
			status: { [Op.in]: ["Done", "Processing", "Paid"] },
			createdAt: { [Op.gte]: startOfToday },
		},
	}) || 0;

	// Order counts
	const totalOrders = await Order.count();
	const pendingOrders = await Order.count({ where: { status: "Pending" } });
	const processingOrders = await Order.count({ where: { status: "Processing" } });
	const completedOrders = await Order.count({ where: { status: "Done" } });
	const cancelledOrders = await Order.count({ where: { status: "Cancelled" } });

	// Today's orders
	const todayOrders = await Order.count({
		where: { createdAt: { [Op.gte]: startOfToday } },
	});

	// Customer count
	const totalCustomers = await User.count({ where: { role: "user" } });
	const newCustomersThisMonth = await User.count({
		where: {
			role: "user",
			createdAt: { [Op.gte]: startOfMonth },
		},
	});

	// Product stats
	const totalProducts = await Product.count();
	const totalCategories = await Category.count();

	// Payment stats
	const paidPayments = await PaymentRequest.count({ where: { status: "Paid" } });
	const pendingPayments = await PaymentRequest.count({ where: { status: "Pending" } });

	// Recent orders
	const recentOrders = await Order.findAll({
		limit: 10,
		order: [["createdAt", "DESC"]],
		include: ["contact", "paymentRequest"],
	});

	res.status(200).json({
		success: true,
		data: {
			// Flat fields for frontend compatibility
			totalRevenue: parseFloat(totalRevenue),
			totalSales: totalOrders,
			totalCustomers: totalCustomers,
			recentOrders,
			// Detailed breakdown
			revenue: {
				total: parseFloat(totalRevenue),
				monthly: parseFloat(monthlyRevenue),
				today: parseFloat(todayRevenue),
			},
			orders: {
				total: totalOrders,
				today: todayOrders,
				pending: pendingOrders,
				processing: processingOrders,
				completed: completedOrders,
				cancelled: cancelledOrders,
			},
			customers: {
				total: totalCustomers,
				newThisMonth: newCustomersThisMonth,
			},
			products: {
				total: totalProducts,
				categories: totalCategories,
			},
			payments: {
				paid: paidPayments,
				pending: pendingPayments,
			},
		},
	});
});

/**
 * @desc    Get sales analytics with charts data
 * @route   GET /api/v1/stats/sales
 * @access  Private (Admin)
 */
export const getSalesAnalytics = asyncHandler(async (req, res, next) => {
	const { Order, SalesTransaction } = req.db.ecommerce.models;
	const { period = "month" } = req.query; // day, week, month, year

	let dateFormat;
	let startDate;
	const now = new Date();

	switch (period) {
		case "day":
			dateFormat = "%Y-%m-%d %H:00"; // Hourly for last 24 hours
			startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
			break;
		case "week":
			dateFormat = "%Y-%m-%d"; // Daily for last 7 days
			startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			break;
		case "month":
			dateFormat = "%Y-%m-%d"; // Daily for last 30 days
			startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			break;
		case "year":
			dateFormat = "%Y-%m"; // Monthly for last 12 months
			startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
			break;
		default:
			dateFormat = "%Y-%m-%d";
			startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	}

	// Revenue over time
	const revenueData = await Order.findAll({
		attributes: [
			[fn("to_char", col("createdAt"), dateFormat === "%Y-%m" ? "YYYY-MM" : "YYYY-MM-DD"), "date"],
			[fn("SUM", col("total")), "revenue"],
			[fn("COUNT", col("id")), "orders"],
		],
		where: {
			status: { [Op.in]: ["Done", "Processing", "Paid"] },
			createdAt: { [Op.gte]: startDate },
		},
		group: [fn("to_char", col("createdAt"), dateFormat === "%Y-%m" ? "YYYY-MM" : "YYYY-MM-DD")],
		order: [[fn("to_char", col("createdAt"), dateFormat === "%Y-%m" ? "YYYY-MM" : "YYYY-MM-DD"), "ASC"]],
		raw: true,
	});

	// Order status distribution
	const orderStatusDistribution = await Order.findAll({
		attributes: [
			"status",
			[fn("COUNT", col("id")), "count"],
		],
		where: { createdAt: { [Op.gte]: startDate } },
		group: ["status"],
		raw: true,
	});

	// Top products by sales
	const topProducts = await Order.findAll({
		attributes: [
			[literal('"products"."name"'), "productName"],
			[fn("SUM", literal('"products->OrderItem"."quantity"')), "totalQuantity"],
			[fn("SUM", literal('"products->OrderItem"."price" * "products->OrderItem"."quantity"')), "totalRevenue"],
		],
		include: [{
			association: "products",
			attributes: [],
			through: { attributes: [] },
		}],
		where: {
			status: { [Op.in]: ["Done", "Processing", "Paid"] },
			createdAt: { [Op.gte]: startDate },
		},
		group: ['"products"."id"', '"products"."name"'],
		order: [[fn("SUM", literal('"products->OrderItem"."quantity"')), "DESC"]],
		limit: 10,
		raw: true,
		subQuery: false,
	}).catch(() => []); // Handle if products association doesn't exist

	res.status(200).json({
		success: true,
		data: {
			period,
			revenueOverTime: revenueData,
			orderStatusDistribution,
			topProducts,
		},
	});
});

/**
 * @desc    Get transaction history
 * @route   GET /api/v1/stats/transactions
 * @access  Private (Admin)
 */
export const getTransactions = asyncHandler(async (req, res, next) => {
	const { SalesTransaction, Order, User } = req.db.ecommerce.models;
	const { page = 1, limit = 20, type, status, startDate, endDate } = req.query;

	const where = {};

	if (type) where.type = type;
	if (status) where.status = status;
	if (startDate || endDate) {
		where.transactionDate = {};
		if (startDate) where.transactionDate[Op.gte] = new Date(startDate);
		if (endDate) where.transactionDate[Op.lte] = new Date(endDate);
	}

	const offset = (page - 1) * limit;

	const { count, rows: transactions } = await SalesTransaction.findAndCountAll({
		where,
		include: [
			{ model: Order, as: "order" },
			{ model: User, as: "user", attributes: ["id", "name", "email"] },
		],
		order: [["transactionDate", "DESC"]],
		limit: parseInt(limit),
		offset,
	});

	// Summary stats
	const totalAmount = await SalesTransaction.sum("amount", { where: { ...where, status: "completed" } }) || 0;

	res.status(200).json({
		success: true,
		data: {
			transactions,
			pagination: {
				total: count,
				page: parseInt(page),
				limit: parseInt(limit),
				pages: Math.ceil(count / limit),
			},
			summary: {
				totalAmount: parseFloat(totalAmount),
				transactionCount: count,
			},
		},
	});
});

/**
 * @desc    Get revenue summary by payment method
 * @route   GET /api/v1/stats/revenue-by-payment
 * @access  Private (Admin)
 */
export const getRevenueByPaymentMethod = asyncHandler(async (req, res, next) => {
	const { PaymentRequest, Order } = req.db.ecommerce.models;
	const { startDate, endDate } = req.query;

	const where = { status: "Paid" };
	if (startDate || endDate) {
		where.paidDate = {};
		if (startDate) where.paidDate[Op.gte] = new Date(startDate);
		if (endDate) where.paidDate[Op.lte] = new Date(endDate);
	}

	const revenueByMethod = await PaymentRequest.findAll({
		attributes: [
			"paymentType",
			[fn("SUM", col("amount")), "totalRevenue"],
			[fn("COUNT", col("id")), "count"],
		],
		where,
		group: ["paymentType"],
		raw: true,
	});

	res.status(200).json({
		success: true,
		data: revenueByMethod,
	});
});

/**
 * @desc    Export sales data
 * @route   GET /api/v1/stats/export
 * @access  Private (Admin)
 */
export const exportSalesData = asyncHandler(async (req, res, next) => {
	const { Order, SalesTransaction } = req.db.ecommerce.models;
	const { startDate, endDate, format = "json" } = req.query;

	const where = {
		status: { [Op.in]: ["Done", "Processing", "Paid"] },
	};

	if (startDate) where.createdAt = { ...where.createdAt, [Op.gte]: new Date(startDate) };
	if (endDate) where.createdAt = { ...where.createdAt, [Op.lte]: new Date(endDate) };

	const orders = await Order.findAll({
		where,
		include: ["contact", "products", "paymentRequest"],
		order: [["createdAt", "DESC"]],
	});

	const exportData = orders.map(order => ({
		orderId: order.id,
		date: order.createdAt,
		customerName: order.contact?.name || "Guest",
		customerEmail: order.contact?.email || "",
		customerPhone: order.contact?.phone || "",
		total: parseFloat(order.total),
		status: order.status,
		paymentStatus: order.paymentRequest?.status || "N/A",
		paymentMethod: order.paymentRequest?.paymentType || "N/A",
		products: order.products?.map(p => ({
			name: p.name,
			quantity: p.OrderItem?.quantity,
			price: p.OrderItem?.price,
		})) || [],
	}));

	if (format === "csv") {
		// Generate CSV
		const csvHeaders = "Order ID,Date,Customer Name,Email,Phone,Total,Status,Payment Status,Payment Method\n";
		const csvRows = exportData.map(o =>
			`${o.orderId},${o.date},${o.customerName},${o.customerEmail},${o.customerPhone},${o.total},${o.status},${o.paymentStatus},${o.paymentMethod}`
		).join("\n");

		res.setHeader("Content-Type", "text/csv");
		res.setHeader("Content-Disposition", `attachment; filename=sales-export-${new Date().toISOString().split("T")[0]}.csv`);
		return res.send(csvHeaders + csvRows);
	}

	res.status(200).json({
		success: true,
		data: exportData,
	});
});
