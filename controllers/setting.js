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
  const settings = req.body;

  for (const key in settings) {
    if (key !== 'logo' && key !== 'heroImage') { // Exclude files from this loop
      await Setting.upsert({ key, value: settings[key] });
    }
  }

  if (req.files) {
    if (req.files.logo) {
      await Setting.upsert({ key: 'logo', value: req.files.logo[0].path });
    }
    if (req.files.heroImage) {
      await Setting.upsert({ key: 'heroImage', value: req.files.heroImage[0].path });
    }
    if (req.files.heroBackgroundImage) {
      await Setting.upsert({ key: 'heroBackgroundImage', value: req.files.heroBackgroundImage[0].path });
    }
  }

  res.status(200).json({ success: true, data: {} });
});
