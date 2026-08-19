const MIN_IMAGES = 3;
const MAX_IMAGES = 5;
const IMG_SIZE = 800;

const PX = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${IMG_SIZE}&h=${IMG_SIZE}&fit=crop`;

const CURATED = {
  headphones: [7772548, 8356854, 5269699, 2919003, 210927],
  airpods: [11599421, 17810093, 3945697, 30981655, 3921827],
  watch: [5081914, 31406903, 14691503, 11700618],
  speaker: [9842750, 128611, 4917455, 2651794],
  powerbank: [3921704, 16814787, 14706040, 10104285],
  clothing: [34366695, 11648228, 5524406],
  scarf: [34225148, 35158070, 35830300],
  sneakers: [1027130, 13450843, 29548615, 15229823],
  belt: [31959216, 4164506, 8539466],
  lamp: [6053887, 1612726, 2249958, 1552616],
  kitchen: [3847465, 3847481, 8903360, 18977904],
  bedding: [12553184, 7765000, 13245210, 11621057],
  candle: [9687370, 11776187, 5475164, 36563156],
  cosmetics: [20377674, 10825670, 29675492, 4841274],
  perfume: [15096784, 1666405, 13875783, 36389336],
  yoga: [6339731, 8539048, 6246682, 6752177],
  dumbbell: [7743320, 4753994, 3931367, 669580],
  bottle: [3737800, 3737799, 5038815, 11860562],
  extension: [6381070, 9242896, 3520692],
  csv: [6381070, 9242896, 3520692],
};

const STOP = new Set([
  'with', 'and', 'for', 'the', 'a', 'an', 'of', 'in', 'on', 'to', 'at', 'from', 'by', 'up',
  'premium', 'pro', 'plus', 'mini', 'max', 'ultra', 'new', 'gen', 'edition', 'smart', 'wireless',
  'bluetooth', 'rechargeable', 'portable', 'foldable', 'wearable', 'advanced', 'inch', 'inches',
  'series', 'version', 'model', 'deluxe', 'classic', 'original', 'official',
]);

const TYPE_KEYWORDS = [
  { re: /iphone/i, kw: 'iphone' },
  { re: /airpods?/i, kw: 'airpods' },
  { re: /\bbuds?\b|earbud|earpods?|earphone/i, kw: 'airpods' },
  { re: /macbook/i, kw: 'macbook' },
  { re: /ipad/i, kw: 'ipad' },
  { re: /playstation|ps\s?5|ps4/i, kw: 'playstation' },
  { re: /xbox/i, kw: 'xbox' },
  { re: /(watch|smartwatch|wristwatch)/i, kw: 'watch' },
  { re: /(headphone|headset)/i, kw: 'headphones' },
  { re: /(speaker|soundbar|bluetooth\s?speaker)/i, kw: 'speaker' },
  { re: /(television|smart\s?tv|\btv\b|qled|oled)/i, kw: 'television' },
  { re: /(monitor|display|screen|desktop)/i, kw: 'monitor' },
  { re: /(laptop|notebook|chromebook|ultrabook)/i, kw: 'laptop' },
  { re: /(tablet|kindle)/i, kw: 'tablet' },
  { re: /(smartphone|phone|mobile|android|pixel|galaxy)/i, kw: 'smartphone' },
  { re: /(camera|dslr|mirrorless|camcorder|lens)/i, kw: 'camera' },
  { re: /(power\s?bank|charger|powerbank)/i, kw: 'powerbank' },
  { re: /(shoe|sneaker|boot|sandal|trainer|running|nike|air\s?max|jordan|adidas|puma|reebok|skechers)/i, kw: 'sneakers' },
  { re: /(ring|necklace|jewelry|jewellery|earring|bracelet|pendant)/i, kw: 'jewelry' },
  { re: /(perfume|parfum|fragrance|cologne|deodorant)/i, kw: 'perfume' },
  { re: /(cream|serum|skincare|cosmetic|makeup|beauty)/i, kw: 'cosmetics' },
  { re: /(sunglass|eyeglass|glasses|eyewear)/i, kw: 'sunglasses' },
  { re: /(bag|backpack|handbag|wallet|purse|satchel)/i, kw: 'handbag' },
  { re: /(scarf|muffler)/i, kw: 'scarf' },
  { re: /(belt|buckle)/i, kw: 'belt' },
  { re: /(candle|scented)/i, kw: 'candle' },
  { re: /(dress|shirt|t-?shirt|jacket|jeans|trouser|hoodie|sweater|clothing|apparel)/i, kw: 'clothing' },
  { re: /(lamp|lighting|ceiling\s?light|led\s?lamp|lantern)/i, kw: 'lamp' },
  { re: /(chair|sofa|couch|recliner)/i, kw: 'chair' },
  { re: /(desk|\btable\b|shelf|cabinet|wardrobe|dresser)/i, kw: 'furniture' },
  { re: /(towel|bedsheet|linen|pillow|blanket|bedding)/i, kw: 'bedding' },
  { re: /(kitchen|cookware|pan|utensil|blender|mixer|microwave|toaster|dinner)/i, kw: 'kitchen' },
  { re: /(vacuum|cleaner|robot\s?vacuum|iron)/i, kw: 'vacuum' },
  { re: /(bottle|flask|water\s?bottle|tumbler|mug)/i, kw: 'bottle' },
  { re: /(yoga|mat|workout|gym)/i, kw: 'yoga' },
  { re: /(dumbbell|barbell|\bweights?\b|fitness|sports)/i, kw: 'dumbbell' },
  { re: /(toy|action\s?figure|lego|doll|puzzle)/i, kw: 'toy' },
  { re: /(game|console|controller|gaming)/i, kw: 'gaming' },
  { re: /(guitar|piano|musical|instrument)/i, kw: 'guitar' },
  { re: /(bike|bicycle|cycle|scooter)/i, kw: 'bicycle' },
  { re: /(drone|robot|gadget|smart\s?home)/i, kw: 'technology' },
  { re: /(book|novel)/i, kw: 'book' },
];

function extractWords(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

export function keywordFor(name = '', category = '') {
  const text = `${name} ${category}`.toLowerCase();
  for (const t of TYPE_KEYWORDS) {
    if (t.re.test(text)) return t.kw;
  }
  const words = extractWords(`${name} ${category}`);
  return words[0] || 'product';
}

export function imageUrlFor(keyword, n) {
  const ids = CURATED[keyword];
  if (ids && ids.length) {
    const id = ids[(n - 1) % ids.length];
    if (id) return PX(id);
  }
  return `https://loremflickr.com/${IMG_SIZE}/${IMG_SIZE}/${encodeURIComponent(keyword)}?lock=${n}`;
}

function isGenerated(u) {
  return /loremflickr\.com/i.test(u) ||
    /picsum\.photos/i.test(u) ||
    /images\.pexels\.com\/photos\/\d+\/pexels-photo-\d+\.jpeg/i.test(u);
}

export function isUserProvided(u) {
  const s = String(u || '');
  return s.startsWith('/uploads/') || (/^https?:\/\//i.test(s) && !isGenerated(s));
}

export function resolveImages(product, existing = []) {
  const kept = [];
  const seen = new Set();
  const push = (u) => {
    const s = String(u || '').trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      kept.push(s);
    }
  };
  for (const u of Array.isArray(existing) ? existing : []) {
    if (isUserProvided(u)) push(u);
  }
  const keyword = keywordFor(product?.name, product?.category);
  let n = 1;
  while (kept.length < MIN_IMAGES) {
    push(imageUrlFor(keyword, n));
    n++;
  }
  return kept.slice(0, MAX_IMAGES);
}
