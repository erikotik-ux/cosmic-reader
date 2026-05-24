// Tests for the Cosmic AI chat's [n] article-reference parser.
//
// Zero-dependency Node script (run via `npm test`). It extracts the REAL
// _parseRefs() out of app.html and exercises it, so the tests can't drift from
// the shipping source. _parseRefs turns the [n] markers the model emits into a
// de-duplicated, in-range list of article references that drive the inline
// chips and Open/Save/View-original action rows.
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

// _parseRefs is followed by the "// Map a 1-based [n] marker" comment.
const parseFn = slice('function _parseRefs(text)', '// Map a 1-based');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(parseFn + '\nthis._parseRefs = _parseRefs;', ctx);
const parseRefs = ctx._parseRefs;

let pass = 0, fail = 0;
function t(desc, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; return; }
  fail++;
  console.log('FAIL: ' + desc + '\n   got  ' + JSON.stringify(got) + '\n   want ' + JSON.stringify(want));
}

t('single ref', parseRefs('Check out [3] for the latest.'), [3]);
t('multiple refs in order', parseRefs('Read [1] then [4] then [2].'), [1, 4, 2]);
t('dedupes repeats', parseRefs('Both [5] and [5] mention it; also [5].'), [5]);
t('ignores out-of-range (0 and >20)', parseRefs('Not [0] nor [21] nor [99].'), []);
t('keeps in-range boundary 1 and 20', parseRefs('From [1] to [20].'), [1, 20]);
t('no refs → empty', parseRefs('Just a plain sentence with no markers.'), []);
t('handles empty / null', parseRefs(''), []);
t('null input safe', parseRefs(null), []);
t('ignores non-bracketed numbers', parseRefs('Apollo 11 and 1969 were big.'), []);
t('mixed valid + invalid', parseRefs('See [2], skip [0], then [7].'), [2, 7]);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
