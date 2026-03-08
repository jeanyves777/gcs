/**
 * Server tool executors for the GCS admin AI.
 *
 * These functions build shell commands and execute them on the production
 * server via execOnServer() — which routes through the local daemon in
 * production or falls back to SSH for local development.
 */

import { execOnServer } from "./admin-ai-exec";

const APP_DIR = "/var/www/gcs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolInput = Record<string, any>;

export async function sshListFiles(input: ToolInput): Promise<string> {
  const dir = input.path || APP_DIR;
  const cmd = input.pattern
    ? `find ${JSON.stringify(dir)} -maxdepth 3 -name ${JSON.stringify(input.pattern)} 2>/dev/null | head -100`
    : `ls -la ${JSON.stringify(dir)} 2>&1`;
  const result = await execOnServer(cmd);
  return JSON.stringify({ files: result.stdout.trim(), error: result.stderr.trim() || undefined });
}

export async function sshReadFile(input: ToolInput): Promise<string> {
  const cmd = input.lines
    ? `head -n ${input.lines} ${JSON.stringify(input.path)} 2>&1`
    : `cat ${JSON.stringify(input.path)} 2>&1`;
  const result = await execOnServer(cmd);
  if (result.code !== 0) {
    return JSON.stringify({ error: result.stderr.trim() || result.stdout.trim() });
  }
  return JSON.stringify({ content: result.stdout, lines: result.stdout.split("\n").length });
}

export async function sshWriteFile(input: ToolInput): Promise<string> {
  if (!input.path || typeof input.path !== "string") {
    return JSON.stringify({ error: "path (string) is required" });
  }
  if (input.content == null || typeof input.content !== "string") {
    return JSON.stringify({ error: "content (string) is required — the file content may have been too large and got truncated" });
  }
  // Create parent directories if needed
  const dir = input.path.substring(0, input.path.lastIndexOf("/"));
  if (dir) {
    await execOnServer(`mkdir -p ${JSON.stringify(dir)}`);
  }
  // Use base64 to safely transfer content
  const b64 = Buffer.from(input.content).toString("base64");
  const result = await execOnServer(`echo ${JSON.stringify(b64)} | base64 -d > ${JSON.stringify(input.path)}`);
  if (result.code !== 0) {
    return JSON.stringify({ error: result.stderr.trim() });
  }
  // Verify
  const verify = await execOnServer(`wc -l < ${JSON.stringify(input.path)} && wc -c < ${JSON.stringify(input.path)}`);
  const [lines, bytes] = verify.stdout.trim().split("\n");
  return JSON.stringify({ success: true, path: input.path, lines: parseInt(lines), bytes: parseInt(bytes) });
}

export async function sshEditFile(input: ToolInput): Promise<string> {
  if (!input.path || typeof input.path !== "string") {
    return JSON.stringify({ error: "path (string) is required" });
  }
  if (input.old_string == null || typeof input.old_string !== "string") {
    return JSON.stringify({ error: "old_string (string) is required" });
  }
  if (input.new_string == null || typeof input.new_string !== "string") {
    return JSON.stringify({ error: "new_string (string) is required" });
  }
  // Read current content
  const readResult = await execOnServer(`cat ${JSON.stringify(input.path)} 2>&1`);
  if (readResult.code !== 0) {
    return JSON.stringify({ error: `File not found: ${readResult.stderr.trim()}` });
  }

  const content = readResult.stdout;
  const occurrences = content.split(input.old_string).length - 1;

  if (occurrences === 0) {
    return JSON.stringify({ error: "old_string not found in file", searched_for: input.old_string.substring(0, 100) });
  }

  let newContent: string;
  if (input.replace_all) {
    newContent = content.split(input.old_string).join(input.new_string);
  } else {
    if (occurrences > 1) {
      return JSON.stringify({ error: `old_string found ${occurrences} times. Use replace_all or provide more context to make it unique.` });
    }
    newContent = content.replace(input.old_string, input.new_string);
  }

  // Write back using base64
  const b64 = Buffer.from(newContent).toString("base64");
  const writeResult = await execOnServer(`echo ${JSON.stringify(b64)} | base64 -d > ${JSON.stringify(input.path)}`);
  if (writeResult.code !== 0) {
    return JSON.stringify({ error: writeResult.stderr.trim() });
  }

  return JSON.stringify({
    success: true,
    path: input.path,
    replacements: input.replace_all ? occurrences : 1,
  });
}

export async function sshCreateDirectory(input: ToolInput): Promise<string> {
  const result = await execOnServer(`mkdir -p ${JSON.stringify(input.path)} && echo "created"`);
  if (result.code !== 0) {
    return JSON.stringify({ error: result.stderr.trim() });
  }
  return JSON.stringify({ success: true, path: input.path });
}

export async function sshDeleteFile(input: ToolInput): Promise<string> {
  const cmd = input.recursive
    ? `rm -rf ${JSON.stringify(input.path)}`
    : `rm -f ${JSON.stringify(input.path)}`;
  const result = await execOnServer(cmd);
  if (result.code !== 0) {
    return JSON.stringify({ error: result.stderr.trim() });
  }
  return JSON.stringify({ success: true, deleted: input.path });
}

export async function sshSearchCode(input: ToolInput): Promise<string> {
  const searchPath = input.path || APP_DIR + "/src";
  let cmd = `grep -rn ${JSON.stringify(input.pattern)} ${JSON.stringify(searchPath)}`;
  if (input.file_pattern) {
    cmd += ` --include=${JSON.stringify(input.file_pattern)}`;
  }
  cmd += " 2>/dev/null | head -50";
  const result = await execOnServer(cmd);
  const matches = result.stdout.trim().split("\n").filter(Boolean);
  return JSON.stringify({ matches, count: matches.length });
}

export async function sshRunCommand(input: ToolInput): Promise<string> {
  // Block psql queries against GuardCommand — AI must use check_agent_command instead
  const cmdLower = (input.command || "").toLowerCase();
  if (cmdLower.includes("guardcommand") && (cmdLower.includes("psql") || cmdLower.includes("select"))) {
    return JSON.stringify({
      stdout: "",
      stderr: "BLOCKED: Do not query GuardCommand via psql. Use the check_agent_command tool instead — it waits for the result automatically and returns the real server output.",
      exitCode: 1,
    });
  }

  const cwd = input.cwd || APP_DIR;
  const timeout = input.timeout || 120000;
  const cmd = `cd ${JSON.stringify(cwd)} && ${input.command}`;
  const result = await execOnServer(cmd, timeout);
  return JSON.stringify({
    stdout: result.stdout.substring(0, 10000),
    stderr: result.stderr.substring(0, 5000),
    exitCode: result.code,
  });
}

export async function sshInstallPackage(input: ToolInput): Promise<string> {
  const flag = input.dev ? " --save-dev" : "";
  const cmd = `cd ${APP_DIR} && npm install ${input.packages}${flag} 2>&1`;
  const result = await execOnServer(cmd, 120000);
  return JSON.stringify({
    stdout: result.stdout.substring(0, 5000),
    stderr: result.stderr.substring(0, 2000),
    exitCode: result.code,
    success: result.code === 0,
  });
}

export async function sshGitStatus(): Promise<string> {
  const [status, diff, log] = await Promise.all([
    execOnServer(`cd ${APP_DIR} && git status --short 2>&1`),
    execOnServer(`cd ${APP_DIR} && git diff --stat 2>&1`),
    execOnServer(`cd ${APP_DIR} && git log --oneline -10 2>&1`),
  ]);
  return JSON.stringify({
    status: status.stdout.trim(),
    diff: diff.stdout.trim(),
    recentCommits: log.stdout.trim(),
  });
}

export async function sshGitCommitAndPush(input: ToolInput): Promise<string> {
  // Stage files
  const addCmd = input.files?.length
    ? `cd ${APP_DIR} && git add ${(input.files as string[]).map((f: string) => JSON.stringify(f)).join(" ")}`
    : `cd ${APP_DIR} && git add -A`;
  await execOnServer(addCmd);

  // Commit
  const commitResult = await execOnServer(`cd ${APP_DIR} && git commit -m ${JSON.stringify(input.message)} 2>&1`);
  if (commitResult.code !== 0 && !commitResult.stdout.includes("nothing to commit")) {
    return JSON.stringify({ error: commitResult.stderr.trim() || commitResult.stdout.trim() });
  }

  // Push
  const pushResult = await execOnServer(`cd ${APP_DIR} && git push origin main 2>&1`, 30000);
  return JSON.stringify({
    success: true,
    commit: commitResult.stdout.trim().substring(0, 500),
    push: pushResult.stdout.trim() + pushResult.stderr.trim(),
  });
}

export async function sshServerRebuild(): Promise<string> {
  const buildCmd = `
    source /root/.nvm/nvm.sh
    cd ${APP_DIR}
    echo "==> Pulling latest..."
    git stash 2>/dev/null
    git pull origin main 2>&1
    sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
    echo "==> Installing deps..."
    npm ci --legacy-peer-deps 2>&1
    echo "==> Prisma generate..."
    npx prisma generate 2>&1
    echo "==> DB push..."
    npx prisma db push 2>&1
    echo "==> Building..."
    npm run build 2>&1
    BUILD_EXIT=$?
    if [ $BUILD_EXIT -eq 0 ]; then
      echo "==> Build succeeded! Scheduling PM2 restart in 3s..."
      nohup bash -c 'sleep 3 && source /root/.nvm/nvm.sh && pm2 restart gcs --update-env' > /dev/null 2>&1 &
      echo "Build complete — PM2 will restart in ~3 seconds"
    else
      echo "Build FAILED — PM2 NOT restarted"
    fi
    exit $BUILD_EXIT
  `.trim();

  const result = await execOnServer(buildCmd, 300000);
  return JSON.stringify({
    output: result.stdout.substring(0, 8000),
    exitCode: result.code,
    success: result.code === 0,
    note: result.code === 0
      ? "Build succeeded. PM2 will restart in ~3 seconds. The site may be briefly unavailable."
      : "Build failed. PM2 was NOT restarted — the current version is still running.",
  });
}
