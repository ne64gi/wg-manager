import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const versionCandidates = [
  path.resolve(__dirname, "..", "VERSION"),
  path.resolve(__dirname, "VERSION"),
];

const resolvedVersionFile = versionCandidates.find((candidate) =>
  fs.existsSync(candidate),
);
const systemVersion = resolvedVersionFile
  ? fs.readFileSync(resolvedVersionFile, "utf-8").trim()
  : "0.1.0";

export default defineConfig({
  base: "/wg-studio/",
  define: {
    __WG_STUDIO_VERSION__: JSON.stringify(systemVersion),
  },
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3900,
  },
  preview: {
    host: "0.0.0.0",
    port: 3900,
  },
});
