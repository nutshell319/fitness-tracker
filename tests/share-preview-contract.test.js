const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function getBlock(css, start) {
  const openingBrace = css.indexOf('{', start);
  assert.notEqual(openingBrace, -1, 'missing opening CSS brace');

  let depth = 0;
  for (let index = openingBrace; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    if (depth === 0) return css.slice(openingBrace + 1, index);
  }

  assert.fail('missing closing CSS brace');
}

function getRule(selector, css = source) {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `missing CSS rule: ${selector}`);
  return getBlock(css, start);
}

test('share preview uses a bounded three-row grid layout', () => {
  const content = getRule('.share-preview-content');

  assert.match(content, /display\s*:\s*grid\s*;/);
  assert.match(content, /grid-template-rows\s*:\s*auto\s+minmax\(\s*0\s*,\s*1fr\s*\)\s+auto\s*;/);
  const body = getRule('.share-preview-body');
  assert.match(body, /min-height\s*:\s*0\s*;/);
  assert.match(body, /overflow\s*:\s*auto\s*;/);
  const image = getRule('.share-preview-img');
  assert.match(image, /max-width\s*:\s*100%\s*;/);
  assert.match(image, /max-height\s*:\s*100%\s*;/);
  assert.match(image, /object-fit\s*:\s*contain\s*;/);
});

test('share preview image styling is class-based and mobile actions form two columns', () => {
  const image = source.match(/<img\s+id="sharePreviewImg"[^>]*\/>/);
  assert.ok(image, 'missing share preview image');
  assert.match(image[0], /class="share-preview-img"/);
  assert.doesNotMatch(image[0], /\sstyle\s*=/);

  const mediaStart = source.search(/@media\s*\(\s*max-width\s*:\s*480px\s*\)/);
  assert.notEqual(mediaStart, -1, 'missing 480px responsive media query');
  const actions = getRule('.share-preview-actions', getBlock(source, mediaStart));
  assert.match(actions, /grid-template-columns\s*:\s*repeat\(\s*2\s*,\s*minmax\(\s*0\s*,\s*1fr\s*\)\s*\)\s*;/);
});
