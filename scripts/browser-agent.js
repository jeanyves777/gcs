#!/usr/bin/env node
/**
 * GCS Browser Agent — Standalone Puppeteer automation with stealth + human-like behavior.
 *
 * Runs on the production server. Receives a base64-encoded JSON command as CLI arg,
 * executes browser actions, outputs JSON to stdout.
 *
 * Usage: node browser-agent.js <base64-encoded-JSON>
 *
 * Commands:
 *   { command: "open", url?, viewport? }
 *   { command: "action", sessionId, actions: [...] }
 *   { command: "close", sessionId }
 *   { command: "list" }
 */

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

puppeteer.use(StealthPlugin());

// ─── Config ──────────────────────────────────────────────────────────────────
const SESSIONS_DIR = "/tmp/gcs-browser-sessions";
const SCREENSHOTS_DIR = "/var/www/gcs/public/uploads/screenshots";
const LOG_FILE = "/var/log/gcs-browser-agent.log";
const MAX_SESSIONS = 3;
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes idle
const ACTION_TIMEOUT_MS = 30 * 1000; // 30 seconds per action
const MAX_EVALUATE_OUTPUT = 10 * 1024; // 10KB

// Detect Chromium path
const CHROMIUM_PATHS = [
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
];

function findChromium() {
  for (const p of CHROMIUM_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Chromium not found. Install with: apt install chromium-browser");
}

// ─── User-Agent Pool ─────────────────────────────────────────────────────────
const USER_AGENTS = [
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ─── Logging ─────────────────────────────────────────────────────────────────
function log(message) {
  const entry = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(LOG_FILE, entry);
  } catch {
    // Log dir may not exist, ignore
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────
function randomDelay(min, max) {
  return new Promise((r) =>
    setTimeout(r, min + Math.floor(Math.random() * (max - min)))
  );
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Session Management ─────────────────────────────────────────────────────
function getSessionDir(sessionId) {
  return path.join(SESSIONS_DIR, sessionId);
}

function getMetaPath(sessionId) {
  return path.join(getSessionDir(sessionId), "meta.json");
}

function readMeta(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(getMetaPath(sessionId), "utf-8"));
  } catch {
    return null;
  }
}

function writeMeta(sessionId, meta) {
  ensureDir(getSessionDir(sessionId));
  fs.writeFileSync(getMetaPath(sessionId), JSON.stringify(meta, null, 2));
}

function listActiveSessions() {
  ensureDir(SESSIONS_DIR);
  const sessions = [];
  for (const dir of fs.readdirSync(SESSIONS_DIR)) {
    const meta = readMeta(dir);
    if (meta) {
      // Check if process is still alive
      try {
        process.kill(meta.pid, 0);
        sessions.push({ sessionId: dir, ...meta });
      } catch {
        // Process dead, clean up
        cleanupSession(dir);
      }
    }
  }
  return sessions;
}

function cleanupSession(sessionId) {
  const meta = readMeta(sessionId);
  if (meta) {
    try {
      process.kill(meta.pid, "SIGKILL");
    } catch {
      // Already dead
    }
  }
  const dir = getSessionDir(sessionId);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore
  }
}

function cleanupStaleSessions() {
  const sessions = listActiveSessions();
  const now = Date.now();
  for (const s of sessions) {
    const idle = now - new Date(s.lastActivity).getTime();
    if (idle > SESSION_TIMEOUT_MS) {
      log(`Cleaning up stale session ${s.sessionId} (idle ${Math.round(idle / 1000)}s)`);
      cleanupSession(s.sessionId);
    }
  }
}

// ─── Page Configuration (Anti-Detection Headers) ────────────────────────────
async function configurePage(page, userAgent) {
  await page.setUserAgent(userAgent);

  // Realistic HTTP headers
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
    "DNT": "1",
    "Sec-CH-UA": '"Chromium";v="131", "Google Chrome";v="131", "Not?A_Brand";v="99"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Linux"',
    "Sec-CH-UA-Platform-Version": '"6.8.0"',
    "Sec-CH-UA-Full-Version-List":
      '"Chromium";v="131.0.6778.139", "Google Chrome";v="131.0.6778.139"',
    "Upgrade-Insecure-Requests": "1",
  });

  // Timezone + navigator patches
  await page.emulateTimezone("America/New_York");
  await page.evaluateOnNewDocument(() => {
    // navigator.connection
    Object.defineProperty(navigator, "connection", {
      get: () => ({
        effectiveType: "4g",
        rtt: 50,
        downlink: 10,
        saveData: false,
      }),
    });
    // navigator.getBattery
    if (!navigator.getBattery) {
      navigator.getBattery = () =>
        Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 0.97,
        });
    }
    // Screen properties
    Object.defineProperty(screen, "colorDepth", { get: () => 24 });
    Object.defineProperty(screen, "pixelDepth", { get: () => 24 });
  });
}

// ─── Human-Like Actions ─────────────────────────────────────────────────────

async function humanType(page, selector, text, options = {}) {
  const el = await page.waitForSelector(selector, { timeout: ACTION_TIMEOUT_MS });
  if (!el) throw new Error(`Element not found: ${selector}`);

  if (options.clear) {
    await el.click({ clickCount: 3 }); // select all
    await randomDelay(100, 250);
    await page.keyboard.press("Backspace");
    await randomDelay(100, 200);
  }

  await el.click(); // focus
  await randomDelay(200, 600); // pause before typing

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    await page.keyboard.type(char, { delay: 0 });
    // Natural inter-keystroke delay (60-80 WPM)
    await randomDelay(40, 140);
    // Occasional longer pause (thinking/correcting ~5% of the time)
    if (Math.random() < 0.05) {
      await randomDelay(300, 900);
    }
  }
  await randomDelay(200, 600); // pause after typing
}

async function humanClick(page, selector) {
  const el = await page.waitForSelector(selector, {
    visible: true,
    timeout: ACTION_TIMEOUT_MS,
  });
  if (!el) throw new Error(`Element not found: ${selector}`);

  const box = await el.boundingBox();
  if (!box) throw new Error(`Element has no bounding box: ${selector}`);

  // Random point within element (not dead center — humans don't click perfectly centered)
  const x = box.x + box.width * (0.25 + Math.random() * 0.5);
  const y = box.y + box.height * (0.25 + Math.random() * 0.5);

  // Smooth mouse movement with random steps
  const steps = 8 + Math.floor(Math.random() * 20);
  await page.mouse.move(x, y, { steps });
  await randomDelay(50, 250); // hover pause
  await page.mouse.click(x, y);
  await randomDelay(300, 1000); // post-click pause
}

async function humanNavigate(page, url) {
  await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
  await randomDelay(1000, 3000); // "looking at the page" pause
}

async function humanScroll(page, direction, amount = 400) {
  const delta = direction === "up" ? -amount : amount;
  // Smooth scroll in small increments
  const steps = 3 + Math.floor(Math.random() * 5);
  const stepSize = delta / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel({ deltaY: stepSize });
    await randomDelay(50, 150);
  }
  await randomDelay(300, 800); // pause after scroll
}

async function humanSelect(page, selector, value) {
  await page.waitForSelector(selector, { timeout: ACTION_TIMEOUT_MS });
  await humanClick(page, selector);
  await randomDelay(200, 500);
  await page.select(selector, value);
  await randomDelay(300, 700);
}

// ─── React-Compatible Value Setting ─────────────────────────────────────────

/**
 * Set value on a React controlled input using the native value setter.
 * This bypasses React's synthetic event system and properly triggers
 * onChange handlers by dispatching native input/change events.
 */
async function reactSetValue(page, selector, value) {
  await page.waitForSelector(selector, { timeout: ACTION_TIMEOUT_MS });

  const success = await page.evaluate((sel, val) => {
    const el = document.querySelector(sel);
    if (!el) return { error: `Element not found: ${sel}` };

    // Get the native value setter (bypasses React's getter/setter override)
    const descriptor = Object.getOwnPropertyDescriptor(
      el.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype,
      'value'
    );

    if (!descriptor || !descriptor.set) {
      // Fallback: direct assignment
      el.value = val;
    } else {
      // Use native setter to bypass React's value tracking
      descriptor.set.call(el, val);
    }

    // Dispatch events that React listens for (bubbling to document root)
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    // Return the current value to confirm
    return { value: el.value };
  }, selector, value);

  return success;
}

/**
 * Fill multiple form fields atomically in a single page.evaluate() call.
 * This prevents React re-renders between fields from clearing values.
 *
 * fields: [{ selector, value }, ...]
 */
async function reactFillForm(page, fields) {
  // Wait for all selectors to be present
  for (const field of fields) {
    await page.waitForSelector(field.selector, { timeout: ACTION_TIMEOUT_MS });
  }

  const results = await page.evaluate((fieldsList) => {
    const output = [];

    for (const { selector, value } of fieldsList) {
      const el = document.querySelector(selector);
      if (!el) {
        output.push({ selector, success: false, error: `Element not found: ${selector}` });
        continue;
      }

      // Determine the correct prototype for the native setter
      const proto = el.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');

      if (descriptor && descriptor.set) {
        descriptor.set.call(el, value);
      } else {
        el.value = value;
      }

      // Dispatch events React listens for
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      output.push({ selector, success: true, value: el.value });
    }

    return output;
  }, fields);

  return results;
}

/**
 * Click a checkbox/radio using React-compatible event dispatch.
 * Handles the 'checked' property instead of 'value'.
 */
async function reactSetChecked(page, selector, checked = true) {
  await page.waitForSelector(selector, { timeout: ACTION_TIMEOUT_MS });

  const result = await page.evaluate((sel, shouldBeChecked) => {
    const el = document.querySelector(sel);
    if (!el) return { error: `Element not found: ${sel}` };

    // Only toggle if current state differs
    if (el.checked !== shouldBeChecked) {
      // Use native setter for 'checked'
      const descriptor = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'checked'
      );
      if (descriptor && descriptor.set) {
        descriptor.set.call(el, shouldBeChecked);
      } else {
        el.checked = shouldBeChecked;
      }

      // React listens for click events on checkboxes
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return { checked: el.checked };
  }, selector, checked);

  return result;
}

// ─── Screenshot ──────────────────────────────────────────────────────────────
async function takeScreenshot(page, fullPage = false) {
  ensureDir(SCREENSHOTS_DIR);
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const id = crypto.randomBytes(4).toString("hex");
  const filename = `${ts}-${id}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  await page.screenshot({ path: filepath, fullPage, type: "png" });

  return `/uploads/screenshots/${filename}`;
}

// ─── Extract ─────────────────────────────────────────────────────────────────
async function extractFromPage(page, selector, attribute) {
  await page.waitForSelector(selector, { timeout: ACTION_TIMEOUT_MS });
  const elements = await page.$$(selector);
  const results = [];
  for (const el of elements) {
    if (attribute) {
      const val = await el.evaluate((e, attr) => e.getAttribute(attr), attribute);
      results.push(val);
    } else {
      const text = await el.evaluate((e) => e.textContent?.trim() || "");
      results.push(text);
    }
  }
  return results;
}

// ─── Evaluate ────────────────────────────────────────────────────────────────
async function evaluateScript(page, script) {
  const result = await page.evaluate(script);
  let output = JSON.stringify(result);
  if (output && output.length > MAX_EVALUATE_OUTPUT) {
    output = output.slice(0, MAX_EVALUATE_OUTPUT) + "... (truncated)";
  }
  return JSON.parse(output || "null");
}

// ─── Command Handlers ────────────────────────────────────────────────────────

async function handleOpen(cmd) {
  cleanupStaleSessions();

  const activeSessions = listActiveSessions();
  if (activeSessions.length >= MAX_SESSIONS) {
    return {
      error: `Max ${MAX_SESSIONS} concurrent sessions. Close an existing session first.`,
      activeSessions: activeSessions.map((s) => ({
        sessionId: s.sessionId,
        url: s.url,
        title: s.title,
      })),
    };
  }

  const sessionId = crypto.randomBytes(8).toString("hex");
  const userAgent = getRandomUserAgent();
  const chromiumPath = findChromium();

  const viewport = {
    width: cmd.viewport?.width || 1920,
    height: cmd.viewport?.height || 1080,
  };

  log(`Opening session ${sessionId} (chromium: ${chromiumPath})`);

  const browser = await puppeteer.launch({
    executablePath: chromiumPath,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      `--window-size=${viewport.width},${viewport.height}`,
      "--disable-infobars",
      "--lang=en-US,en",
      "--disable-gpu",
      "--disable-extensions",
      "--no-first-run",
      "--no-default-browser-check",
    ],
    defaultViewport: viewport,
  });

  const wsEndpoint = browser.wsEndpoint();
  const pid = browser.process().pid;

  // Configure the default page
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  await configurePage(page, userAgent);

  let url = "about:blank";
  let title = "New Tab";

  if (cmd.url) {
    await humanNavigate(page, cmd.url);
    url = page.url();
    title = await page.title();
  }

  // Disconnect (but don't close browser — it keeps running)
  browser.disconnect();

  const meta = {
    pid,
    wsEndpoint,
    url,
    title,
    userAgent,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    viewport,
  };
  writeMeta(sessionId, meta);

  log(`Session ${sessionId} opened — PID ${pid}, URL: ${url}`);

  return { sessionId, url, title, viewport };
}

async function handleAction(cmd) {
  const { sessionId, actions } = cmd;
  if (!sessionId) return { error: "sessionId is required" };
  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    return { error: "actions array is required and must not be empty" };
  }

  const meta = readMeta(sessionId);
  if (!meta) return { error: `Session ${sessionId} not found` };

  // Check process is alive
  try {
    process.kill(meta.pid, 0);
  } catch {
    cleanupSession(sessionId);
    return { error: `Session ${sessionId} is dead (browser process exited)` };
  }

  log(`Executing ${actions.length} actions in session ${sessionId}`);

  let browser;
  try {
    browser = await puppeteer.connect({ browserWSEndpoint: meta.wsEndpoint });
  } catch (err) {
    cleanupSession(sessionId);
    return { error: `Cannot connect to session ${sessionId}: ${err.message}` };
  }

  const pages = await browser.pages();
  const page = pages[0];
  if (!page) {
    browser.disconnect();
    return { error: "No page available in session" };
  }

  const results = [];
  let currentUrl = page.url();
  let currentTitle = await page.title();

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const startTime = Date.now();

    try {
      switch (action.action) {
        case "navigate": {
          await humanNavigate(page, action.url);
          currentUrl = page.url();
          currentTitle = await page.title();
          results.push({
            action: "navigate",
            success: true,
            url: currentUrl,
            title: currentTitle,
            duration: Date.now() - startTime,
          });
          break;
        }

        case "click": {
          await humanClick(page, action.selector);
          // Wait a bit for potential navigation
          await randomDelay(500, 1000);
          currentUrl = page.url();
          currentTitle = await page.title();
          results.push({
            action: "click",
            success: true,
            selector: action.selector,
            url: currentUrl,
            title: currentTitle,
            duration: Date.now() - startTime,
          });
          break;
        }

        case "type": {
          await humanType(page, action.selector, action.text || "", {
            clear: action.clear,
          });
          results.push({
            action: "type",
            success: true,
            selector: action.selector,
            length: (action.text || "").length,
            duration: Date.now() - startTime,
          });
          break;
        }

        case "screenshot": {
          const screenshotUrl = await takeScreenshot(page, action.fullPage);
          results.push({
            action: "screenshot",
            success: true,
            url: screenshotUrl,
            duration: Date.now() - startTime,
          });
          break;
        }

        case "extract": {
          const elements = await extractFromPage(
            page,
            action.selector,
            action.attribute
          );
          results.push({
            action: "extract",
            success: true,
            selector: action.selector,
            count: elements.length,
            elements,
            duration: Date.now() - startTime,
          });
          break;
        }

        case "wait": {
          if (action.selector) {
            await page.waitForSelector(action.selector, {
              timeout: action.timeout || ACTION_TIMEOUT_MS,
              visible: true,
            });
          } else {
            await randomDelay(
              action.timeout || 1000,
              (action.timeout || 1000) + 500
            );
          }
          results.push({
            action: "wait",
            success: true,
            duration: Date.now() - startTime,
          });
          break;
        }

        case "scroll": {
          await humanScroll(
            page,
            action.direction || "down",
            action.amount || 400
          );
          results.push({
            action: "scroll",
            success: true,
            direction: action.direction || "down",
            duration: Date.now() - startTime,
          });
          break;
        }

        case "select": {
          await humanSelect(page, action.selector, action.value);
          results.push({
            action: "select",
            success: true,
            selector: action.selector,
            value: action.value,
            duration: Date.now() - startTime,
          });
          break;
        }

        case "evaluate": {
          const evalResult = await evaluateScript(page, action.script);
          results.push({
            action: "evaluate",
            success: true,
            result: evalResult,
            duration: Date.now() - startTime,
          });
          break;
        }

        case "set_value": {
          // React-compatible value setting for controlled inputs
          const svResult = await reactSetValue(page, action.selector, action.value || "");
          await randomDelay(100, 300);
          results.push({
            action: "set_value",
            success: !svResult.error,
            selector: action.selector,
            ...(svResult.error ? { error: svResult.error } : { value: svResult.value }),
            duration: Date.now() - startTime,
          });
          break;
        }

        case "fill_form": {
          // Fill multiple fields atomically (prevents React re-render clearing)
          if (!action.fields || !Array.isArray(action.fields)) {
            results.push({ action: "fill_form", success: false, error: "fields array is required" });
            break;
          }
          const ffResults = await reactFillForm(page, action.fields);
          await randomDelay(200, 500);
          results.push({
            action: "fill_form",
            success: ffResults.every(r => r.success),
            fields: ffResults,
            duration: Date.now() - startTime,
          });
          break;
        }

        case "set_checked": {
          // React-compatible checkbox/radio toggle
          const scResult = await reactSetChecked(page, action.selector, action.checked !== false);
          await randomDelay(100, 300);
          results.push({
            action: "set_checked",
            success: !scResult.error,
            selector: action.selector,
            ...(scResult.error ? { error: scResult.error } : { checked: scResult.checked }),
            duration: Date.now() - startTime,
          });
          break;
        }

        default:
          results.push({
            action: action.action,
            success: false,
            error: `Unknown action: ${action.action}`,
          });
      }

      // Natural pause between actions (like a human moving to next step)
      if (i < actions.length - 1) {
        await randomDelay(500, 1500);
      }
    } catch (err) {
      results.push({
        action: action.action,
        success: false,
        error: err.message,
        selector: action.selector,
        duration: Date.now() - startTime,
      });
      // Stop executing remaining actions on failure
      log(`Action ${action.action} failed in session ${sessionId}: ${err.message}`);
      break;
    }
  }

  // Update meta with current state
  currentUrl = page.url();
  currentTitle = await page.title();
  meta.url = currentUrl;
  meta.title = currentTitle;
  meta.lastActivity = new Date().toISOString();
  writeMeta(sessionId, meta);

  browser.disconnect();

  log(`Completed ${results.length}/${actions.length} actions in session ${sessionId}`);

  return {
    sessionId,
    url: currentUrl,
    title: currentTitle,
    results,
    actionsCompleted: results.length,
    actionsTotal: actions.length,
  };
}

async function handleClose(cmd) {
  const { sessionId } = cmd;
  if (!sessionId) return { error: "sessionId is required" };

  const meta = readMeta(sessionId);
  if (!meta) return { error: `Session ${sessionId} not found` };

  log(`Closing session ${sessionId}`);
  cleanupSession(sessionId);

  return { closed: true, sessionId };
}

async function handleList() {
  cleanupStaleSessions();
  const sessions = listActiveSessions();
  return {
    count: sessions.length,
    maxSessions: MAX_SESSIONS,
    sessions: sessions.map((s) => ({
      sessionId: s.sessionId,
      url: s.url,
      title: s.title,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
      idleSeconds: Math.round(
        (Date.now() - new Date(s.lastActivity).getTime()) / 1000
      ),
    })),
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const b64 = process.argv[2];
  if (!b64) {
    console.log(JSON.stringify({ error: "No command provided. Pass base64-encoded JSON as first argument." }));
    process.exit(1);
  }

  let cmd;
  try {
    cmd = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  } catch {
    console.log(JSON.stringify({ error: "Invalid base64 JSON command" }));
    process.exit(1);
  }

  try {
    let result;
    switch (cmd.command) {
      case "open":
        result = await handleOpen(cmd);
        break;
      case "action":
        result = await handleAction(cmd);
        break;
      case "close":
        result = await handleClose(cmd);
        break;
      case "list":
        result = await handleList();
        break;
      default:
        result = { error: `Unknown command: ${cmd.command}` };
    }
    console.log(JSON.stringify(result));
  } catch (err) {
    log(`Fatal error: ${err.message}`);
    console.log(JSON.stringify({ error: err.message, stack: err.stack?.split("\n").slice(0, 3) }));
    process.exit(1);
  }
}

main();
