/**
 * Turns the traced two-tone icon SVGs in src/assets/icons into single-colour, inlineable
 * ones in src/assets/icons/inline.
 *
 * The sources are raster traces: solid black shapes on a solid white plate, with detail
 * (the ruler's ticks, the price tag's dollar sign, the shield's tick) punched out in white
 * *on top of* the black. Recolouring fills would flatten that detail into a blob, and
 * dropping the white paths would too — the shapes are painted in order, not subtracted.
 *
 * So each icon is rebuilt as an SVG luminance mask over a `currentColor` rectangle: white
 * in the mask shows the colour through, black hides it, and the original paint order does
 * the subtraction for free. Inline the result and it takes the text colour of its parent.
 *
 * Two source shapes, detected by whether the file paints any white at all:
 *   invert   — black icon on a white plate (conversation, measure, price-tag, shield).
 *              Swap the colours and the icon becomes the visible part of the mask.
 *   negative — no white anywhere: a full-canvas black plate with the icon painted on top
 *              in the same black (garage). Drop that first plate path and paint the rest
 *              white; unpainted canvas is transparent, which a luminance mask hides.
 *
 * Re-run after adding or replacing an icon:  node scripts/normalize-icons.mjs
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';

const SRC = 'src/assets/icons';
const OUT = join(SRC, 'inline');
const VIEWBOX = '0 0 512 512';

/* The traces carry six decimal places per coordinate, which is most of the file size and
   none of the fidelity at the 40px these render at. */
const round = (svg) =>
  svg.replace(/ d="([^"]*)"/g, (_, d) => ` d="${d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10))}"`);

const inner = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '');

const files = (await readdir(SRC)).filter((f) => f.endsWith('.svg'));
await mkdir(OUT, { recursive: true });

for (const file of files) {
  const name = basename(file, '.svg');
  const source = await readFile(join(SRC, file), 'utf8');
  const hasWhite = /#FFFFFF/i.test(source);

  let body = inner(source);
  body = hasWhite
    ? body.replace(/fill="(#[0-9a-f]{3,8})"/gi, (_, hex) =>
        /^#f{3,8}$/i.test(hex) ? 'fill="#000000"' : 'fill="#FFFFFF"',
      )
    : body.replace(/<path\b[\s\S]*?<\/path>/i, '').replace(/fill="#[0-9a-f]{3,8}"/gi, 'fill="#FFFFFF"');

  body = round(body).replace(/\s*\n\s*/g, '').replace(/\t/g, '');

  const maskId = `gss-icon-${name}`;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" aria-hidden="true" focusable="false">`,
    `<mask id="${maskId}" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">`,
    body,
    '</mask>',
    `<rect width="512" height="512" fill="currentColor" mask="url(#${maskId})"/>`,
    '</svg>',
  ].join('');

  await writeFile(join(OUT, file), out);
  console.log(`${file}: ${hasWhite ? 'invert' : 'negative'} — ${source.length} → ${out.length} bytes`);
}
