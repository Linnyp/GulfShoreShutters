/**
 * Single source of truth for site copy.
 *
 * Every claim here traces to `.agents/context/product-marketing-context.md` (V2).
 * Before adding anything, check it against that file — the business is a *retailer*,
 * not a contractor, and the two claims that must never reappear are:
 *   - that Gulf Shore Shutters installs (Devlin Shutters does), and
 *   - any inherited history, reviews or licence number (there are none).
 *
 * Items marked OPEN are unresolved owner questions; each notes the assumption made.
 */

export const business = {
  name: 'Gulf Shore Shutters',
  legalName: 'Gulf Shore Shutters LLC',
  tagline: 'Plantation Shutters. Coastal Styles.',
  established: 2024,
  phone: '(239) 362-8865',
  phoneHref: '+12393628865',
  email: 'hannah@gulfshoreshutters.company',
  // OPEN: the registered address (2213 SE 3rd Ter, Cape Coral) is residential, so the
  // street line is withheld and the Google Business Profile should be configured as a
  // service-area business. Publish the street only if the owner decides otherwise.
  address: {
    city: 'Cape Coral',
    region: 'FL',
    postalCode: '33990',
    country: 'US',
  },
  geo: { latitude: 26.6406, longitude: -81.8723 }, // Cape Coral, FL
  hours: 'Mon–Fri 8:00am–5:00pm, Sat by appointment',
  openingHours: ['Mo-Fr 08:00-17:00'],
  priceRange: '$$-$$$',
  // Gulf Shore Shutters is a retailer and holds no contractor licence. Do not add one.
} as const;

/** The manufacturer. Every "built in Fort Myers" claim on the site traces here. */
export const manufacturer = {
  name: 'Devlin Shutters',
  city: 'Fort Myers',
  yearsInBusiness: 30,
  // The owner's uncle is one of Devlin's owners. This is the strongest credibility asset
  // available and the owner has approved stating it publicly (2026-09-10), so About.astro
  // leads with it. OPEN: Devlin's own sign-off on the wording is still worth getting.
  relationship: "one of its owners is Hannah's uncle",
} as const;

export const pricing = {
  low: 35,
  high: 40,
  unit: 'per square foot, installed',
  deposit: '50% at order, balance on installation',
  payment: 'Cash, check, Zelle, credit card or ACH',
} as const;

/**
 * Straight arithmetic at $35–$40/sq ft. The small bath/kitchen row is deliberately
 * omitted: most shutter manufacturers bill a minimum square footage per panel, which
 * would put a 6 sq ft window well above its literal rate and make the table a lie.
 * OPEN: confirm Devlin's minimum, then decide whether to add that row back.
 */
export const priceExamples = [
  { opening: 'Standard bedroom window', size: '36″ × 60″', sqft: 15, range: '$525 – $600' },
  { opening: 'Large living-room window', size: '48″ × 72″', sqft: 24, range: '$840 – $960' },
  { opening: '8′ sliding glass door', size: '96″ × 80″', sqft: 53, range: '$1,870 – $2,130' },
  { opening: 'Whole home, ~15 windows', size: '—', sqft: 225, range: '$7,900 – $9,000' },
];

export const warranty = {
  wood: 'Lifetime',
  vinyl: '10 years',
  // OPEN: whether Devlin or Gulf Shore Shutters LLC honours the term. For a new LLC
  // selling a lifetime warranty this is load-bearing and belongs on the page once known.
} as const;

export const leadTime = 'Four to six weeks';

/** Lee and Charlotte lead. Collier is served but not chased — see the context doc. */
export const serviceAreas = [
  'Cape Coral',
  'Fort Myers',
  'North Fort Myers',
  'Fort Myers Beach',
  'Sanibel',
  'Estero',
  'Bonita Springs',
  'Lehigh Acres',
  'Punta Gorda',
  'Port Charlotte',
  'Babcock Ranch',
  'Rotonda West',
  'Englewood',
  'Naples',
  'Marco Island',
];

/** Who does what. This is the differentiator, so it is stated plainly rather than blurred. */
export const howItWorks = [
  {
    who: 'Gulf Shore Shutters',
    title: 'We design and price it',
    body: 'The owner comes to your home with full-size samples, walks you through louver width, style, material and finish, and takes an initial measure so you get a real number — not a range.',
  },
  {
    who: manufacturer.name,
    title: 'Devlin builds it in Fort Myers',
    body: `Your panels are manufactured by ${manufacturer.name} in ${manufacturer.city}, who have been building shutters here for over ${manufacturer.yearsInBusiness} years. Nothing is imported or drop-shipped from a national warehouse.`,
  },
  {
    who: manufacturer.name,
    title: 'Devlin measures and installs',
    body: 'The factory that built your shutters does the final measure and the installation. The people responsible for the panels fitting are the people who made them — no handoff to a subcontractor who cannot fix them.',
  },
];

export const services = [
  {
    title: 'Shutters, and nothing else',
    body: 'We are not a window-treatment store that also sells shutters. No blinds, no shades, no motorization. Shutters are the whole business, so this is the one thing we are expert in.',
    icon: 'shutter',
  },
  {
    title: 'Every style, measured on site',
    body: 'Full height, café style, tier-on-tier, and bypass or bi-fold panels for sliding glass doors. Arches, bays, bow windows, front doors and sidelights are measured in person, not ordered off a drawing.',
    icon: 'arch',
  },
  {
    title: 'The right material per room',
    body: 'Poplar for painted finishes, basswood for stains and custom colour matching, and solid-core composite or vinyl for baths and anywhere with real water exposure. We will tell you which rooms call for which.',
    icon: 'shield',
  },
  {
    title: 'A published price',
    body: `$${pricing.low}–$${pricing.high} per square foot, installed — on this page, before you call. No list price inflated to support a discount that disappears at the door.`,
    icon: 'tag',
  },
  {
    title: 'Free in-home consultation',
    body: 'Samples brought to you, every opening measured, and a written itemized quote left with you. No expiration games and no same-day-only pricing.',
    icon: 'ruler',
  },
  {
    title: 'Phone estimates, if you prefer',
    body: 'Already have your measurements? Send them over and get a ballpark by phone or text. You do not have to let a salesperson into your house to get a number.',
    icon: 'phone',
  },
];

export const materials = [
  {
    name: 'Poplar',
    label: 'Standard wood',
    body: 'Takes paint beautifully. Standard finish is extra white unless you ask for another colour. Not the choice for a stained look.',
    file: 'material-poplar.jpg',
  },
  {
    name: 'Basswood',
    label: 'Upgrade wood',
    body: 'Required for any stained shutter and for matching an existing stain. The finer grain shows through the finish.',
    file: 'material-basswood.jpg',
  },
  {
    name: 'Vinyl / solid core',
    label: 'Moisture-proof',
    body: 'For baths, kitchens and anywhere exposed to water. Limited colour range, and it cannot be stained or repainted later.',
    file: 'material-vinyl.jpg',
  },
];

export const process = [
  {
    step: '01',
    title: 'Call, text or send the form',
    body: 'Tell us about your windows. If you already have measurements, we can give you a ballpark on the phone before anyone visits.',
  },
  {
    step: '02',
    title: 'In-home consultation',
    body: 'We bring full-size samples to your house, design the shutters with you, and take an initial measure so the quote is a real number.',
  },
  {
    step: '03',
    title: 'Written quote, no pressure',
    body: 'You get an itemized quote in writing to think about or shop against. Nothing expires. A 50% deposit places the order.',
  },
  {
    step: '04',
    title: 'Built in Fort Myers',
    body: `${manufacturer.name} manufactures your panels to your openings. ${leadTime} from deposit — there is no warehouse to pull from, and that wait is the reason it fits.`,
  },
  {
    step: '05',
    title: 'Final measure and install',
    body: 'Devlin returns to final-measure and install. The balance is due on installation.',
  },
];

export const faqs = [
  {
    q: 'How much do plantation shutters cost?',
    a: `We publish the rate: $${pricing.low}–$${pricing.high} per square foot, installed. A standard 36″ × 60″ bedroom window works out to roughly $525–$600, and a whole home of about fifteen windows lands near $7,900–$9,000. You get an itemized written quote after we measure, and the price on the invoice is the price on the quote.`,
  },
  {
    q: 'Who actually installs them?',
    a: `${manufacturer.name} — the same people who build them. We handle the consultation, the design and the initial measure for pricing; Devlin does the final measure and the installation. We would rather you know that now than discover it on install day.`,
  },
  {
    q: 'I have not heard of you. Why should I trust you with a custom order?',
    a: `Fair question, and the honest answer is that our name is new here but the shutters are not. They are built by ${manufacturer.name} in ${manufacturer.city}, who have been manufacturing shutters here for over ${manufacturer.yearsInBusiness} years — and one of their owners is family. You get a small company that answers the phone, backed by a thirty-year factory's product, warranty and installers.`,
  },
  {
    q: 'Will wood warp in Florida humidity?',
    a: `The wood in plantation shutters is treated and finished the same way as the doors, baseboards and trim already in your house. If that wood survives the climate, so will the shutters — and the ${warranty.wood.toLowerCase()} warranty on wood backs it. For baths and anywhere with direct water exposure we use solid-core composite or vinyl instead, and we will tell you which rooms those are.`,
  },
  {
    q: 'How long does it take?',
    a: `${leadTime} from deposit to installation. Every panel is built to your openings, so there is no stock to pull from — the wait is the reason it fits.`,
  },
  {
    q: 'What is the warranty?',
    a: `${warranty.wood} on wood shutters and ${warranty.vinyl} on vinyl. We put the terms in writing on the quote rather than describing it as "limited lifetime" and leaving you to find the limits.`,
  },
  {
    q: 'Can you do arched, bay or sliding-door windows?',
    a: 'Yes. Arches, bays, bow windows, front doors, sidelights and walls of sliding glass are all routine. They are measured on site rather than ordered from a drawing, which is exactly where big-box and online sellers get homeowners into trouble.',
  },
  {
    q: 'How do payments work?',
    a: `${pricing.deposit}. ${pricing.payment}.`,
  },
  {
    q: 'Do you charge for the estimate?',
    a: 'No. The in-home consultation, the measure and the written quote are free with no obligation. If you already have measurements, we can give you a ballpark over the phone at no cost either.',
  },
];

/**
 * The owner's own photography of completed jobs — the only visual proof available and,
 * with no testimonials yet, the most important asset on the page.
 *
 * Sources live in `src/assets/` so Astro emits AVIF/WebP at build time. They have already
 * been EXIF-rotated on the way in: the originals in `public/images/` carry orientation 6,
 * and sharp does not auto-rotate, so re-importing a raw original will render it sideways.
 *
 * NOT included, deliberately: `Photo Mar 05 2026, 11 02 *.png` are screenshots of Devlin
 * Shutters' Facebook page, complete with app UI. They are not first-party photography and
 * are not ours to publish.
 *
 * OPEN: confirm whether these jobs were completed under a previous employer, which would
 * change how they can be captioned.
 *
 * `file` is resolved against `src/assets/` by an `import.meta.glob` in Gallery.astro.
 *
 * `canal-sliders.jpg` is used by WhyShutters.astro rather than the grid, so it is not
 * listed here — keep the two sets disjoint so no photo appears twice on the page.
 */
export const gallery = [
  { file: 'dining-nook.jpg', alt: 'Two full-height white plantation shutters in a Southwest Florida dining nook' },
  { file: 'bath-shutter.jpg', alt: 'Moisture-rated shutter above a marble walk-in shower' },
  { file: 'bedroom-green.jpg', alt: 'White shutter with a mid-rail on a deep green bedroom wall' },
  { file: 'bedroom-blue.jpg', alt: 'Mid-rail shutter letting light in above and holding privacy below in a pale blue bedroom' },
  { file: 'bedroom-tan.jpg', alt: 'Wide two-panel shutter over a bedroom window with the top louvers open to the garden' },
  { file: 'stairwell-trio.jpg', alt: 'Three stacked shutters running up a stairwell wall' },
];
