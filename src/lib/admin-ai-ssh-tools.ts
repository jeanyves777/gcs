import { Client as SSHClient } from "ssh2";
import { readFileSync } from "fs";

const SERVER_HOST = "72.62.3.184";
const SERVER_USER = "root";
const APP_DIR = "/var/www/gcs";

function getPrivateKey(): string {
  // Try env var first (base64-encoded), then fallback to file
  if (process.env.GCS_SERVER_SSH_KEY) {
    return Buffer.from(process.env.GCS_SERVER_SSH_KEY, "base64").toString("utf-8");
  }
  // Fallback: read from ~/.ssh/gcs_server
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return readFileSync(`${home}/.ssh/gcs_server`, "utf-8");
}

function connectSSH(): Promise<SSHClient> {
  return new Promise((resolve, reject) => {
    const conn = new SSHClient();
    const timeout = setTimeout(() => {
      conn.end();
      reject(new Error("SSH connection timed out after 15s"));
    }, 15000);

    conn.on("ready", () => {
      clearTimeout(timeout);
      resolve(conn);
    });
    conn.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    conn.connect({
      host: SERVER_HOST,
      port: 22,
      username: SERVER_USER,
      privateKey: getPrivateKey(),
    });
  });
}

function execCommand(
  conn: SSHClient,
  command: string,
  timeoutMs = 60000
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Command timed out after ${timeoutMs / 1000}s`)),
      timeoutMs
    );

    conn.exec(command, (err, stream) => {
      if (err) {
        clearTimeout(timer);
        reject(err);
        return;
      }

      let stdout = "";
      let stderr = "";

      stream.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
      stream.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      stream.on("close", (code: number) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, code: code || 0 });
      });
    });
  });
}

async function withSSH<T>(fn: (conn: SSHClient) => Promise<T>): Promise<T> {
  const conn = await connectSSH();
  try {
    return await fn(conn);
  } finally {
    conn.end();
  }
}

// =============================================================
// Tool Executors
// =============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolInput = Record<string, any>;

export async function sshListFiles(input: ToolInput): Promise<string> {
  return withSSH(async (conn) => {
    const dir = input.path || APP_DIR;
    const cmd = input.pattern
      ? `find ${JSON.stringify(dir)} -maxdepth 3 -name ${JSON.stringify(input.pattern)} 2>/dev/null | head -100`
      : `ls -la ${JSON.stringify(dir)} 2>&1`;
    const result = await execCommand(conn, cmd);
    return JSON.stringify({ files: result.stdout.trim(), error: result.stderr.trim() || undefined });
  });
}

export async function sshReadFile(input: ToolInput): Promise<string> {
  return withSSH(async (conn) => {
    const cmd = input.lines
      ? `head -n ${input.lines} ${JSON.stringify(input.path)} 2>&1`
      : `cat ${JSON.stringify(input.path)} 2>&1`;
    const result = await execCommand(conn, cmd);
    if (result.code !== 0) {
      return JSON.stringify({ error: result.stderr.trim() || result.stdout.trim() });
    }
    return JSON.stringify({ content: result.stdout, lines: result.stdout.split("\n").length });
  });
}

export async function sshWriteFile(input: ToolInput): Promise<string> {
  return withSSH(async (conn) => {
    // Create parent directories if needed
    const dir = input.path.substring(0, input.path.lastIndexOf("/"));
    if (dir) {
      await execCommand(conn, `mkdir -p ${JSON.stringify(dir)}`);
    }
    // Use base64 to safely transfer content
    const b64 = Buffer.from(input.content).toString("base64");
    const result = await execCommand(conn, `echo ${JSON.stringify(b64)} | base64 -d > ${JSON.stringify(input.path)}`);
    if (result.code !== 0) {
      return JSON.stringify({ error: result.stderr.trim() });
    }
    // Verify
    const verify = await execCommand(conn, `wc -l < ${JSON.stringify(input.path)} && wc -c < ${JSON.stringify(input.path)}`);
    const [lines, bytes] = verify.stdout.trim().split("\n");
    return JSON.stringify({ success: true, path: input.path, lines: parseInt(lines), bytes: parseInt(bytes) });
  });
}

export async function sshEditFile(input: ToolInput): Promise<string> {
  return withSSH(async (conn) => {
    // Read current content
    const readResult = await execCommand(conn, `cat ${JSON.stringify(input.path)} 2>&1`);
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
    const writeResult = await execCommand(conn, `echo ${JSON.stringify(b64)} | base64 -d > ${JSON.stringify(input.path)}`);
    if (writeResult.code !== 0) {
      return JSON.stringify({ error: writeResult.stderr.trim() });
    }

    return JSON.stringify({
      success: true,
      path: input.path,
      replacements: input.replace_all ? occurrences : 1,
    });
  });
}

export async function sshCreateDirectory(input: ToolInput): Promise<string> {
  return withSSH(async (conn) => {
    const result = await execCommand(conn, `mkdir -p ${JSON.stringify(input.path)} && echo "created"`);
    if (result.code !== 0) {
      return JSON.stringify({ error: result.stderr.trim() });
    }
    return JSON.stringify({ success: true, path: input.path });
  });
}

export async function sshDeleteFile(input: ToolInput): Promise<string> {
  return withSSH(async (conn) => {
    const cmd = input.recursive
      ? `rm -rf ${JSON.stringify(input.path)}`
      : `rm -f ${JSON.stringify(input.path)}`;
    const result = await execCommand(conn, cmd);
    if (result.code !== 0) {
      return JSON.stringify({ error: result.stderr.trim() });
    }
    return JSON.stringify({ success: true, deleted: input.path });
  });
}

export async function sshSearchCode(input: ToolInput): Promise<string> {
  return withSSH(async (conn) => {
    const searchPath = input.path || APP_DIR + "/src";
    let cmd = `grep -rn ${JSON.stringify(input.pattern)} ${JSON.stringify(searchPath)}`;
    if (input.file_pattern) {
      cmd += ` --include=${JSON.stringify(input.file_pattern)}`;
    }
    cmd += " 2>/dev/null | head -50";
    const result = await execCommand(conn, cmd);
    const matches = result.stdout.trim().split("\n").filter(Boolean);
    return JSON.stringify({ matches, count: matches.length });
  });
}

export async function sshRunCommand(input: ToolInput): Promise<string> {
  return withSSH(async (conn) => {
    const cwd = input.cwd || APP_DIR;
    const timeout = input.timeout || 120000;
    const cmd = `cd ${JSON.stringify(cwd)} && ${input.command}`;
    const result = await execCommand(conn, cmd, timeout);
    return JSON.stringify({
      stdout: result.stdout.substring(0, 10000), // Cap output at 10KB
      stderr: result.stderr.substring(0, 5000),
      exitCode: result.code,
    });
  });
}

export async function sshInstallPackage(input: ToolInput): Promise<string> {
  return withSSH(async (conn) => {
    const flag = input.dev ? " --save-dev" : "";
    const cmd = `cd ${APP_DIR} && npm install ${input.packages}${flag} 2>&1`;
    const result = await execCommand(conn, cmd, 120000);
    return JSON.stringify({
      stdout: result.stdout.substring(0, 5000),
      stderr: result.stderr.substring(0, 2000),
      exitCode: result.code,
      success: result.code === 0,
    });
  });
}

export async function sshGitStatus(): Promise<string> {
  return withSSH(async (conn) => {
    const [status, diff, log] = await Promise.all([
      execCommand(conn, `cd ${APP_DIR} && git status --short 2>&1`),
      execCommand(conn, `cd ${APP_DIR} && git diff --stat 2>&1`),
      execCommand(conn, `cd ${APP_DIR} && git log --oneline -10 2>&1`),
    ]);
    return JSON.stringify({
      status: status.stdout.trim(),
      diff: diff.stdout.trim(),
      recentCommits: log.stdout.trim(),
    });
  });
}

export async function sshGitCommitAndPush(input: ToolInput): Promise<string> {
  return withSSH(async (conn) => {
    // Stage files
    const addCmd = input.files?.length
      ? `cd ${APP_DIR} && git add ${(input.files as string[]).map((f: string) => JSON.stringify(f)).join(" ")}`
      : `cd ${APP_DIR} && git add -A`;
    await execCommand(conn, addCmd);

    // Commit
    const commitResult = await execCommand(conn, `cd ${APP_DIR} && git commit -m ${JSON.stringify(input.message)} 2>&1`);
    if (commitResult.code !== 0 && !commitResult.stdout.includes("nothing to commit")) {
      return JSON.stringify({ error: commitResult.stderr.trim() || commitResult.stdout.trim() });
    }

    // Push
    const pushResult = await execCommand(conn, `cd ${APP_DIR} && git push origin main 2>&1`, 30000);
    return JSON.stringify({
      success: true,
      commit: commitResult.stdout.trim().substring(0, 500),
      push: pushResult.stdout.trim() + pushResult.stderr.trim(),
    });
  });
}

export async function sshServerRebuild(): Promise<string> {
  return withSSH(async (conn) => {
    // Run build steps WITHOUT pm2 restart (to avoid killing our own process).
    // Steps: git pull → patch schema → npm ci → prisma generate → prisma db push → next build
    // Then schedule a delayed PM2 restart (3s later) so the AI has time to send the response.
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
        echo "✅ Build complete — PM2 will restart in ~3 seconds"
      else
        echo "❌ Build FAILED — PM2 NOT restarted"
      fi
      exit $BUILD_EXIT
    `.trim();

    const result = await execCommand(conn, buildCmd, 300000);
    return JSON.stringify({
      output: result.stdout.substring(0, 8000),
      exitCode: result.code,
      success: result.code === 0,
      note: result.code === 0
        ? "Build succeeded. PM2 will restart in ~3 seconds. The site may be briefly unavailable."
        : "Build failed. PM2 was NOT restarted — the current version is still running.",
    });
  });
}
