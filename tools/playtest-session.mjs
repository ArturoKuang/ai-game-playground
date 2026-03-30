#!/usr/bin/env node
/**
 * Single-session playtest: launches browser, takes screenshots, clicks, gets text.
 * All operations happen in one process to avoid Puppeteer reconnect issues.
 *
 * Usage: node tools/playtest-session.mjs <game_id> <script>
 * Script is a comma-separated list of commands:
 *   ss          - screenshot
 *   text        - get visible text
 *   elements    - get interactive elements
 *   click:x:y   - click at (x,y)
 *   wait:ms     - wait ms milliseconds
 *   console     - get console logs
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const VIEWPORT = { width: 430, height: 932 };
const BASE_URL = 'http://localhost:8081';
const SS_DIR = path.join(process.cwd(), 'playtest-screenshots');

if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

const [,, gameId, ...scriptParts] = process.argv;
const script = scriptParts.join(' ');

if (!gameId) {
  console.log('Usage: node tools/playtest-session.mjs <game_id> <commands>');
  process.exit(1);
}

const commands = script.split(',').map(s => s.trim()).filter(Boolean);

(async () => {
  let ssCounter = 0;
  const consoleLogs = [];

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  const url = `${BASE_URL}/game/${gameId}`;
  console.log(`Navigating to ${url}...`);

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
  } catch {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
  }
  await new Promise(r => setTimeout(r, 1000));
  console.log('Page loaded.');

  for (const cmd of commands) {
    if (cmd === 'ss') {
      const filePath = path.join(SS_DIR, `ss-${ssCounter++}.png`);
      await page.screenshot({ path: filePath });
      console.log(`SCREENSHOT: ${filePath}`);

    } else if (cmd === 'text') {
      const text = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) => {
            const el = node.parentElement;
            if (!el) return NodeFilter.FILTER_REJECT;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
            if (node.textContent.trim() === '') return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        const texts = [];
        while (walker.nextNode()) texts.push(walker.currentNode.textContent.trim());
        return texts.join('\n');
      });
      console.log('=== TEXT ===');
      console.log(text);
      console.log('=== END TEXT ===');

    } else if (cmd === 'elements') {
      const elements = await page.evaluate(() => {
        const results = [];
        const seen = new Set();
        document.querySelectorAll('*').forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.cursor === 'pointer' || el.getAttribute('role') === 'button') {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            if (rect.top > window.innerHeight) return;
            const key = `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}`;
            if (seen.has(key)) return;
            seen.add(key);
            results.push({
              text: (el.textContent || '').trim().substring(0, 50),
              x: Math.round(rect.x + rect.width / 2),
              y: Math.round(rect.y + rect.height / 2),
              w: Math.round(rect.width),
              h: Math.round(rect.height),
              bg: style.backgroundColor,
            });
          }
        });
        return results;
      });
      console.log('=== ELEMENTS ===');
      console.log(JSON.stringify(elements, null, 2));
      console.log('=== END ELEMENTS ===');

    } else if (cmd.startsWith('click:')) {
      const [, x, y] = cmd.split(':');
      await page.mouse.click(parseInt(x), parseInt(y));
      await new Promise(r => setTimeout(r, 400));
      console.log(`CLICKED: (${x}, ${y})`);

    } else if (cmd.startsWith('wait:')) {
      const ms = parseInt(cmd.split(':')[1]);
      await new Promise(r => setTimeout(r, ms));
      console.log(`WAITED: ${ms}ms`);

    } else if (cmd === 'console') {
      console.log('=== CONSOLE ===');
      console.log(JSON.stringify(consoleLogs, null, 2));
      console.log('=== END CONSOLE ===');
    }
  }

  await browser.close();
  console.log('Browser closed.');
})();
