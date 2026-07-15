const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const regionStart = '// #region 分享布局工具';
const regionEnd = '// #endregion 分享布局工具';

/**
 * 从单文件应用中抽取纯布局工具，使其能在没有 DOM、Canvas 或 localStorage 的 Node 环境中验证。
 */
function loadShareLayout() {
  const indexPath = path.join(__dirname, '..', 'index.html');
  const source = fs.readFileSync(indexPath, 'utf8');
  const start = source.indexOf(regionStart);
  assert.notEqual(start, -1, `未找到分享布局工具起始标记：${regionStart}`);

  const end = source.indexOf(regionEnd, start + regionStart.length);
  assert.notEqual(end, -1, `未找到分享布局工具结束标记：${regionEnd}`);

  const code = source.slice(start + regionStart.length, end);
  const sandbox = {};
  vm.runInNewContext(`${code}\n;globalThis.__shareLayoutExports = {\n  getShareFormat,\n  createShareLayout,\n  wrapText,\n  ellipsizeText,\n  createMetricGrid,\n  fitHeatmapGrid,\n  planRankedItems\n};`, sandbox, {
    filename: 'share-layout-engine.js'
  });

  const layout = sandbox.__shareLayoutExports;
  assert.deepEqual(Object.keys(layout).sort(), [
    'createMetricGrid',
    'createShareLayout',
    'ellipsizeText',
    'fitHeatmapGrid',
    'getShareFormat',
    'planRankedItems',
    'wrapText'
  ]);
  return layout;
}

test('分享布局工具公开所需 API 且定义五种画布尺寸', () => {
  const layout = loadShareLayout();
  const expectedFormats = {
    daily: [1080, 1440],
    weekly: [1600, 900],
    monthly: [1600, 900],
    yearly: [1080, 1440],
    heatmap: [1600, 900]
  };

  for (const [type, size] of Object.entries(expectedFormats)) {
    const format = layout.getShareFormat(type);
    assert.deepEqual([format.width, format.height], size);
    assert.equal(format.type, type);
  }
  assert.throws(() => layout.getShareFormat('unknown'), /Unknown share format/);
});

test('指标网格的所有矩形均位于周报正文安全区域内', () => {
  const layout = loadShareLayout();
  const body = layout.createShareLayout('weekly').body;
  const grid = layout.createMetricGrid(body, 4, 24, 156);

  assert.equal(grid.length, 4);
  for (const rectangle of grid) {
    assert.ok(rectangle.x >= body.x);
    assert.ok(rectangle.y >= body.y);
    assert.ok(rectangle.x + rectangle.width <= body.x + body.width);
    assert.ok(rectangle.y + rectangle.height <= body.y + body.height);
  }
});

test('热力图网格在安全区域内保留正单元格与间隙', () => {
  const layout = loadShareLayout();
  const body = layout.createShareLayout('heatmap').body;
  const grid = layout.fitHeatmapGrid(body, 53, 7, 4);

  assert.ok(grid.cell > 0);
  assert.ok(grid.gap >= 0);
  assert.ok(grid.width <= body.width);
  assert.ok(grid.height <= body.height);
  assert.ok(grid.cell + grid.gap > grid.cell);
});

test('长训练寄语换为两行且最后一行以省略号截断', () => {
  const layout = loadShareLayout();
  const measureText = text => String(text).length * 12;
  const wrapped = layout.wrapText(
    measureText,
    '宽肩撑起气场，饱满三角肌，保持节奏继续突破自己',
    72,
    2
  );

  assert.equal(wrapped.lines.length, 2);
  assert.equal(wrapped.truncated, true);
  assert.ok(wrapped.lines[1].endsWith('…'));
});

test('重复字符不会导致换行定位错误', () => {
  const layout = loadShareLayout();
  const measureText = text => String(text).length * 12;
  const wrapped = layout.wrapText(measureText, 'aaaaaa', 24, 3);

  assert.deepEqual(Array.from(wrapped.lines), ['aa', 'aa', 'aa']);
  assert.equal(wrapped.truncated, false);
});

test('文本省略结果不会超过最大宽度', () => {
  const layout = loadShareLayout();
  const measureText = text => String(text).length * 12;
  const result = layout.ellipsizeText(measureText, 'abcdef', 48);

  assert.ok(measureText(result) <= 48);
  assert.ok(result.endsWith('…'));
});

test('部位排行溢出时使用聚合行并保持在可用高度内', () => {
  const layout = loadShareLayout();
  const ranked = layout.planRankedItems(
    [['背', 8], ['胸', 7], ['肩', 6], ['腹', 5], ['腿', 4], ['手臂', 3], ['有氧', 2]],
    96,
    24
  );

  assert.equal(ranked.length, 4);
  assert.deepEqual(Array.from(ranked[3]), ['其他', 14]);
});
