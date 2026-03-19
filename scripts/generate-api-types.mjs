#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dashboardRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const openapiPath = resolve(dashboardRoot, "generated/openapi.json");
const generatedTypesPath = resolve(dashboardRoot, "src/types/api-generated.ts");
const openapiTypescriptBin =
  process.platform === "win32"
    ? resolve(dashboardRoot, "node_modules/.bin/openapi-typescript.cmd")
    : resolve(dashboardRoot, "node_modules/.bin/openapi-typescript");

function resolveBotRepoPath() {
  const configuredPath = process.env.CRYPTO_BOT_REPO_PATH;
  const defaultSiblingPath = resolve(dashboardRoot, "..", "crypto-trading-bot");
  const candidates = [configuredPath, defaultSiblingPath].filter(Boolean);

  for (const candidate of candidates) {
    const appPath = join(candidate, "src/api/app.py");
    if (existsSync(appPath)) {
      return candidate;
    }
  }

  throw new Error(
    [
      "Bot repository not found.",
      "Set CRYPTO_BOT_REPO_PATH to a checkout containing src/api/app.py,",
      `or place the bot repo at ${defaultSiblingPath}.`,
    ].join(" "),
  );
}

function exportOpenApiSpec(botRepoPath) {
  const pythonCommands = process.env.PYTHON
    ? [process.env.PYTHON]
    : ["python", "python3"];
  const pythonScript =
    'import json; from src.api.app import create_app; print(json.dumps(create_app().openapi(), indent=2))';
  const errors = [];

  for (const command of pythonCommands) {
    try {
      return execFileSync(command, ["-c", pythonScript], {
        cwd: botRepoPath,
        encoding: "utf8",
        env: {
          ...process.env,
          CRYPTO_BOT_TESTING: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      errors.push(error);
    }
  }

  const meaningfulError =
    errors.find((error) => error.code !== "ENOENT") ?? errors[0];
  throw meaningfulError ?? new Error("Unable to find a Python interpreter.");
}

function main() {
  const botRepoPath = resolveBotRepoPath();
  const rawSpec = exportOpenApiSpec(botRepoPath).trimEnd();
  const spec = JSON.parse(rawSpec);

  mkdirSync(dirname(openapiPath), { recursive: true });
  writeFileSync(openapiPath, `${rawSpec}\n`);

  execFileSync(openapiTypescriptBin, [openapiPath, "-o", generatedTypesPath], {
    cwd: dashboardRoot,
    stdio: "inherit",
  });

  const pathCount = Object.keys(spec.paths ?? {}).length;
  const schemaCount = Object.keys(spec.components?.schemas ?? {}).length;
  console.log(
    `Generated OpenAPI spec (${pathCount} paths, ${schemaCount} schemas) from ${botRepoPath}`,
  );
}

main();
