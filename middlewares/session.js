// @ts-nocheck
import asyncHandler from "./async.js";
import jwt from "jsonwebtoken";
import process from "node:process";

/**
 * Authenticate user without extending token
 * This verifies the token and sets req.user but doesn't extend the token
 */
export const authenticateUser = asyncHandler(async (req, res, next) => {
	const { User, Session } = req.db.ecommerce.models;
	let token;

	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith("Bearer")
	) {
		token = req.headers.authorization.split(" ")[1];
	} else if (req.cookies.token) {
		token = req.cookies.token;
	}

	// No token present - allow for public routes
	if (!token) {
		return next();
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const session = await Session.findOne({
			where: { userId: decoded.id, deviceId: decoded.deviceId },
		});

		if (!session) {
			// Session doesn't exist - token is invalid (user logged out or session expired)
			console.warn(`Authentication failed: Session not found for user ${decoded.id}, device ${decoded.deviceId}`);
			res.clearCookie("token");
			return next();
		}

		if (session.sessionToken !== token) {
			// Session token mismatch - possible security issue
			console.warn(`Authentication failed: Session token mismatch for user ${decoded.id}, device ${decoded.deviceId}`);
			res.clearCookie("token");
			return next();
		}

		const user = await User.findByPk(decoded.id);
		if (!user) {
			// User was deleted but session still exists
			console.warn(`Authentication failed: User ${decoded.id} not found, cleaning up session`);
			await Session.destroy({ where: { userId: decoded.id } });
			res.clearCookie("token");
			return next();
		}

		// Authentication successful - set user and deviceId on request object
		req.user = user;
		req.deviceId = decoded.deviceId;

		next();
	} catch (err) {
		// JWT verification failed (expired, invalid signature, malformed, etc.)
		if (err.name === "TokenExpiredError") {
			console.warn(`Authentication failed: Token expired at ${err.expiredAt}`);
		} else if (err.name === "JsonWebTokenError") {
			console.warn(`Authentication failed: Invalid token - ${err.message}`);
		} else {
			console.error(`Authentication error: ${err.message}`, err);
		}

		// Clear invalid token cookie
		res.clearCookie("token");
		return next();
	}
});

/**
 * Extend token on each request (LEGACY - NOT RECOMMENDED)
 * This creates a new token and updates the session
 */
export const extendToken = asyncHandler(async (req, res, next) => {
	const { User, Session } = req.db.ecommerce.models;
	let token;

	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith("Bearer")
	) {
		token = req.headers.authorization.split(" ")[1];
	} else if (req.cookies.token) {
		token = req.cookies.token;
	}

	if (!token) {
		return next();
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const session = await Session.findOne({
			where: { userId: decoded.id, deviceId: decoded.deviceId },
		});

		if (!session || session.sessionToken !== token) {
			return next();
		}

		const user = await User.findByPk(decoded.id);
		if (!user) {
			return next();
		}

		req.user = user;

		const newToken = jwt.sign(
			{
				id: decoded.id,
				deviceId: decoded.deviceId,
				deviceType: decoded.deviceType,
			},
			process.env.JWT_SECRET,
			{
				expiresIn: process.env.JWT_EXPIRE,
			},
		);

		await session.update({ sessionToken: newToken });

		// Parse JWT_EXPIRE to milliseconds (e.g., "30d" -> 30 days in ms)
		const parseExpireToMs = (expire) => {
			const match = expire.match(/^(\d+)([smhd])$/);
			if (!match) return 24 * 60 * 60 * 1000; // default to 1 day
			const value = parseInt(match[1]);
			const unit = match[2];
			const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
			return value * (multipliers[unit] || 86400000);
		};

		res.cookie("token", newToken, {
			maxAge: parseExpireToMs(process.env.JWT_EXPIRE),
			httpOnly: true,
		});

		next();
	} catch (err) {
		return next();
	}
});
