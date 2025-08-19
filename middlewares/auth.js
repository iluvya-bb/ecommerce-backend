import ErrorResponse from "../utils/errorResponse.js";
import asyncHandler from "./async.js";
import jwt from "jsonwebtoken";

export const protect = asyncHandler(async (req, res, next) => {
	if (req.user) {
		return next();
	}

	// If no user, check for an auth error from tokenParsing
	if (req.authError) {
		return next(new ErrorResponse(req.authError, 401));
	}

	// If no user and no auth error, it's a genuinely unauthenticated request
	return next(new ErrorResponse("Not authorized to access this route", 401));
});

export const authorize = (...roles) => {
	return (req, res, next) => {
		if (!roles.includes(req.user.role)) {
			return next(
				new ErrorResponse(
					`User role ${req.user.role} is not authorized to access this route`,
					403,
				),
			);
		}
		next();
	};
};

export const tokenParsing = asyncHandler(async (req, res, next) => {
	let token;
	const { User, Session } = req.db.ecommerce.models;

	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith("Bearer")
	) {
		token = req.headers.authorization.split(" ")[1];
	} else if (req.cookies.token) {
		token = req.cookies.token;
	}

	if (!token) {
		return next(); // No token, proceed. `protect` middleware will handle it.
	}

	// First, decode the token without verifying expiration to get payload
	const decodedPayload = jwt.decode(token);

	if (!decodedPayload || !decodedPayload.id || !decodedPayload.deviceId) {
		req.authError = "Invalid token format";
		res.clearCookie("token");
		return next();
	}

	// Find the session in the database
	const session = await Session.findOne({
		where: { userId: decodedPayload.id, deviceId: decodedPayload.deviceId },
	});

	// If there's no session, the user is not authorized.
	if (!session) {
		req.authError = "Session not found. Please log in again.";
		res.clearCookie("token");
		return next();
	}

	// Now, verify the token fully. If it fails (expired or invalid), the catch block will handle it.
	// But because we found a session, we will refresh it.
	try {
		jwt.verify(token, process.env.JWT_SECRET);
	} catch (err) {
		if (err instanceof jwt.TokenExpiredError) {
			console.log("Token expired, but session found. Refreshing...");
		} else {
			// For other errors (e.g., invalid signature), treat as unauthorized.
			req.authError = "Invalid token signature.";
			res.clearCookie("token");
			return next();
		}
	}

	// If we reach here, the user has a valid session.
	// We will now issue a new token to extend the session.
	const user = await User.findByPk(decodedPayload.id);
	if (!user) {
		req.authError = "User for this session not found.";
		res.clearCookie("token");
		return next();
	}

	// Attach user to the request
	req.user = user;

	// --- Token Extension Logic ---
	const newToken = jwt.sign(
		{
			id: user.id,
			deviceId: decodedPayload.deviceId,
			deviceType: decodedPayload.deviceType,
		},
		process.env.JWT_SECRET,
		{
			expiresIn: process.env.JWT_EXPIRE,
		},
	);

	// Update the session in the database with the new token
	await session.update({ sessionToken: newToken });

	// Set the new token in the client's cookies
	res.cookie("token", newToken, {
		maxAge: process.env.JWT_EXPIRE,
		httpOnly: true,
	});

	return next();
});