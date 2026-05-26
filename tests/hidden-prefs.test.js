// Tests for the feed-tuning hidden-article predicate (_crIsHiddenArticle).
//
// Zero-dependency Node script (run via `npm test`). Extracts the REAL
// _crIsHiddenArticle out of app.html so the test can't drift from shipping
// code. _crIsHiddenArticle(article, hiddenSources, hiddenTopics) -> bool:
// true when the article's source is in hiddenSources OR its category is in
// hiddenTopics. Drives the My Feed / For You exclusion in getFilteredArticles.
//
// Exits non-zero if any case fails.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = path.join(__dirname, '..', 'app.html');
let src = fs.readFileSync(APP, 'utf8').replace(/\r/g, '');

function slice(start, end) {
  const i = src.indexOf(start);
  if (i < 0) throw new Error('start marker not found: ' + start);
  const j = src.indexOf(end, i);
  if (j < 0) throw new Error('end marker not found: ' + end);
  return src.slice(i, j);
}

const fn = slice('function _crIsHiddenArticle(', 'function getFilteredArticles');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fn + '\nthis._crIsHiddenArticle = _crIsHiddenArticle;', ctx);
const isHidden = ctx._crIsHiddenArticle;

let pass = 0, fail = 0;
function t(desc, got, want) {
  if (got === want) { pass++; return; }
  fail++;
  console.log('FAIL: ' + desc + '\n   got  ' + got + '\n   want ' + want);
}

const art = { title: 'X', source: 'Space.com', category: 'Moon' };

t('hidden source -> true',          isHidden(art, ['Space.com'], []), true);
t('hidden topic -> true',           isHidden(art, [], ['Moon']), true);
t('hidden source + topic -> true',  isHidden(art, ['Space.com'], ['Moon']), true);
t('neither hidden -> false',        isHidden(art, ['NASA'], ['Physics']), false);
t('empty arrays -> false',          isHidden(art, [], []), false);
t('null arrays safe -> false',      isHidden(art, null, null), false);
t('null article -> false',          isHidden(null, ['Space.com'], ['Moon']), false);
t('different source kept',          isHidden({ source: 'NASA', category: 'Missions' }, ['Space.com'], ['Moon']), false);
t('case-sensitive source (exact)',  isHidden({ source: 'space.com', category: 'Moon' }, ['Space.com'], []), false);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
