import fs from "fs";
import yaml from "js-yaml";
import { program } from "commander";
import process from "node:process";

program
	.version("1.0.0")
	.description("My Node CLI")
	.option("-c, --config <path>", "Path to the configuration file");

program.parse(process.argv);

const options = program.opts();
const configPath = options.config || "./default-config.yml"; // Fallback path

if (!fs.existsSync(configPath)) {
	console.error(`❌ Config file not found: ${configPath}`);
	process.exit(1);
}

// Lazy-loading configuration
let cachedConfig = null;

export function loadConfig() {
	if (!cachedConfig) {
		cachedConfig = yaml.load(fs.readFileSync(configPath, "utf8"));
	}
	return cachedConfig;
}
