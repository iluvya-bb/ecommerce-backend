import fs from "fs";
import path from "path";
import Sequelize from "sequelize";
import { loadConfig } from "../configs/config.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basename = path.basename(__filename);
const conf = loadConfig();
const db = {}; // Initialize db as an object

export async function DB() {
	if (Object.keys(db).length > 0) {
		return db;
	}

	conf.tenant.forEach((tenant) => {
		db[tenant.name] = {
			// @ts-ignore
			sequelize: new Sequelize(tenant.name, tenant.user, tenant.password, {
				host: tenant.host,
				dialect: tenant.dialect,
				logging: false,
				schema: conf.app.name,
			}),
			models: {},
		};
	});

	await Promise.all(
		Object.keys(db).map(async (tenant) => {
			await db[tenant].sequelize.authenticate();

			await db[tenant].sequelize.createSchema(conf.app.name, {
				ifNotExists: true,
			}); // Ensure schema exists

			const modelFiles = fs
				.readdirSync(__dirname)
				.filter(
					(file) =>
						file.indexOf(".") !== 0 &&
						file !== basename &&
						file.slice(-3) === ".js" &&
						file.indexOf(".test.js") === -1,
				);

			for (const file of modelFiles) {
				console.log("Loading :", file);
				const model = (await import(path.join(__dirname, file))).default(
					db[tenant].sequelize,
					Sequelize.DataTypes,
				);
				await db[tenant].sequelize.sync({ alter: true });

				db[tenant].models[model.name] = model;
			}

			Object.keys(db[tenant].models).forEach((modelName) => {
				if (db[tenant].models[modelName].associate) {
					db[tenant].models[modelName].associate(db[tenant].models);
				}
			});
		}),
	);

	console.log("DB Models Loaded");
	console.log(db);
	return db;
}
