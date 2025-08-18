import asyncHandler from "../middlewares/async.js";

export const uploadImage = asyncHandler(async (req, res, next) => {
	if (!req.file) {
		return next(new ErrorResponse("Please upload a file", 400));
	}

	// The file is already saved by the 'upload.single' middleware.
	// We just need to return its public path.
	res.status(200).json({
		success: true,
		data: {
			url: req.file.path, // The path is relative to the uploads folder
		},
	});
});
