import asyncHandler from "../middlewares/async.js";
import { Op } from "sequelize";

export const getDashboardStats = asyncHandler(async (req, res, next) => {
	const { Order, User } = req.db.ecommerce.models;

	const totalRevenue = await Order.sum("total", {
		where: { status: "Done" },
	});

	const totalSales = await Order.count();

	const totalCustomers = await User.count();

	const recentOrders = await Order.findAll({
		limit: 5,
		order: [["createdAt", "DESC"]],
		include: ["contact"],
	});

	res.status(200).json({
		success: true,
		data: {
			totalRevenue: totalRevenue || 0,
			totalSales,
			totalCustomers,
			recentOrders,
		},
	});
});
