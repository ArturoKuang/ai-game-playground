import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const WS_FILE = '/var/folders/4m/mv9pnwl11f95n3vmzzdmw0x40000gn/T/playtest-ws.txt';
const SCREENSHOT_DIR = '/var/folders/4m/mv9pnwl11f95n3vmzzdmw0x40000gn/T/playtest';

async function getThawPage() {
  const ws = fs.readFileSync(WS_FILE, 'utf8').trim();
  const browser = await puppeteer.connect({ browserWSEndpoint: ws });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('thaw'));
  if (!page) {
    page = pages.find(p => p.url() !== 'about:blank') || pages[pages.length - 1];
    await page.goto('http://localhost:8081/game/thaw', { waitUntil: 'networkidle2', timeout: 15000 });
  }
  return { browser, page };
}

const [,, cmd, ...args] = process.argv;

if (cmd === 'screenshot') {
  const { browser, page } = await getThawPage();
  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.startsWith('thaw-ss-'));
  const next = files.length;
  const p = path.join(SCREENSHOT_DIR, `thaw-ss-${next}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(p);
  await browser.disconnect();
} else if (cmd === 'click') {
  const x = parseInt(args[0]);
  const y = parseInt(args[1]);
  const { browser, page } = await getThawPage();
  await page.mouse.click(x, y);
  await new Promise(r => setTimeout(r, 400));
  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.startsWith('thaw-ss-'));
  const next = files.length;
  const p = path.join(SCREENSHOT_DIR, `thaw-ss-${next}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`Clicked ${x},${y} -> ${p}`);
  await browser.disconnect();
} else if (cmd === 'text') {
  const { browser, page } = await getThawPage();
  const text = await page.evaluate(() => document.body.innerText);
  console.log(text);
  await browser.disconnect();
} else if (cmd === 'grid') {
  const { browser, page } = await getThawPage();
  const cells = await page.evaluate(() => {
    const result = [];
    const allDivs = document.querySelectorAll('div');
    allDivs.forEach(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor;
      const isIce = bg === 'rgb(129, 212, 250)';
      const isWater = bg === 'rgb(21, 101, 192)';
      const isPreview = bg === 'rgb(255, 183, 77)' || bg === 'rgb(255, 152, 0)';
      if ((isIce || isWater || isPreview) && rect.width >= 45 && rect.width <= 70 && rect.height >= 45) {
        result.push({ 
          type: isIce ? 'ice' : isWater ? 'water' : 'preview',
          x: Math.round(rect.x), 
          y: Math.round(rect.y), 
          cx: Math.round(rect.x + rect.width/2),
          cy: Math.round(rect.y + rect.height/2)
        });
      }
    });
    return result;
  });
  cells.sort((a,b) => a.y - b.y || a.x - b.x);
  // Map to rows/cols
  const ys = [...new Set(cells.map(c => c.y))].sort((a,b) => a-b);
  const xs = [...new Set(cells.map(c => c.x))].sort((a,b) => a-b);
  console.log('X positions:', xs.join(', '));
  console.log('Y positions:', ys.join(', '));
  console.log('Cells:');
  cells.forEach(c => {
    const row = ys.indexOf(c.y);
    const col = xs.indexOf(c.x);
    console.log(`  row${row} col${col} (${c.type}) click@${c.cx},${c.cy}`);
  });
  await browser.disconnect();
} else if (cmd === 'reload') {
  const { browser, page } = await getThawPage();
  await page.goto('http://localhost:8081/game/thaw', { waitUntil: 'networkidle2', timeout: 15000 });
  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.startsWith('thaw-ss-'));
  const next = files.length;
  const p = path.join(SCREENSHOT_DIR, `thaw-ss-${next}.png`);
  await page.screenshot({ path: p });
  console.log('Reloaded ->', p);
  await browser.disconnect();
} else if (cmd === 'console') {
  const consoleLogs = JSON.parse(fs.readFileSync('/var/folders/4m/mv9pnwl11f95n3vmzzdmw0x40000gn/T/playtest-console.json', 'utf8'));
  console.log(JSON.stringify(consoleLogs, null, 2));
}
