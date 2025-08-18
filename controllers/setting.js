import asyncHandler from "../middlewares/async.js";
import ErrorResponse from "../utils/errorResponse.js";

export const getSettings = asyncHandler(async (req, res, next) => {
  const { Setting } = req.db.ecommerce.models;
  const settings = await Setting.findAll();
  const settingsMap = settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
  res.status(200).json({ success: true, data: settingsMap });
});

export const updateSettings = asyncHandler(async (req, res, next) => {
  const { Setting } = req.db.ecommerce.models;
  const { logo } = req.body;

  if (req.file) {
    await Setting.upsert({ key: 'logo', value: req.file.path });
  }

  res.status(200).json({ success: true, data: {} });
});
