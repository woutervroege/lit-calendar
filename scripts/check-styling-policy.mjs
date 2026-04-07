import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_REF = process.env.STYLING_POLICY_BASE_REF ?? "origin/main";
const COMPONENTS_SRC_PREFIX = "packages/components/src/";
const EXCEPTION_TOKEN = "tailwind-exception:";
const TAILWIND_APPLY_TOKEN = "@apply";

function run(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

function getChangedFiles() {
  const diffFilter = "--diff-filter=ACMR";
  const commands = [
    `git diff --name-only ${diffFilter} ${BASE_REF}...HEAD`,
    `git diff --name-only ${diffFilter} HEAD~1...HEAD`,
  ];

  for (const command of commands) {
    try {
      const output = run(command);
      if (!output) {
        continue;
      }
      return output
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean);
    } catch {
      // Try fallback command.
    }
  }

  return [];
}

function readFile(relativePath) {
  const absolutePath = resolve(process.cwd(), relativePath);
  if (!existsSync(absolutePath)) {
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function fileExists(relativePath) {
  const absolutePath = resolve(process.cwd(), relativePath);
  return existsSync(absolutePath);
}

function isComponentSourceFile(path) {
  return path.startsWith(COMPONENTS_SRC_PREFIX);
}

function isCssFile(path) {
  return path.endsWith(".css");
}

function isTypeScriptFile(path) {
  return path.endsWith(".ts") || path.endsWith(".tsx");
}

function hasExceptionMarker(content) {
  return content.includes(EXCEPTION_TOKEN);
}

function hasStaticStyles(content) {
  return /static\s+styles\s*=/m.test(content);
}

function hasTailwindStylesheetPattern(content) {
  return (
    content.includes(TAILWIND_APPLY_TOKEN) ||
    /@import\s+["']tailwindcss["'];?/m.test(content) ||
    /@layer\s+(base|components|utilities)\b/m.test(content)
  );
}

function validate(changedFiles) {
  const violations = [];

  for (const filePath of changedFiles) {
    if (!fileExists(filePath)) {
      continue;
    }

    if (!isComponentSourceFile(filePath)) {
      continue;
    }

    const content = readFile(filePath);

    if (isCssFile(filePath)) {
      const isTailwindStylesheet = hasTailwindStylesheetPattern(content);
      if (!isTailwindStylesheet && !hasExceptionMarker(content)) {
        violations.push(
          `${filePath}\n  CSS files must use Tailwind directives (for example "${TAILWIND_APPLY_TOKEN}") or include /* ${EXCEPTION_TOKEN} <reason> */.`
        );
      }
    }

    if (isTypeScriptFile(filePath)) {
      const hasInlineStaticStyles = hasStaticStyles(content);
      if (hasInlineStaticStyles && !hasExceptionMarker(content)) {
        violations.push(
          `${filePath}\n  Uses static styles without "${EXCEPTION_TOKEN}" rationale. Prefer stylesheet + ${TAILWIND_APPLY_TOKEN}.`
        );
      }
    }
  }

  return violations;
}

function main() {
  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    console.log("style-policy: no changed files to validate.");
    return;
  }

  const violations = validate(changedFiles);
  if (violations.length === 0) {
    console.log("style-policy: passed.");
    return;
  }

  console.error("style-policy: failed.\n");
  console.error(
    "Tailwind-first policy violation in changed files.\nUse stylesheet Tailwind directives (for example @apply), or add a documented exception marker for raw CSS/static styles:\n"
  );
  console.error(`  ${TAILWIND_APPLY_TOKEN}\n  /* ${EXCEPTION_TOKEN} <reason> */\n`);
  console.error("Violations:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  console.error("\nSee STYLING_MIGRATION_POLICY.md for allowed exceptions and enforcement rules.");
  process.exit(1);
}

main();
