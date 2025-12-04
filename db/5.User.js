"use strict";
import { Model } from "sequelize";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export default (sequelize, DataTypes) => {
	class User extends Model {
		static associate(models) {
			User.hasMany(models.Order, {
				foreignKey: "userId",
				as: "orders",
			});
		}

		// Generate password reset token
		generatePasswordResetToken() {
			const resetToken = crypto.randomBytes(32).toString("hex");
			this.passwordResetToken = crypto
				.createHash("sha256")
				.update(resetToken)
				.digest("hex");
			this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
			return resetToken;
		}
	}

	User.init(
		{
			name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			email: {
				type: DataTypes.STRING,
				unique: true,
				allowNull: false,
			},
			phone: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			password: {
				type: DataTypes.STRING,
				allowNull: true, // Allow null for OAuth users
			},
			googleId: {
				type: DataTypes.STRING,
				allowNull: true,
				unique: true,
			},
			avatar: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			role: {
				type: DataTypes.STRING,
				defaultValue: "user",
			},
			passwordResetToken: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			passwordResetExpires: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "User",
		},
	);

	User.beforeSave(async (user, options) => {
		if (user.changed("password") && user.password) {
			const salt = await bcrypt.genSalt(10);
			user.password = await bcrypt.hash(user.password, salt);
		}
	});

	User.prototype.matchPassword = async function (enteredPassword) {
		if (!this.password) return false; // OAuth users without password
		return await bcrypt.compare(enteredPassword, this.password);
	};

	return User;
};
