/**
 * 用 Chrome DevTools Protocol 截图：等待真实时间后再拍，
 * 避免 --virtual-time-budget 不推进 CSS 过渡导致拍到中间态。
 *
 * 用法：node scripts/screenshot.mjs <url> <out.png> [width] [height] [waitMs]
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [, , url, out, width = '1600', height = '950', waitMs = '2600'] = process.argv;

if (!url || !out) {
  console.error('用法：node scripts/screenshot.mjs <url> <out.png> [width] [height] [waitMs]');
  process.exit(1);
}

const port = 9333 + Math.floor(Math.random() * 200);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const child = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${port}`,
    `--window-size=${width},${height}`,
    '--user-data-dir=/tmp/cdp-shot-profile',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function findPage() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const page = (await res.json()).find((t) => t.type === 'page');
      if (page) return page;
    } catch {
      /* 端口还没起来 */
    }
    await sleep(200);
  }
  throw new Error('无法连接 Chrome 调试端口');
}

const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

let seq = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  const resolve = pending.get(msg.id);
  if (resolve) {
    pending.delete(msg.id);
    resolve(msg);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

await send('Page.enable');
await send('Page.navigate', { url });
await sleep(Number(waitMs));
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log(`已保存 ${out}`);

ws.close();
child.kill();
process.exit(0);
