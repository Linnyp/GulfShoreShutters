/**
 * Finds what causes horizontal overflow at a phone width.
 *
 * Headless Chrome on Windows clamps the window to 500px, so the viewport is forced with
 * Emulation.setDeviceMetricsOverride instead — that reaches real iPhone widths.
 *
 * Usage: node scripts/cdp-overflow-test.mjs <page-url> <cdp-port> [width]
 */
const [pageUrl, port, widthArg] = process.argv.slice(2);
const width = Number(widthArg ?? 390);

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
if (!page) throw new Error('no page target');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

let id = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  const resolver = pending.get(msg.id);
  if (resolver) {
    pending.delete(msg.id);
    resolver(msg.result);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }))?.result?.value;

await send('Emulation.setDeviceMetricsOverride', {
  width,
  height: 844,
  deviceScaleFactor: 3,
  mobile: true,
});
await send('Page.navigate', { url: pageUrl });
await new Promise((r) => setTimeout(r, 3000));

// Reveal-on-scroll elements start translated; scroll to the bottom first so everything
// has settled into its final position before measuring.
await evaluate(`window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })`);
await new Promise((r) => setTimeout(r, 1500));
await evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
await new Promise((r) => setTimeout(r, 800));

const report = await evaluate(`
  (() => {
    const doc = document.documentElement;
    const vw = doc.clientWidth;
    const offenders = [];

    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.position === 'fixed') continue; // pinned to the viewport, never a cause
      const right = r.right + scrollX;
      const left = r.left + scrollX;
      if (right > vw + 1 || left < -1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute('class') || '').slice(0, 90),
          left: Math.round(left),
          right: Math.round(right),
          width: Math.round(r.width),
          overflowBy: Math.round(right - vw),
          parentCls: (el.parentElement?.getAttribute('class') || '').slice(0, 60),
        });
      }
    }

    // Deepest elements first: a parent only overflows because a child does.
    offenders.sort((a, b) => b.overflowBy - a.overflowBy);

    return {
      viewport: vw,
      scrollWidth: doc.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      overflowPx: doc.scrollWidth - vw,
      count: offenders.length,
      offenders: offenders.slice(0, 12),
    };
  })()
`);

console.log(JSON.stringify(report, null, 2));
ws.close();
