import asyncHandler from "./async.js";

/**
 * Optional authentication middleware
 * If user is logged in, req.user will be set
 * If not logged in, req.user will be null/undefined and request continues
 * This is used for routes that have different behavior for logged-in vs anonymous users
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  // req.user is already set by the authenticateUser middleware in index.js
  // This middleware just continues regardless of whether user is set
  next();
});
