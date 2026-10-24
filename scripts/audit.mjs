#!/usr/bin/env node
/**
 * Dependency audit gate.
 *
 * Runs `npm audit --json` and fails on `high` or `critical` advisories unless the
 * affected package is listed in audit-allowlist.json with an owner,
 * reason, and review date. Lower severities are reported but do not block.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const allowlistPath = join(root, 'audit-allowlist.json');
const BLOCKING = new Set(['high', 'critical']);

function fail(message) {
  console.error(`\n[audit] FAIL: ${message}`);
  process.exit(1);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npm, ['audit', '--json'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

if (!result.stdout) {
  console.error(result.stderr || '(no stderr)');
  fail('`npm audit` produced no JSON. The advisory database may be unreachable.');
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  fail('Could not parse `npm audit --json` output.');
}

if (!report.vulnerabilities || typeof report.vulnerabilities !== 'object') {
  fail('`npm audit` output has no vulnerability data. Treating that as an error.');
}

let allowlist;
try {
  allowlist = JSON.parse(readFileSync(allowlistPath, 'utf8'));
} catch (error) {
  fail(`Could not read ${allowlistPath}: ${error.message}`);
}

const allowed = new Map((allowlist.entries ?? []).map((entry) => [entry.package, entry]));
const today = new Date();
const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

const blocking = [];
const reported = [];

for (const [name, vuln] of Object.entries(report.vulnerabilities)) {
  const line = `${vuln.severity.padEnd(8)} ${name}${vuln.isDirect ? ' (direct)' : ''}`;
  if (!BLOCKING.has(vuln.severity)) {
    reported.push(line);
    continue;
  }

  const entry = allowed.get(name);
  if (!entry) {
    blocking.push(line);
    continue;
  }

  if (!entry.owner || !entry.reason || !entry.reviewBy) {
    blocking.push(`${line} - allowlist entry is missing owner, reason, or reviewBy`);
    continue;
  }

  if (Number.isNaN(Date.parse(entry.reviewBy))) {
    blocking.push(`${line} - allowlist reviewBy is not a valid date`);
    continue;
  }

  if (Date.parse(entry.reviewBy) < now) {
    blocking.push(`${line} - allowlist review is due (reviewBy ${entry.reviewBy})`);
    continue;
  }

  console.log(`allowed  ${line} (review by ${entry.reviewBy})`);
  allowed.delete(name);
}

for (const line of reported) {
  console.log(`reported ${line}`);
}

for (const [name] of allowed) {
  console.warn(`[audit] stale allowlist entry: ${name} is no longer reported by npm audit`);
}

if (blocking.length > 0) {
  console.error('\n[audit] Unaccepted high/critical advisories:');
  for (const line of blocking) console.error(`  - ${line}`);
  fail(`${blocking.length} blocking advisor${blocking.length === 1 ? 'y' : 'ies'}.`);
}

const counts = report.metadata?.vulnerabilities ?? {};
console.log(
  `\n[audit] OK: no unaccepted high/critical advisories (high ${counts.high ?? 0}, critical ${counts.critical ?? 0}).`,
);
