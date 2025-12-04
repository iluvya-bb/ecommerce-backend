import asyncHandler from "../middlewares/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import process from "node:process";
import { sendPasswordResetEmail } from "../utils/sendMail.js";

export const register = asyncHandler(async (req, res, next) => {
	const { name, email, phone, password } = req.body;
	const { User } = req.db.ecommerce.models;

	// Check if user already exists
	const existingUser = await User.findOne({ where: { email } });
	if (existingUser) {
		return next(new ErrorResponse("И-мэйл хаяг бүртгэлтэй байна", 400));
	}

	const user = await User.create({
		name,
		email,
		phone,
		password,
	});

	const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
		expiresIn: Number(process.env.JWT_EXPIRE),
	});

	res.status(200).json({
		success: true,
		token,
		message: "Бүртгэл амжилттай.",
	});
});

export const login = asyncHandler(async (req, res, next) => {
	const { email, password, deviceType } = req.body;
	const { User, Session } = req.db.ecommerce.models;

	if (!email || !password) {
		throw new ErrorResponse("Please provide an email and password", 400);
	}

	const user = await User.findOne({ where: { email } });

	if (!user) {
		return next(new ErrorResponse("Invalid credentials", 401));
	}

	const isMatch = await user.matchPassword(password);

	if (!isMatch) {
		return next(new ErrorResponse("Invalid credentials", 401));
	}

	try {
		const deviceId = uuidv4();
		const token = jwt.sign(
			{ id: user.id, deviceId, deviceType },
			process.env.JWT_SECRET,
			{
				expiresIn: Number(process.env.JWT_EXPIRE),
			},
		);

		// Invalidate all other sessions for this user
		await Session.update(
			{ sessionToken: null },
			{ where: { userId: user.id } },
		);

		// Create a new session for the new device
		await Session.create({
			userId: user.id,
			deviceId,
			deviceType,
			sessionToken: token,
		});

		res.cookie("token", token, {
			maxAge: process.env.JWT_EXPIRE,
			httpOnly: true,
		});

		res.status(200).json({ success: true, token });
	} catch {
		throw new ErrorResponse("Something is wrong", 500);
	}
});

export const adminLogin = asyncHandler(async (req, res, next) => {
	const { email, password } = req.body;
	const { User, Session } = req.db.ecommerce.models;
	const { deviceType = "desktop" } = req.body; // Default to desktop

	if (!email || !password) {
		return next(new ErrorResponse("Please provide an email and password", 400));
	}

	const user = await User.findOne({ where: { email } });

	if (!user) {
		return next(new ErrorResponse("User not found", 404));
	}

	if (user.role !== "admin") {
		return next(new ErrorResponse("User is not authorized", 403));
	}

	const isMatch = await user.matchPassword(password);

	if (!isMatch) {
		return next(new ErrorResponse("Incorrect password", 401));
	}

	try {
		const deviceId = uuidv4();
		const token = jwt.sign(
			{ id: user.id, deviceId, deviceType },
			process.env.JWT_SECRET,
			{
				expiresIn: Number(process.env.JWT_EXPIRE),
			},
		);

		// Invalidate other sessions for this user on other devices if needed, or manage sessions
		// For simplicity, we'll just create a new one.
		await Session.create({
			userId: user.id,
			deviceId,
			deviceType,
			sessionToken: token,
		});

		res.cookie("token", token, {
			maxAge: process.env.JWT_EXPIRE,
			httpOnly: true,
		});

		res.status(200).json({ success: true, token });
	} catch (err) {
		console.error(err);
		return next(new ErrorResponse("Server error during login", 500));
	}
});

export const updateProfile = asyncHandler(async (req, res, next) => {
	const { User } = req.db.ecommerce.models;
	const user = await User.findByPk(req.user.id, {
		attributes: { exclude: ["password"] },
	});

	if (!user) {
		return next(new ErrorResponse(`User not found`, 404));
	}

	if (req.file) {
		req.body.avatar = req.file.path;
	}

	const updatedUser = await user.update(req.body);

	res.status(200).json({
		success: true,
		data: updatedUser,
	});
});

export const signout = asyncHandler(async (req, res, next) => {
	const { Session } = req.db.ecommerce.models;
	await Session.destroy({ where: { userId: req.user.id } });
	res.clearCookie("token");
	res.status(200).json({ success: true, data: {} });
	next();
});

export const subscribeUserToCourse = asyncHandler(async (req, res, next) => {
	const { userId, courseId } = req.body;

	const { User, Course, Subscription } = req.db.ecommerce.models;

	const user = await User.findByPk(userId);
	if (!user) {
		return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
	}

	const course = await Course.findByPk(courseId);
	if (!course) {
		return next(
			new ErrorResponse(`Course not found with id of ${courseId}`, 404),
		);
	}

	const endDate = new Date();
	endDate.setDate(endDate.getDate() + 30);

	const subscription = await Subscription.create({
		userId,
		courseId,
		endDate,
		purchasePrice: course.price,
	});

	res.status(201).json({
		success: true,
		data: subscription,
	});
});

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private (Admin)
export const getUsers = asyncHandler(async (req, res, next) => {
	const { User } = req.db.ecommerce.models;
	const users = await User.findAll({ attributes: { exclude: ["password"] } });
	res.status(200).json({ success: true, data: users });
	next();
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private (Admin)
export const getUser = asyncHandler(async (req, res, next) => {
	const { User } = req.db.ecommerce.models;
	const user = await User.findByPk(req.params.id, {
		attributes: { exclude: ["password"] },
	});
	if (!user) {
		return next(new ErrorResponse(`User not found`, 404));
	}
	res.status(200).json({ success: true, data: user });
});

export const getMe = asyncHandler(async (req, res, next) => {
	const { user } = req;
	if (!user) {
		return next(new ErrorResponse(`User not found`, 404));
	}
	res.status(200).json({ success: true, data: user });
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private (Admin)
export const updateUser = asyncHandler(async (req, res, next) => {
	const { User } = req.db.ecommerce.models;
	let user = await User.findByPk(req.params.id, {
		attributes: { exclude: ["password"] },
	});
	if (!user) {
		return next(new ErrorResponse(`User not found`, 404));
	}
	user = await user.update(req.body);
	user.password = undefined;
	res.status(200).json({ success: true, data: user });
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private (Admin)
export const deleteUser = asyncHandler(async (req, res, next) => {
	const { User } = req.db.ecommerce.models;
	const user = await User.findByPk(req.params.id);
	if (!user) {
		return next(new ErrorResponse(`User not found`, 404));
	}
	await user.destroy();
	res.status(200).json({ success: true, data: {} });
});

// @desc    Forgot password - send reset email
// @route   POST /api/v1/users/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res, next) => {
	const { User } = req.db.ecommerce.models;
	const { email } = req.body;

	if (!email) {
		return next(new ErrorResponse("И-мэйл хаяг оруулна уу", 400));
	}

	const user = await User.findOne({ where: { email } });

	if (!user) {
		return next(new ErrorResponse("Энэ и-мэйлтэй хэрэглэгч олдсонгүй", 404));
	}

	// Generate reset token
	const resetToken = user.generatePasswordResetToken();
	await user.save();

	// Send password reset email
	const baseUrl = req.headers.origin || process.env.FRONTEND_URL || "http://localhost:5173";
	try {
		await sendPasswordResetEmail(user, resetToken, baseUrl);
	} catch (err) {
		console.error("Failed to send password reset email:", err);
		user.passwordResetToken = null;
		user.passwordResetExpires = null;
		await user.save();
		return next(new ErrorResponse("И-мэйл илгээхэд алдаа гарлаа", 500));
	}

	res.status(200).json({
		success: true,
		message: "Нууц үг сэргээх и-мэйл илгээгдлээ",
	});
});

// @desc    Reset password
// @route   POST /api/v1/users/reset-password/:token
// @access  Public
export const resetPassword = asyncHandler(async (req, res, next) => {
	const { User } = req.db.ecommerce.models;
	const { token } = req.params;
	const { password } = req.body;

	if (!password) {
		return next(new ErrorResponse("Шинэ нууц үг оруулна уу", 400));
	}

	if (password.length < 6) {
		return next(new ErrorResponse("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой", 400));
	}

	// Hash the token to compare with stored hash
	const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

	const user = await User.findOne({
		where: {
			passwordResetToken: hashedToken,
		},
	});

	if (!user) {
		return next(new ErrorResponse("Буруу эсвэл хүчингүй токен", 400));
	}

	// Check if token has expired
	if (user.passwordResetExpires < Date.now()) {
		return next(new ErrorResponse("Токены хугацаа дууссан байна. Дахин хүсэлт илгээнэ үү.", 400));
	}

	// Set new password
	user.password = password;
	user.passwordResetToken = null;
	user.passwordResetExpires = null;
	await user.save();

	res.status(200).json({
		success: true,
		message: "Нууц үг амжилттай шинэчлэгдлээ",
	});
});
