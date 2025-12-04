import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { loadConfig } from "./config.js";

export const configurePassport = (db) => {
	const { User } = db.ecommerce.models;
	const config = loadConfig();

	passport.use(
		new GoogleStrategy(
			{
				clientID: process.env.GOOGLE_CLIENT_ID,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET,
				callbackURL: config.google?.callbackURL || "http://localhost:8002/auth/google/callback",
				scope: ["profile", "email"],
			},
			async (accessToken, refreshToken, profile, done) => {
				try {
					// Check if user already exists with this Google ID
					let user = await User.findOne({
						where: { googleId: profile.id },
					});

					if (user) {
						return done(null, user);
					}

					// Check if user exists with same email
					const email = profile.emails?.[0]?.value;
					if (email) {
						user = await User.findOne({
							where: { email: email.toLowerCase() },
						});

						if (user) {
							// Link Google account to existing user
							user.googleId = profile.id;
							if (!user.avatar && profile.photos?.[0]?.value) {
								user.avatar = profile.photos[0].value;
							}
							await user.save();
							return done(null, user);
						}
					}

					// Create new user
					user = await User.create({
						name: profile.displayName || `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim(),
						email: email?.toLowerCase(),
						googleId: profile.id,
						avatar: profile.photos?.[0]?.value || null,
						// No password for OAuth users
					});

					return done(null, user);
				} catch (error) {
					return done(error, null);
				}
			}
		)
	);

	// Serialize user for session
	passport.serializeUser((user, done) => {
		done(null, user.id);
	});

	// Deserialize user from session
	passport.deserializeUser(async (id, done) => {
		try {
			const user = await User.findByPk(id);
			done(null, user);
		} catch (error) {
			done(error, null);
		}
	});

	return passport;
};

export default passport;
