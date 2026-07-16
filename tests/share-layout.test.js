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
  Object.defineProperty(layout, 'roundedRect', {
    value: sandbox.roundedRect,
    enumerable: false
  });
  return layout;
}

test('分享布局工具公开所需 API 且定义五种画布尺寸', () => {
  const layout = loadShareLayout();
  const expectedFormats = {
    daily: [1080, 1440, 72, 252, 118, 26],
    weekly: [1600, 900, 72, 126, 72, 22],
    monthly: [1600, 900, 72, 126, 72, 22],
    yearly: [1080, 1440, 72, 224, 118, 24],
    heatmap: [1600, 900, 72, 154, 92, 20]
  };

  for (const [type, size] of Object.entries(expectedFormats)) {
    const format = layout.getShareFormat(type);
    assert.deepEqual([
      format.width,
      format.height,
      format.padding,
      format.header,
      format.footer,
      format.minFont
    ], size);
    assert.equal(format.type, type);
  }
  for (const invalidType of ['unknown', 'toString', 'constructor', '__proto__']) {
    assert.throws(() => layout.getShareFormat(invalidType), /未知分享图类型/);
  }
});

test('roundedRect 在没有原生 roundRect 时使用二次曲线回退', () => {
  const layout = loadShareLayout();
  const calls = [];
  const ctx = {
    moveTo: (...args) => calls.push(['moveTo', args]),
    lineTo: (...args) => calls.push(['lineTo', args]),
    quadraticCurveTo: (...args) => calls.push(['quadraticCurveTo', args])
  };

  assert.doesNotThrow(() => layout.roundedRect(ctx, 10, 20, 100, 60, 8));
  assert.ok(calls.some(([name]) => name === 'moveTo'));
  assert.ok(calls.some(([name]) => name === 'lineTo'));
  assert.ok(calls.some(([name]) => name === 'quadraticCurveTo'));
});

test('五种分享卡片渲染器均通过 roundedRect 创建圆角路径', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const rendererNames = [
    'shareCheckinCard',
    'shareWeeklyReport',
    'shareMonthlyReport',
    'shareYearlyReport',
    'shareHeatmap'
  ];

  for (const name of rendererNames) {
    const start = source.indexOf(`function ${name}() {`);
    assert.notEqual(start, -1, `未找到分享渲染器：${name}`);
    const nextFunction = source.indexOf('\nfunction ', start + 1);
    const end = nextFunction === -1 ? source.indexOf('</script>', start) : nextFunction;
    const body = source.slice(start, end);

    assert.doesNotMatch(body, /ctx\.roundRect\(/, `${name} 仍直接调用 ctx.roundRect`);
    assert.match(body, /roundedRect\(ctx,/, `${name} 未使用 roundedRect`);
  }
});

test('热力图外框通过 roundedRect 绘制而非手工 arcTo 序列', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = source.indexOf('function shareHeatmap() {');
  assert.notEqual(start, -1, '未找到热力图分享渲染器');
  const end = source.indexOf('</script>', start);
  const body = source.slice(start, end);

  assert.match(body, /ctx\.beginPath\(\);\s*roundedRect\(ctx,\s*0,\s*0,\s*cw,\s*ch,\s*cr\);\s*ctx\.fill\(\);/);
  assert.doesNotMatch(body, /ctx\.moveTo\(cr, 0\);[\s\S]*ctx\.arcTo\(0, 0, cr, 0, cr\);\s*ctx\.closePath\(\);\s*ctx\.fill\(\);/);
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

test('排行区域不足一行时不绘制任何行并记录隐藏条目数', () => {
  const layout = loadShareLayout();
  const entries = [['背', 2], ['胸', 1]];

  for (const availableHeight of [23, 0]) {
    const ranked = layout.planRankedItems(entries, availableHeight, 24);
    assert.deepEqual(Array.from(ranked), []);
    assert.equal(ranked.hiddenCount, 2);
  }
});

test('daily action list reserves footer height before planning rows', () => {
  const layout = loadShareLayout();
  const daily = layout.createShareLayout('daily');
  const listBounds = {
    ...daily.body,
    y: daily.body.y + 330,
    height: daily.body.height - 330
  };
  const entries = Array.from({ length: 14 }, (_, index) => [`action-${index + 1}`, 1]);
  const ranked = layout.planRankedItems(entries, listBounds.height, 48, 54);

  assert.ok(ranked.length * 48 + 54 <= listBounds.height);
  assert.ok(ranked.hiddenCount > 0);
});

test('monthly muscle list reserves summary height before planning rows', () => {
  const layout = loadShareLayout();
  const monthly = layout.createShareLayout('monthly');
  const availableHeight = monthly.body.height - 350;
  const ranked = layout.planRankedItems(
    Array.from({ length: 7 }, (_, index) => [`muscle-${index + 1}`, 7 - index]),
    availableHeight,
    46,
    54
  );

  assert.ok(ranked.length * 46 + 54 <= availableHeight);
});

function getRendererBody(source, name) {
  const start = source.indexOf(`function ${name}() {`);
  assert.notEqual(start, -1, `未找到分享渲染器：${name}`);
  const nextFunction = source.indexOf('\nfunction ', start + 1);
  const end = nextFunction === -1 ? source.indexOf('</script>', start) : nextFunction;
  return source.slice(start, end);
}

test('日签渲染器委托固定画布与安全文本策略', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const body = getRendererBody(source, 'shareCheckinCard');

  assert.match(body, /drawShareCanvas\('daily'\)/);
  assert.match(body, /wrapText\(/);
  assert.match(body, /ellipsizeText\(/);
  assert.match(body, /planRankedItems\(/);
  assert.match(body, /另\s*\$?\{?[^\n}]*\}?\s*项动作/);
  assert.match(body, /layout\.footer/);
  assert.doesNotMatch(body, /const\s+H\s*=/);
});

test('周报和月报渲染器共享固定画布、指标卡与安全内容策略', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  for (const [name, type] of [['shareWeeklyReport', 'weekly'], ['shareMonthlyReport', 'monthly']]) {
    const body = getRendererBody(source, name);
    assert.match(body, new RegExp(`drawShareCanvas\\('${type}'\\)`));
    assert.match(body, /drawMetricCards\(/);
    assert.match(body, /planRankedItems\(/);
    assert.match(body, /wrapText\(/);
    assert.match(body, /layout\.footer/);
  }

  const weekly = getRendererBody(source, 'shareWeeklyReport');
  assert.match(weekly, /createMetricGrid\([^\n]*,\s*7\s*,/);

  const monthly = getRendererBody(source, 'shareMonthlyReport');
  assert.match(monthly, /fitHeatmapGrid\(/);
});

test('月报热力图按实际日历周数布局，覆盖周日开始的二月', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const monthly = getRendererBody(source, 'shareMonthlyReport');

  assert.match(monthly, /const\s+heatmapRows\s*=\s*Math\.max\(\s*1\s*,\s*Math\.ceil\(\s*\(\s*firstColumn\s*\+\s*daysInMonth\s*\)\s*\/\s*7\s*\)\s*\)/);
  assert.match(monthly, /fitHeatmapGrid\(calendarBounds,\s*7,\s*heatmapRows,\s*10\)/);
  assert.doesNotMatch(monthly, /fitHeatmapGrid\(calendarBounds,\s*7,\s*6,\s*10\)/);

  const sundayStartFebruary = new Date(2026, 1, 1);
  const firstColumn = (sundayStartFebruary.getDay() + 6) % 7;
  const daysInMonth = new Date(2026, 2, 0).getDate();
  assert.equal(Math.ceil((firstColumn + daysInMonth) / 7), 5);
});
