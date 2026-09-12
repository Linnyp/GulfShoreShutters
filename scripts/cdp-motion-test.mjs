/**
 * Checks the scroll-reveal behaviour in a real browser:
 *   1. an off-screen revealed element starts hidden,
 *   2. scrolling to it reveals it,
 *   3. `prefers-reduced-motion: reduce` leaves everything visible and unhidden,
 *   4. the header picks up its scrolled state.
 *
 * Usage: node scripts/cdp-motion-test.mjs <page-url> <cdp-port>
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
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }))?.result?.value;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = {};

// --- normal motion -------------------------------------------------------------------
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
await send('Page.navigate', { url: pageUrl });
await wait(2500);

results.motionFlag = await evaluate(`document.documentElement.dataset.motion ?? null`);
results.hiddenBeforeScroll = await evaluate(`
  (() => {
    const els = [...document.querySelectorAll('[data-reveal]')];
    const last = els[els.length - 1];
    return { total: els.length, opacity: getComputedStyle(last).opacity, revealed: last.hasAttribute('data-revealed') };
  })()
`);

await evaluate(`document.querySelector('#quote').scrollIntoView({ behavior: 'instant', block: 'center' })`);
await wait(1400);
results.afterScroll = await evaluate(`
  (() => {
    const els = [...document.querySelectorAll('[data-reveal]')];
    const last = els[els.length - 1];
    return { opacity: getComputedStyle(last).opacity, revealed: last.hasAttribute('data-revealed') };
  })()
`);
results.headerScrolled = await evaluate(`document.querySelector('header').hasAttribute('data-scrolled')`);
results.stillHiddenAnywhere = await evaluate(`
  [...document.querySelectorAll('[data-reveal]')].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.top < innerHeight && r.bottom > 0 && getComputedStyle(el).opacity !== '1';
  }).length
`);

// --- reduced motion ------------------------------------------------------------------
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await send('Page.navigate', { url: pageUrl });
await wait(2500);
results.reducedMotion = await evaluate(`
  (() => {
    const els = [...document.querySelectorAll('[data-reveal]')];
    const hidden = els.filter((el) => getComputedStyle(el).opacity !== '1').length;
    return { flag: document.documentElement.dataset.motion ?? null, hidden, total: els.length };
  })()
`);

console.log(JSON.stringify(results, null, 2));
ws.close();
