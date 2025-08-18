import asyncHandler from "../middlewares/async.js";
import ErrorResponse from "../utils/errorResponse.js";

export const getParameters = asyncHandler(async (req, res, next) => {
  const { Parameter } = req.db.ecommerce.models;
  const parameters = await Parameter.findAll();
  res.status(200).json({ success: true, data: parameters });
});

export const getParameter = asyncHandler(async (req, res, next) => {
  const { Parameter } = req.db.ecommerce.models;
  const parameter = await Parameter.findByPk(req.params.id);
  if (!parameter) {
    return next(new ErrorResponse(`Parameter not found with id of ${req.params.id}`, 404));
  }
  res.status(200).json({ success: true, data: parameter });
});

export const createParameter = asyncHandler(async (req, res, next) => {
  const { Parameter } = req.db.ecommerce.models;
  const parameter = await Parameter.create(req.body);
  res.status(201).json({ success: true, data: parameter });
});

export const updateParameter = asyncHandler(async (req, res, next) => {
  const { Parameter } = req.db.ecommerce.models;
  let parameter = await Parameter.findByPk(req.params.id);
  if (!parameter) {
    return next(new ErrorResponse(`Parameter not found with id of ${req.params.id}`, 404));
  }
  parameter = await parameter.update(req.body);
  res.status(200).json({ success: true, data: parameter });
});

export const deleteParameter = asyncHandler(async (req, res, next) => {
  const { Parameter } = req.db.ecommerce.models;
  const parameter = await Parameter.findByPk(req.params.id);
  if (!parameter) {
    return next(new ErrorResponse(`Parameter not found with id of ${req.params.id}`, 404));
  }
  await parameter.destroy();
  res.status(200).json({ success: true, data: {} });
});