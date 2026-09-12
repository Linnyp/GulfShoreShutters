/**
 * Real-input regression test for the gallery thumbnail strip.
 *
 * Synthetic PointerEvents cannot reproduce pointer capture, and pointer capture is exactly
 * what broke click-to-select — so this drives Chrome over CDP with real mouse input instead.
 *
 * Usage: node scripts/cdp-gallery-test.mjs <page-url> <cdp-port>
 */
const [pageUrl, port] = process.argv.slice(2);

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

const evaluate = async (expression) => {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return res?.result?.value;
};

const mouse = (type, x, y, extra = {}) =>
  send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });

await send('Page.navigate', { url: pageUrl });
await new Promise((r) => setTimeout(r, 2500));

// `behavior: instant` matters: the page sets scroll-behavior: smooth, and measuring
// rects in the same turn as a smooth scroll hands back pre-scroll coordinates.
await evaluate(`document.querySelector('[data-thumbs]').scrollIntoView({ block: 'center', behavior: 'instant' })`);
await new Promise((r) => setTimeout(r, 600));

// Centre points of two thumbnails, measured after the page has settled.
const box = await evaluate(`
  (() => {
    const strip = document.querySelector('[data-thumbs]');
    const at = (i) => {
      const r = document.querySelectorAll('[data-thumb]')[i].getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    };
    return { a: at(1), b: at(2), scroll: strip.scrollLeft };
  })()
`);

const activeIndex = () =>
  evaluate(`[...document.querySelectorAll('[data-panel]')].findIndex((p) => p.hasAttribute('data-active'))`);

const results = {};
results.activeAtStart = await activeIndex();

// 1. A plain click on a thumbnail, with no movement between press and release.
await mouse('mousePressed', box.b.x, box.b.y);
await new Promise((r) => setTimeout(r, 60));
await mouse('mouseReleased', box.b.x, box.b.y);
await new Promise((r) => setTimeout(r, 400));
results.activeAfterPlainClick = await activeIndex();

// 2. A drag across the strip: it should scroll and must not change the selection.
const scrollBefore = await evaluate(`document.querySelector('[data-thumbs]').scrollLeft`);
await mouse('mousePressed', box.b.x, box.b.y);
for (let step = 1; step <= 6; step += 1) {
  await mouse('mouseMoved', box.b.x - step * 20, box.b.y);
  await new Promise((r) => setTimeout(r, 20));
}
await mouse('mouseReleased', box.b.x - 120, box.b.y);
await new Promise((r) => setTimeout(r, 500));
results.scrollBefore = scrollBefore;
results.scrollAfterDrag = await evaluate(`document.querySelector('[data-thumbs]').scrollLeft`);
results.activeAfterDrag = await activeIndex();

// 3. Click again after the drag, on a thumbnail that is not the current selection — the
//    selection has to follow, or drag has broken click a second way.
const target = await evaluate(`
  (() => {
    const all = [...document.querySelectorAll('[data-thumb]')];
    const active = all.findIndex((t) => t.hasAttribute('data-active'));
    const stripRect = document.querySelector('[data-thumbs]').getBoundingClientRect();
    // Fully inside the strip's own box, so the click cannot land on a clipped edge.
    const pick = all
      .map((t, i) => ({ i, r: t.getBoundingClientRect() }))
      .find(({ i, r }) => i !== active && r.left >= stripRect.left && r.right <= stripRect.right);
    if (!pick) return null;
    return { i: pick.i, x: pick.r.x + pick.r.width / 2, y: pick.r.y + pick.r.height / 2 };
  })()
`);
if (target) {
  await mouse('mousePressed', target.x, target.y);
  await new Promise((r) => setTimeout(r, 60));
  await mouse('mouseReleased', target.x, target.y);
  await new Promise((r) => setTimeout(r, 400));
  results.clickedThumb = target.i;
  results.activeAfterSecondClick = await activeIndex();
}

console.log(JSON.stringify(results, null, 2));
ws.close();
