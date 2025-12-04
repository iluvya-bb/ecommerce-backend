import ErrorResponse from "../utils/errorResponse.js";
import asyncHandler from "./async.js";

export const protect = asyncHandler(async (req, res, next) => {
	if (!req.user) {
		return next(new ErrorResponse("Not authorized to access this route", 401));
	}
	next();
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
	let token = "";
	if (req.cookies && req.cookies.token) {
		token = req.cookies.token;
	} else {
		if (
			req.headers.authorization &&
			req.headers.authorization.startsWith("Bearer")
		) {
			token = req.headers.authorization.split(" ")[1];
		}
	}
	req.token = token;
	next();
});
