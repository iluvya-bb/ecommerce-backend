// @ts-nocheck
import asyncHandler from "./async.js";
import jwt from "jsonwebtoken";
import process from "node:process";

export const extendToken = asyncHandler(async (req, res, next) => {
  console.log(req.db);
  const { User, Session } = req.db.ecommerce.models;
  let token;
  console.log("extending the token");

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }
  console.log("first token:", token);

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);
    const session = await Session.findOne({
      where: { userId: decoded.id, deviceId: decoded.deviceId },
    });
    console.log(session.sessionToken);

    if (!session) {
      res.clearCookie("token");
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
    console.log("updating here :", newToken);

    await session.update({ sessionToken: newToken });

    const session1 = await Session.findOne({
      where: { userId: decoded.id, deviceId: decoded.deviceId },
    });
    console.log(session1);
    res.cookie("token", newToken, {
      maxAge: process.env.JWT_EXPIRE,
      httpOnly: true,
    });

    next();
  } catch (err) {
    console.log("try this shit");
    return next();
  }
});
