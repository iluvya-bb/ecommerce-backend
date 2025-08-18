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

	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith("Bearer")
	) {
		token = req.headers.authorization.split(" ")[1];
	} else if (req.cookies.token) {
		token = req.cookies.token;
	}

	if (!token) {
		return next(); // No token, proceed. protect middleware will handle it.
	}

	try {
		// Verify token
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const { User } = req.db.ecommerce.models;
		req.user = await User.findByPk(decoded.id);
	} catch (err) {
		// Token is invalid or expired, attach an error message to the request
		req.authError = "Invalid or expired token";
	}
	
	return next();
});