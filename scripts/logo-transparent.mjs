/**
 * Lifts the flat ivory plate off the logo and writes a transparent PNG to src/assets.
 *
 * The supplied artwork is matted onto a solid warm-ivory background. A plain "make every
 * background-coloured pixel transparent" pass leaves a hard, aliased edge, so this does the
 * proper job: alpha comes from how far a pixel is from the plate colour, and the colour is
 * then un-matted (c' = bg + (c - bg) / alpha) so semi-transparent edge pixels carry their
 * true colour instead of a colour already blended with ivory. That is what lets the mark
 * sit cleanly on any background rather than only on ivory.
 *
 * Note the mark's own highlights — the pale outlines inside the letterforms — are close to
 * the plate colour, so they come out largely transparent. That is correct on a light
 * background, and on the dark footer the ivory plate is drawn in CSS behind the logo, which
 * puts them back.
 *
 * Usage: node scripts/logo-transparent.mjs
 */
import sharp from 'sharp';

const SRC = 'photos-original/gulfshorelogo.png';
const OUT = 'src/assets/logo.png';

/* Anything this far from the plate colour is fully opaque; the ramp below it is the
   anti-aliased edge. Too low and edges get crunchy, too high and the pale highlights
   inside the letters start eating into the green. */
const FEATHER = 44;

/* The plate is not perfectly flat — it carries a few levels of compression noise. Without
   a floor those pixels pick up a sliver of alpha each and the old rectangle reappears as a
   faint haze the moment the logo sits on a dark background. */
const NOISE_FLOOR = 10;

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

/* Sample the four corners for the plate colour rather than assuming one. */
const corners = [
  [2, 2],
  [width - 3, 2],
  [2, height - 3],
  [width - 3, height - 3],
].map(([x, y]) => {
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2]];
});
const bg = [0, 1, 2].map((c) => Math.round(corners.reduce((sum, px) => sum + px[c], 0) / corners.length));

const out = Buffer.alloc(width * height * 4);
for (let p = 0; p < width * height; p += 1) {
  const i = p * channels;
  const rgb = [data[i], data[i + 1], data[i + 2]];
  const distance = Math.hypot(rgb[0] - bg[0], rgb[1] - bg[1], rgb[2] - bg[2]);
  const alpha = Math.max(0, Math.min(1, (distance - NOISE_FLOOR) / (FEATHER - NOISE_FLOOR)));

  const o = p * 4;
  for (let c = 0; c < 3; c += 1) {
    // Un-matte: recover the colour the pixel would have had over nothing.
    const value = alpha > 0.004 ? bg[c] + (rgb[c] - bg[c]) / alpha : rgb[c];
    out[o + c] = Math.max(0, Math.min(255, Math.round(value)));
  }
  out[o + 3] = Math.round(alpha * 255);
}

const trimmed = await sharp(out, { raw: { width, height, channels: 4 } })
  .png()
  .trim({ threshold: 1 })
  .toBuffer({ resolveWithObject: true });

await sharp(trimmed.data).png({ compressionLevel: 9 }).toFile(OUT);

console.log(
  `plate #${bg.map((v) => v.toString(16).padStart(2, '0')).join('')} removed — ` +
    `${width}×${height} → ${trimmed.info.width}×${trimmed.info.height} (ratio ${(trimmed.info.width / trimmed.info.height).toFixed(2)})`,
);
