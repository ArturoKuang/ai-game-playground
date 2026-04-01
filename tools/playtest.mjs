#!/usr/bin/env node
/**
 * playtest.mjs — Session-based Puppeteer CLI for playtesting Puzzle Lab games.
 *
 * Usage:
 *   node tools/playtest.mjs start <game_id>   Launch browser, navigate to game
 *   node tools/playtest.mjs screenshot         Save screenshot, print path
 *   node tools/playtest.mjs click <x> <y>     Click at viewport coordinates
 *   node tools/playtest.mjs text               Get all visible text
 *   node tools/playtest.mjs elements           Get interactive elements + bounding boxes
 *   node tools/playtest.mjs console            Get captured console logs
 *   node tools/playtest.mjs close              Kill browser session
 *
 * Session state is stored via the browser's WebSocket endpoint in $TMPDIR/playtest-ws.txt.
 * The `start` command launches a browser; subsequent commands reconnect to it.
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TMPDIR = process.env.TMPDIR || '/tmp';
const WS_FILE = path.join(TMPDIR, 'playtest-ws.txt');
const SCREENSHOT_DIR = path.join(TMPDIR, 'playtest');
const CONSOLE_FILE = path.join(TMPDIR, 'playtest-console.json');
const BASE_URL = 'http://localhost:8081';
const VIEWPORT = { width: 430, height: 932 }; // iPhone 15 Pro Max size

// Ensure screenshot dir exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

let screenshotCounter = 0;
// Find next screenshot number
try {
  const existing = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.startsWith('screenshot-'));
  if (existing.length > 0) {
    const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0'));
    screenshotCounter = Math.max(...nums) + 1;
  }
} catch {}

// ── Helpers ──

async function connectToSession() {
  if (!fs.existsSync(WS_FILE)) {
    console.error('ERROR: No active session. Run "start <game_id>" first.');
    process.exit(1);
  }
  const wsEndpoint = fs.readFileSync(WS_FILE, 'utf-8').trim();
  try {
    const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
    const pages = await browser.pages();
    // Pick the first non-blank page (start creates a new tab, leaving about:blank at index 0)
    const page = pages.find(p => p.url() !== 'about:blank') || pages[pages.length - 1] || await browser.newPage();
    return { browser, page };
  } catch (e) {
    console.error('ERROR: Could not connect to browser session. It may have been closed.');
    fs.unlinkSync(WS_FILE);
    process.exit(1);
  }
}

// ── Commands ──

async function cmdStart(gameId) {
  // Kill any existing session
  if (fs.existsSync(WS_FILE)) {
    try {
      const ws = fs.readFileSync(WS_FILE, 'utf-8').trim();
      const b = await puppeteer.connect({ browserWSEndpoint: ws });
      await b.close();
    } catch {}
    fs.unlinkSync(WS_FILE);
  }

  // Clear old screenshots
  try {
    const files = fs.readdirSync(SCREENSHOT_DIR);
    for (const f of files) fs.unlinkSync(path.join(SCREENSHOT_DIR, f));
  } catch {}
  screenshotCounter = 0;

  // Clear console log
  fs.writeFileSync(CONSOLE_FILE, '[]');

  const userDataDir = path.join(TMPDIR, 'playtest-chrome-profile-' + Date.now());
  const browser = await puppeteer.launch({
    headless: 'new',
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-singleton-lock'],
  });

  // Save WebSocket endpoint for reconnection
  fs.writeFileSync(WS_FILE, browser.wsEndpoint());

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Capture console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: Date.now(),
    });
    // Persist to file so other commands can read them
    fs.writeFileSync(CONSOLE_FILE, JSON.stringify(consoleLogs, null, 2));
  });

  // Navigate to game
  const url = gameId ? `${BASE_URL}/game/${gameId}` : BASE_URL;
  console.log(`Navigating to ${url}...`);

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
  } catch {
    // networkidle0 can timeout on dev servers with HMR websockets; domcontentloaded is fine
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
  }

  // Wait a moment for React to render
  await new Promise(r => setTimeout(r, 1000));

  console.log(`OK: Browser session started. Game: ${gameId || 'home'}`);
  console.log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
  console.log(`WebSocket: ${browser.wsEndpoint()}`);

  // Don't close browser — leave it running for subsequent commands
  // Disconnect without closing
  browser.disconnect();
}

async function cmdScreenshot(mode) {
  const { browser, page } = await connectToSession();
  const filePath = path.join(SCREENSHOT_DIR, `screenshot-${screenshotCounter++}.png`);
  const fullPage = mode === 'full';
  await page.screenshot({ path: filePath, fullPage });
  console.log(filePath);
  browser.disconnect();
}

async function cmdClick(x, y) {
  const { browser, page } = await connectToSession();
  await page.mouse.click(parseInt(x), parseInt(y));
  // Brief wait for animations/state updates
  await new Promise(r => setTimeout(r, 400));
  console.log(`OK: Clicked at (${x}, ${y})`);
  browser.disconnect();
}

async function cmdScroll(y) {
  const { browser, page } = await connectToSession();
  // React Native Web uses overflow:scroll divs, not window scroll
  await page.evaluate((scrollY) => {
    const scrollables = document.querySelectorAll('[data-testid], [style*="overflow"]');
    // Find the main scrollable container
    let scrolled = false;
    document.querySelectorAll('*').forEach(el => {
      if (scrolled) return;
      const style = window.getComputedStyle(el);
      if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        el.scrollTop = scrollY;
        scrolled = true;
      }
    });
    if (!scrolled) window.scrollTo(0, scrollY);
  }, parseInt(y));
  await new Promise(r => setTimeout(r, 300));
  console.log(`OK: Scrolled to y=${y}`);
  browser.disconnect();
}

async function cmdText() {
  const { browser, page } = await connectToSession();
  const text = await page.evaluate(() => {
    // Get all visible text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const el = node.parentElement;
          if (!el) return NodeFilter.FILTER_REJECT;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.textContent.trim() === '') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    const texts = [];
    while (walker.nextNode()) {
      texts.push(walker.currentNode.textContent.trim());
    }
    return texts.join('\n');
  });
  console.log(text);
  browser.disconnect();
}

async function cmdElements() {
  const { browser, page } = await connectToSession();
  const elements = await page.evaluate(() => {
    const interactive = document.querySelectorAll(
      '[role="button"], button, a, [data-testid], [onclick], [tabindex]'
    );
    // Also get anything with cursor:pointer or pressable divs
    const allElements = document.querySelectorAll('div, span, text, view');
    const results = [];
    const seen = new Set();

    function addElement(el) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (rect.top > window.innerHeight || rect.left > window.innerWidth) return;
      const key = `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}`;
      if (seen.has(key)) return;
      seen.add(key);

      const style = window.getComputedStyle(el);
      results.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().substring(0, 50),
        role: el.getAttribute('role') || '',
        x: Math.round(rect.x + rect.width / 2),
        y: Math.round(rect.y + rect.height / 2),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        bg: style.backgroundColor,
        cursor: style.cursor,
      });
    }

    interactive.forEach(addElement);
    // Also grab elements with pointer cursor (React Native Web pressables)
    allElements.forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.cursor === 'pointer') addElement(el);
    });

    return results;
  });
  console.log(JSON.stringify(elements, null, 2));
  browser.disconnect();
}

async function cmdConsole() {
  if (fs.existsSync(CONSOLE_FILE)) {
    const logs = fs.readFileSync(CONSOLE_FILE, 'utf-8');
    console.log(logs);
  } else {
    console.log('[]');
  }
}

async function cmdClose() {
  if (!fs.existsSync(WS_FILE)) {
    console.log('No active session.');
    return;
  }
  const wsEndpoint = fs.readFileSync(WS_FILE, 'utf-8').trim();
  try {
    const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
    await browser.close();
  } catch {}
  fs.unlinkSync(WS_FILE);
  console.log('OK: Browser session closed.');
}

// ── Main ──

const [,, command, ...args] = process.argv;

switch (command) {
  case 'start':
    await cmdStart(args[0]);
    break;
  case 'screenshot':
    await cmdScreenshot(args[0]); // optional: "full" for fullPage
    break;
  case 'click':
    await cmdClick(args[0], args[1]);
    break;
  case 'scroll':
    await cmdScroll(args[0]);
    break;
  case 'text':
    await cmdText();
    break;
  case 'elements':
    await cmdElements();
    break;
  case 'console':
    await cmdConsole();
    break;
  case 'close':
    await cmdClose();
    break;
  default:
    console.log(`Usage: playtest.mjs <command> [args]

Commands:
  start <game_id>   Launch browser, navigate to game (e.g., "floodfill")
  screenshot         Save screenshot, print file path
  click <x> <y>     Click at viewport coordinates
  text               Get all visible text on screen
  elements           Get interactive elements as JSON (tag, text, x, y, w, h)
  console            Get captured browser console logs
  close              Kill browser session`);
}
