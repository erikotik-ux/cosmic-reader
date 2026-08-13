// Feed content-quality tests for Cosmic Reader.
//
// Zero-dependency Node script (`node tests/feed-content.test.js`). Like the
// other suites it extracts the REAL shipping code out of app.html so the tests
// can never drift from the source.
//
// Covers the two defects found on 2026-08-13:
//   1. NASA science.nasa.gov (Earth Observatory) items ship an ENTIRE PAGE in
//      <content:encoded>, so tag-stripping produced a column of nav labels
//      ("Earth Observatory / Science / Image of the Day / EO Explorer …")
//      instead of the article.
//   2. _OG_FALLBACK_DOMAINS still listed the two PRE-migration hosts after the
//      fallback pool moved to Wikimedia, so _isFallbackImg() never recognised a
//      placeholder and the og:image enrichment pass skipped every card.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = path.join(__dirname, '..', 'app.html');
const src = fs.readFileSync(APP, 'utf8').replace(/\r/g, '');

function slice(start, end) {
  const i = src.indexOf(start);
  if (i < 0) throw new Error('start marker not found: ' + start);
  const j = src.indexOf(end, i);
  if (j < 0) throw new Error('end marker not found: ' + end);
  return src.slice(i, j);
}

const ctx = { URL };
vm.createContext(ctx);
vm.runInContext(
  slice('function stripHtml', '// Strip publisher boilerplate') + '\n' +
  slice('function cleanArticleBody', '// Turn a single wall of excerpt') + '\n' +
  slice('const _OG_FALLBACK_DOMAINS', 'async function enrichOgImages') + '\n' +
  'this.stripHtml = stripHtml;' +
  'this.cleanArticleBody = cleanArticleBody;' +
  'this._looksLikeNavList = _looksLikeNavList;' +
  'this._isFallbackImg = _isFallbackImg;', ctx);

const { cleanArticleBody, _looksLikeNavList, _isFallbackImg } = ctx;

let pass = 0, fail = 0;
function t(name, actual, expected) {
  const ok = actual === expected;
  if (ok) { pass++; }
  else { fail++; console.log(`FAIL: ${name}\n   expected: ${JSON.stringify(expected)}\n   actual:   ${JSON.stringify(actual)}`); }
}

// ── 1. Nav-list detection ─────────────────────────────────────────────────
// The real text Cosmic Reader displayed for "Cascade Volcanoes Shrouded in
// Smoke" before the fix — NASA's secondary navigation, one label per line.
const NASA_NAV = [
  'Earth Observatory', 'Science', 'Earth Observatory',
  'Cascade Volcanoes Shrouded in…', 'Earth', 'Earth Observatory',
  'Image of the Day', 'EO Explorer', 'Topics', 'All Topics',
  'Atmosphere', 'Land', 'Heat & Radiation', 'Life on Earth'
].join('\n');

t('nav column is detected', _looksLikeNavList(NASA_NAV), true);

// Real article prose must NOT be flagged (this is the actual story body).
const REAL_PROSE = [
  'In a contrast of fire and ice, smoke from wildland fires mingled with several of the Cascade Range’s prominent, glaciated volcanoes in summer 2026.',
  'Mount Hood, Oregon’s tallest peak at 11,249 feet, is pictured above, near the Grasshopper fire.',
  'As of August 12, it had burned nearly 84,000 acres and spread beyond national forest boundaries.'
].join('\n');

t('real prose is not flagged', _looksLikeNavList(REAL_PROSE), false);
t('short text is never flagged', _looksLikeNavList('One line.\nTwo lines.'), false);
t('empty text is safe', _looksLikeNavList(''), false);

// A list of genuine long headlines shouldn't trip it either.
const HEADLINES = [
  'NASA confirms the Artemis II crew is ready for a February launch window.',
  'SpaceX static-fires the Starship upper stage ahead of its next flight.',
  'Astronomers detect an unusually bright gamma-ray burst in a nearby galaxy.',
  'Europa Clipper completes its final round of thermal-vacuum testing.',
  'Rover samples suggest ancient standing water in Jezero crater.',
  'A new telescope survey maps ten million previously uncatalogued stars.'
].join('\n');
t('long headlines are not flagged', _looksLikeNavList(HEADLINES), false);

// ── 2. NASA Earth Observatory tail trimming ───────────────────────────────
const body = 'Astronauts on the International Space Station photographed Mount Hood and Mount Rainier as wildfire smoke drifted across the Pacific Northwest during the summer of 2026, a striking contrast of fire and ice.';

t('cuts the References & Resources tail',
  cleanArticleBody(body + '\nReferences & Resources\nInciWeb (2026, August 12). Accessed August 12, 2026.').includes('InciWeb'),
  false);

t('cuts the "you may also be interested in" rail',
  cleanArticleBody(body + '\nYou may also be interested in:\nSmoke Streams Across Eastern Washington').includes('Smoke Streams'),
  false);

t('cuts the Downloads block',
  cleanArticleBody(body + '\nDownloads\nMt. Rainier: August 4, 2026\nJPEG (10.14 MB)').includes('JPEG'),
  false);

t('keeps the real story text', cleanArticleBody(body + '\nReferences & Resources\nInciWeb').startsWith('Astronauts on the'), true);

// Guard: a short body that merely mentions the words is not truncated to nothing.
t('never truncates below the guard', cleanArticleBody('Downloads').length > 0, true);

// ── 2b. APOD masthead ─────────────────────────────────────────────────────
// NASA's Astronomy Picture of the Day items lead with the site's standing blurb
// before the real caption. (Its <description> is nav junk too, so falling back
// to the summary can't save this one — the lead-in must be trimmed.)
const APOD = 'Astronomy Picture of the Day Discover the cosmos! Each day a different image or photograph of our fascinating universe is featured, along with a brief explanation written by a professional astronomer. Total Solar Eclipse Over Spain Explanation: On August 12 the Moon\'s shadow swept across northern Spain.';
t('strips the APOD masthead', cleanArticleBody(APOD).startsWith('Total Solar Eclipse Over Spain'), true);
t('keeps the APOD caption body', cleanArticleBody(APOD).includes('the Moon\'s shadow swept across northern Spain'), true);
// Guard: prose that merely mentions the phrase mid-article is untouched.
const MENTION = 'The team published a striking view of the aurora this week. Astronomy Picture of the Day Discover the cosmos! featured it soon after, drawing wide attention from researchers.';
t('does not strip a mid-article mention', cleanArticleBody(MENTION).startsWith('The team published'), true);

// ── 2c. Bare agency photo credit ──────────────────────────────────────────
t('strips a bare NASA/photographer credit line',
  cleanArticleBody('NASA/Bill Dunford\n\nThe constellation Orion is framed by two Perseid meteors in this photo from Aug. 12, 2018.')
    .startsWith('The constellation Orion'), true);
t('strips an ESA credit line',
  cleanArticleBody('ESA/Hubble & NASA\n\nA glittering globular cluster sits some 20,000 light-years from Earth in this new portrait.')
    .startsWith('A glittering globular'), true);
// Guard: a sentence that merely begins with an agency name is untouched.
t('keeps prose starting with an agency name',
  cleanArticleBody('NASA and ESA confirmed the docking sequence completed without incident early on Tuesday morning.')
    .startsWith('NASA and ESA confirmed'), true);

// ── 3. Fallback-image detection (og enrichment gate) ──────────────────────
t('wikimedia placeholder is a fallback',
  _isFallbackImg('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/1024px-FullMoon2010.jpg'), true);
t('legacy spacetelescope placeholder still detected',
  _isFallbackImg('https://cdn.spacetelescope.org/archives/images/publicationjpg/heic1706b.jpg'), true);
t('real publisher image is NOT a fallback',
  _isFallbackImg('https://planetary.s3.amazonaws.com/web/assets/pictures/phobos-over-mars.jpg'), false);
t('wsrv-proxied real image is NOT a fallback',
  _isFallbackImg('https://wsrv.nl/?url=https%3A%2F%2Fplanetary.s3.amazonaws.com%2Fweb%2Fassets%2Fphobos.jpg'), false);
t('wsrv-proxied placeholder IS a fallback',
  _isFallbackImg('https://wsrv.nl/?url=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fx.jpg'), true);
t('missing image counts as fallback (worth enriching)', _isFallbackImg(''), true);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
