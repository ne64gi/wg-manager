import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDir = path.resolve(__dirname, "..");
const packageFile = path.join(frontendDir, "package.json");
const versionCandidates = [
  path.join(frontendDir, "VERSION"),
  path.join(path.resolve(frontendDir, ".."), "VERSION"),
];

const versionFile = versionCandidates.find((candidate) => fs.existsSync(candidate));
if (!versionFile) {
  throw new Error("Could not find VERSION file");
}

const version = fs.readFileSync(versionFile, "utf-8").trim();
const packageJson = JSON.parse(fs.readFileSync(packageFile, "utf-8"));

if (!version) {
  throw new Error("VERSION file is empty");
}

if (packageJson.version !== version) {
  packageJson.version = version;
  fs.writeFileSync(packageFile, `${JSON.stringify(packageJson, null, 2)}\n`, "utf-8");
  console.log(`Synced frontend package version to ${version}`);
}
