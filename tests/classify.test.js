// Classification edge-case tests for Cosmic Reader's feed relevance layer.
//
// There is no test framework in this project, so this is a zero-dependency
// Node script: `node tests/classify.test.js` (or `npm test`). It extracts the
// REAL classification code straight out of app.html — KEYWORD_CATS,
// classifyArticle(), the source/exclude tables, guessCategory() — and runs it,
// so the tests can never drift from the shipping source.
//
// Exits non-zero if any case fails (CI-friendly).

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = path.join(__dirname, '..', 'app.html');
let src = fs.readFileSync(APP, 'utf8').replace(/\r/g, ''); // normalize CRLF

function slice(start, end) {
  const i = src.indexOf(start);
  if (i < 0) throw new Error('start marker not found: ' + start);
  const j = src.indexOf(end, i);
  if (j < 0) throw new Error('end marker not found: ' + end);
  return src.slice(i, j);
}

// Pull the exact source blocks by stable markers.
const kwCats   = slice('const KEYWORD_CATS = [', 'const FALLBACK_IMAGES');
const classBlk = slice('const CORE_CATEGORIES', '// Pool of 8-10 varied');
const guessFn  = slice('function guessCategory', 'function escHtml');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(kwCats + '\n' + classBlk + '\n' + guessFn +
  '\nthis.classifyArticle = classifyArticle;', ctx);
const classifyArticle = ctx.classifyArticle;

// cat() collapses the result to a short string: a category, or "DROP:<reason>".
const cat = (o) => { const r = classifyArticle(o); return r.excluded ? ('DROP:' + r.reason) : r.category; };

let pass = 0, fail = 0;
function t(desc, got, want) {
  if (got === want) { pass++; return; }
  fail++;
  console.log('FAIL: ' + desc + '\n   got  ' + got + '\n   want ' + want);
}

// ── Keyword classification wins regardless of source ──────────────────────
t('Moon keyword overrides source',     cat({ title: 'Artemis lunar lander reaches south pole', source: 'Ars Technica' }), 'Moon');
t('Physics keyword from NASA source',  cat({ title: 'LIGO detects gravitational wave from black hole merger', source: 'NASA' }), 'Physics');
t('AI keyword from space source',      cat({ title: 'OpenAI releases new GPT model', source: 'Space.com' }), 'AI & Tech');
t('Planets keyword',                   cat({ title: 'New exoplanet found orbiting a nearby star', source: 'NASA' }), 'Planets');

// ── Source default applies only when no keyword matches ───────────────────
t('Source default: Planetary Society', cat({ title: 'A note from our members this week', source: 'Planetary Society' }), 'Planets');
t('Source default: Ars (tech, no kw)', cat({ title: 'New USB-C cable standard announced', source: 'Ars Technica' }), 'AI & Tech');
t('Source default: NASA',              cat({ title: 'Agency update and schedule notes', source: 'NASA' }), 'Missions');

// ── Off-theme exclusion: exclude keyword AND no core keyword ──────────────
t('Drop sports',     cat({ title: 'NFL super bowl ratings hit record high', source: 'Ars Technica' }), 'DROP:off-theme');
t('Drop celebrity',  cat({ title: 'Celebrity red carpet looks from the grammy awards', source: 'Ars Technica' }), 'DROP:off-theme');
t('Drop recipe',     cat({ title: 'The best recipe for holiday cookies', source: 'Ars Technica' }), 'DROP:off-theme');
t('Drop gaming',     cat({ title: 'PlayStation rumored specs leak', source: 'Ars Technica' }), 'DROP:off-theme');

// ── Entertainment / sci-fi media from space sources gets dropped ──────────
t('Drop Transformers movie (Space.com)', cat({ title: "The original (and best) 'Transformers' movie is rolling back out into theaters for its 40th anniversary", excerpt: 'Relive the trauma when Autobots and Decepticons reassemble in this animated cult classic.', source: 'Space.com' }), 'DROP:off-theme');
t('Drop Star Wars day fluff',  cat({ title: 'Celebrate Star Wars day with these fan favorites', source: 'Space.com' }), 'DROP:off-theme');
t('Drop TV series recap',      cat({ title: 'The best tv series to stream this month', source: 'Space.com' }), 'DROP:off-theme');
// Sci-fi BOOKS are on-theme for Cosmic Reader (an allowed exception) — must NOT be dropped.
t('Keep sci-fi book listicle', cat({ title: '15 sci-fi books to read before you die', excerpt: 'Put these science fiction gems on your bucket list.', source: 'Space.com' }), 'Missions');

// ── Exclusion must NOT fire when a real core topic is present ─────────────
t('Keep space despite "recipe"',  cat({ title: 'A recipe for finding exoplanets in Hubble data', source: 'NASA' }), 'Planets');
t('Keep AI despite "casino"',     cat({ title: 'How machine learning detects casino fraud', source: 'Ars Technica' }), 'AI & Tech');
t('Keep real story despite "movie"', cat({ title: 'NASA releases a stunning movie of the Mars Perseverance landing', source: 'Space.com' }), 'Planets');
t('Keep launch despite "trailer"',   cat({ title: 'SpaceX rocket spotted on a trailer ahead of Falcon 9 launch', source: 'Space.com' }), 'Missions');

// ── Health / politics off-theme (generalist sources mix these in) ─────────
t('Drop vaccine politics (the reported bug)', cat({ title: 'Grifters, cynics, and true believers: The family tree of vaccine opponents', excerpt: 'Stanley Plotkin, 93, was instrumental in developing a number of vaccines over his career.', source: 'Ars Technica' }), 'DROP:off-theme');
t('Drop Ebola/court news',     cat({ title: 'Kenyan court blocks Trump admin from dumping Ebola-exposed Americans', source: 'Ars Technica' }), 'DROP:off-theme');
t('Drop election news',        cat({ title: 'What the latest election results mean for the senate', source: 'Ars Technica' }), 'DROP:off-theme');
t('Drop supreme court ruling', cat({ title: 'Supreme Court rules on a major privacy lawsuit', source: 'Ars Technica' }), 'DROP:off-theme');

// ── Guard: health/politics terms must NOT drop genuine space/AI stories ───
t('Keep AI vaccine research',  cat({ title: 'How machine learning is speeding up vaccine research', source: 'Ars Technica' }), 'AI & Tech');
t('Keep SpaceX court story',   cat({ title: 'Supreme Court rules on SpaceX launch license dispute', source: 'SpaceNews' }), 'Missions');
t('Keep generic Ars tech (USB-C) still works', cat({ title: 'New USB-C cable standard announced', source: 'Ars Technica' }), 'AI & Tech');

// ── UAP category (The Debrief feed + UAP keywords) ────────────────────────
t('UAP keyword: uap',          cat({ title: 'A new batch of Pentagon UAP videos will soon be released', source: 'The Debrief' }), 'UAP');
t('UAP keyword: ufo',          cat({ title: 'Trump releases UFO files in new transparency push', source: 'The Debrief' }), 'UAP');
t('UAP keyword: aaro',         cat({ title: 'AARO hosts private workshop with civilian researchers', source: 'The Debrief' }), 'UAP');
t('UAP wins over Missions',    cat({ title: 'NASA panel reviews UAP sightings near launch sites', source: 'NASA' }), 'UAP'); // 'nasa' present but UAP checked first
t('The Debrief source default', cat({ title: 'An interview about the latest disclosure hearing', source: 'The Debrief' }), 'UAP');
// Guard: astrobiology/exoplanet stays out of UAP (no bare 'alien' keyword)
t('Alien planet stays Planets', cat({ title: 'Astronomers find a potentially habitable alien planet orbiting a red dwarf', source: 'Space.com' }), 'Planets');

// ── Hard off-theme: entertainment/toy IP drops even when a space keyword hits ─
t('Drop He-Man / Masters of the Universe', cat({ title: "It had the power! The weird origins of He-Man, Skeletor, and the 'Masters of the Universe'", excerpt: "Mattel's musclebound response to 'Star Wars' had a life of its own", source: 'Space.com' }), 'DROP:off-theme');
t('Drop Miss Universe pageant', cat({ title: 'Miss Universe 2026 crowned in a dazzling ceremony', source: 'Space.com' }), 'DROP:off-theme');
t('Drop cinematic universe', cat({ title: 'The Marvel cinematic universe announces its next phase at Comic Con', source: 'Space.com' }), 'DROP:off-theme');
// Guard: genuine cosmology with "universe" stays Physics (not hard-excluded)
t('Keep origin-of-the-universe cosmology', cat({ title: 'New model rewrites the origin of the universe after the Big Bang', source: 'Space.com' }), 'Physics');

// ── Entertainment obituaries on a tech feed must NOT fall to its source default ─
t('Drop Buffy actor obituary (Ars Technica)', cat({ title: "RIP Anthony Head: Our 10 favorite moments of Buffy's Giles", excerpt: 'News broke of the passing of actor Anthony Head, best known for his portrayal of Rupert Giles on the supernatural drama Buffy the Vampire Slayer.', source: 'Ars Technica' }), 'DROP:off-theme');
t('Drop generic TV obituary', cat({ title: 'Beloved sitcom star dies at 80', excerpt: 'The actor was a fixture of the long-running soap opera.', source: 'Ars Technica' }), 'DROP:off-theme');
// Guard: a real Ars Technica AI/tech story still classifies (source default intact)
t('Keep real Ars AI story', cat({ title: 'OpenAI releases a new GPT model for developers', source: 'Ars Technica' }), 'AI & Tech');

// ── Unknown source with no keyword → unclassified, dropped ────────────────
t('Unknown source, no keyword',   cat({ title: 'Generic announcement about nothing in particular', source: 'Random Blog' }), 'DROP:unclassified');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
