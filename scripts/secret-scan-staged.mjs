import { execFileSync } from "node:child_process";

/**
 * Lightweight staged secret scanner (no external dependencies).
 *
 * Goal:
 * - Prevent accidental commits of high-risk secrets (private keys, service role keys, etc.).
 * - Avoid printing secret material to stdout/stderr.
 *
 * Notes:
 * - This is NOT a substitute for proper CI secret scanning (see gitleaks workflow).
 * - We intentionally keep patterns conservative to reduce false positives.
 */

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function getStagedFiles() {
  const out = runGit(["diff", "--cached", "--name-only", "--diff-filter=ACM"]);
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getStagedFileContent(path) {
  // ":" prefix means "index" (staged) content
  return execFileSync("git", ["show", `:${path}`]);
}

function isProbablyBinary(buf) {
  // Heuristic: binary files commonly contain NUL bytes
  return buf.includes(0);
}

const blockedFilePatterns = [
  // Never commit real env files.
  { id: "env_file", re: /^\.env(\..+)?$/i, message: "Do not commit .env files." },
  { id: "env_local", re: /^\.env\.local$/i, message: "Do not commit .env.local." },
  { id: "env_development", re: /^\.env\.development(\..+)?$/i, message: "Do not commit dev env files." },
  { id: "env_production", re: /^\.env\.production(\..+)?$/i, message: "Do not commit prod env files." },
];

const blockedContentRules = [
  { id: "private_key_block", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { id: "supabase_service_role", re: /\bSUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/ },
  { id: "jwt_like", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { id: "github_pat", re: /\bghp_[A-Za-z0-9]{20,}\b/ },
  { id: "github_fine_grained_pat", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { id: "aws_access_key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "aws_secret_like", re: /\baws_secret_access_key\b/i },
  { id: "stripe_live", re: /\bsk_live_[A-Za-z0-9]{16,}\b/ },
  { id: "slack_token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
];

function main() {
  const files = getStagedFiles();
  if (files.length === 0) return;

  /** @type {Array<{file: string; ruleId: string; message: string}>} */
  const findings = [];

  for (const file of files) {
    // Allow env.example by design (template).
    if (file === "env.example") continue;

    const base = file.split("/").pop() ?? file;

    for (const rule of blockedFilePatterns) {
      if (rule.re.test(base)) {
        findings.push({ file, ruleId: rule.id, message: rule.message });
      }
    }

    let buf;
    try {
      buf = getStagedFileContent(file);
    } catch {
      // If file can't be read from index, skip.
      continue;
    }

    if (isProbablyBinary(buf)) continue;

    const text = buf.toString("utf8");

    for (const rule of blockedContentRules) {
      if (rule.re.test(text)) {
        findings.push({
          file,
          ruleId: rule.id,
          message: "Potential secret pattern detected in staged content.",
        });
      }
    }
  }

  if (findings.length === 0) return;

  // Do not print any matched values to avoid leaking secrets.
  const lines = [
    "Pre-commit blocked: potential secret detected in staged changes.",
    "Resolve findings below, then retry commit:",
    "",
    ...findings.map((f) => `- ${f.file} (${f.ruleId}): ${f.message}`),
    "",
    "If this is a false positive, remove the risky pattern or move it to a safe template (e.g. env.example).",
  ];

  console.error(lines.join("\n"));
  process.exit(1);
}

main();


