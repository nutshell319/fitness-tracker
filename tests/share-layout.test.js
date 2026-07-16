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
    y: daily.body.y + 292,
    height: daily.footer.y - (daily.body.y + 292)
  };
  const entries = Array.from({ length: 14 }, (_, index) => [`action-${index + 1}`, 1]);
  const ranked = layout.planRankedItems(entries, listBounds.height, 52, 54);

  assert.ok(ranked.length * 52 + 54 <= listBounds.height);
  assert.equal(ranked.hiddenCount, 4);
});

test('monthly muscle list stays above the actual side-panel summary', () => {
  const layout = loadShareLayout();
  const monthly = layout.createShareLayout('monthly');
  const muscleBounds = {
    x: monthly.body.x + 720,
    y: monthly.body.y + 186,
    width: monthly.body.width - 720,
    height: 138
  };
  const summaryY = monthly.body.y + 402;
  const ranked = layout.planRankedItems(
    Array.from({ length: 7 }, (_, index) => [`muscle-${index + 1}`, 7 - index]),
    muscleBounds.height,
    46
  );

  assert.ok(muscleBounds.y + ranked.length * 46 <= summaryY);
});

function getRendererBody(source, name) {
  const start = source.indexOf(`function ${name}() {`);
  assert.notEqual(start, -1, `未找到分享渲染器：${name}`);
  const nextFunction = source.indexOf('\nfunction ', start + 1);
  const end = nextFunction === -1 ? source.indexOf('</script>', start) : nextFunction;
  return source.slice(start, end);
}

function createMockCanvasContext() {
  const fillRects = [];
  const roundRects = [];
  const texts = [];
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    fillRect: (x, y, width, height) => fillRects.push({ x, y, width, height }),
    roundRect: (x, y, width, height, radius) => roundRects.push({ x, y, width, height, radius }),
    fillText: (text, x, y) => texts.push({ text: String(text), x, y }),
    measureText: text => ({ width: Array.from(String(text)).length * 14 }),
    beginPath: () => {},
    stroke: () => {},
    fill: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    arc: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} })
  };
  return { context, fillRects, roundRects, texts };
}

function createFixedDateConstructor(fixedDate) {
  const RealDate = Date;
  function FixedDate(...args) {
    if (!new.target) return new RealDate(fixedDate.getTime()).toString();
    return args.length ? new RealDate(...args) : new RealDate(fixedDate.getTime());
  }
  FixedDate.prototype = RealDate.prototype;
  FixedDate.now = () => fixedDate.getTime();
  FixedDate.parse = RealDate.parse;
  FixedDate.UTC = RealDate.UTC;
  return FixedDate;
}

function createShareRendererHarness(fixedDate = new Date(2026, 7, 31)) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = source.indexOf('const SHARE_FORMATS');
  const end = source.indexOf('\nfunction shareYearlyReport()', start);
  assert.notEqual(start, -1, '未找到分享格式定义');
  assert.notEqual(end, -1, '未找到年报渲染器边界');

  const canvases = [];
  const previews = [];
  const formatLocalDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const exercises = Array.from({ length: 14 }, (_, index) => ({
    id: `exercise-${index + 1}`,
    name: `超长训练动作名称 ${index + 1}：保持稳定节奏完成每一次重复`
  }));
  const dailyStatus = Array.from({ length: 31 }, (_, index) => ({
    ds: formatLocalDate(new Date(2026, 7, index + 1)),
    type: index % 8 === 0 ? 'skip' : index % 5 === 0 ? 'cardio' : 'train'
  }));
  const sandbox = {
    Date: createFixedDateConstructor(fixedDate),
    document: {
      createElement: name => {
        assert.equal(name, 'canvas');
        const recorded = createMockCanvasContext();
        const canvas = {
          width: 0,
          height: 0,
          getContext: type => {
            assert.equal(type, '2d');
            return recorded.context;
          },
          recorded
        };
        canvases.push(canvas);
        return canvas;
      }
    },
    getTodayCycleDay: () => ({
      emoji: '🏋️',
      name: '高强度全身训练日',
      motivation: '保持核心稳定，专注呼吸与动作质量，长期坚持会带来真正的改变。'.repeat(4),
      colors: ['#ff6b35', '#4ecdc4']
    }),
    getTodayExercises: () => exercises,
    isDone: id => Number(id.slice(id.lastIndexOf('-') + 1)) % 2 === 0,
    isTodayCheckedIn: () => true,
    getCurrentStreak: () => 12,
    getLongestStreak: () => 24,
    formatLocalDate,
    getCycleDayForDate: () => ({ colors: ['#a78bfa'], color: '#a78bfa' }),
    computeStats: () => ({
      trainDays: 18,
      skipDays: 3,
      totalDays: 31,
      muscleCount: { back: 7, chest: 6, shoulder: 5, abs: 4, legs: 3, arms: 2, cardio: 1 },
      dailyStatus
    }),
    showSharePreview: (canvas, title, filename) => previews.push({ canvas, title, filename })
  };
  const code = source.slice(start, end);
  vm.runInNewContext(`${code}\n;globalThis.__shareRenderers = { createShareLayout, shareCheckinCard, shareWeeklyReport, shareMonthlyReport };`, sandbox, {
    filename: 'share-renderers.js'
  });
  return { ...sandbox.__shareRenderers, canvases, previews };
}

function assertCanvasCoordinates(canvas) {
  const { fillRects, roundRects, texts } = canvas.recorded;
  for (const rectangle of [...fillRects, ...roundRects]) {
    assert.ok(rectangle.x >= 0 && rectangle.y >= 0, '矩形绘制坐标不能为负数');
    assert.ok(rectangle.x + rectangle.width <= canvas.width, '矩形不能越过画布右边界');
    assert.ok(rectangle.y + rectangle.height <= canvas.height, '矩形不能越过画布下边界');
  }
  for (const text of texts) {
    assert.ok(text.x >= 0 && text.x <= canvas.width, '文本锚点必须位于画布宽度内');
    assert.ok(text.y >= 0 && text.y <= canvas.height, '文本锚点必须位于画布高度内');
  }
}

function assertPeriodicContentFitsFooter(canvas, layout) {
  for (const rectangle of canvas.recorded.roundRects) {
    if (rectangle.y >= layout.body.y && rectangle.y < layout.footer.y) {
      assert.ok(rectangle.y + rectangle.height <= layout.footer.y, '正文圆角矩形不能侵入页脚');
    }
  }
  for (const text of canvas.recorded.texts) {
    if (text.text.includes('FitnessTracker')) {
      assert.ok(text.y >= layout.footer.y && text.y <= layout.footer.y + layout.footer.height, '页脚文字必须位于页脚安全区');
    } else {
      assert.ok(text.y <= layout.footer.y, '正文文字不能侵入页脚');
    }
  }
}

test('日签渲染器在模拟画布中限制长文本动作并保留页脚', () => {
  const harness = createShareRendererHarness();
  harness.shareCheckinCard();

  const [canvas] = harness.canvases;
  const [preview] = harness.previews;
  const layout = harness.createShareLayout('daily');
  assert.equal(canvas.width, 1080);
  assert.equal(canvas.height, 1440);
  assert.equal(preview.canvas, canvas);
  assert.equal(preview.filename, 'FitnessTracker-Daily-2026-08-31.png');
  assertCanvasCoordinates(canvas);

  const actionTextY = layout.body.y + 292;
  const actionTexts = canvas.recorded.texts.filter(text => text.y >= actionTextY && text.y < layout.footer.y);
  assert.ok(actionTexts.length > 0);
  assert.ok(actionTexts.every(text => text.y <= layout.footer.y - 54));
  assert.ok(actionTexts.some(text => text.text === '另 4 项动作'));
});

test('周报渲染器在模拟画布中绘制固定指标、内容与页脚', () => {
  const harness = createShareRendererHarness();
  harness.shareWeeklyReport();

  const [canvas] = harness.canvases;
  const [preview] = harness.previews;
  const layout = harness.createShareLayout('weekly');
  assert.equal(canvas.width, 1600);
  assert.equal(canvas.height, 900);
  assert.equal(preview.canvas, canvas);
  assert.equal(preview.filename, 'FitnessTracker-Weekly-2026-09-06.png');
  assert.equal(canvas.recorded.roundRects.filter(rectangle => rectangle.y === layout.body.y + 12 && rectangle.height === 112).length, 4);
  assertCanvasCoordinates(canvas);
  assertPeriodicContentFitsFooter(canvas, layout);
});

test('月报渲染器在模拟画布中以六行绘制完整的 2026 年八月', () => {
  const harness = createShareRendererHarness(new Date(2026, 7, 31));
  harness.shareMonthlyReport();

  const [canvas] = harness.canvases;
  const [preview] = harness.previews;
  const layout = harness.createShareLayout('monthly');
  assert.equal(canvas.width, 1600);
  assert.equal(canvas.height, 900);
  assert.equal(preview.canvas, canvas);
  assert.equal(preview.filename, 'FitnessTracker-Monthly-8.png');
  assert.equal(canvas.recorded.roundRects.filter(rectangle => rectangle.y === layout.body.y + 12 && rectangle.height === 106).length, 4);
  assertCanvasCoordinates(canvas);
  assertPeriodicContentFitsFooter(canvas, layout);

  const calendarBounds = { x: layout.body.x, y: layout.body.y + 200, width: 560, height: 248 };
  const cells = canvas.recorded.roundRects.filter(rectangle => rectangle.radius === 6 && rectangle.width === rectangle.height && rectangle.y >= calendarBounds.y);
  assert.equal(cells.length, 31);
  assert.equal(new Set(cells.map(cell => cell.y)).size, 6);
  assert.ok(Math.max(...cells.map(cell => cell.x + cell.width)) <= calendarBounds.x + calendarBounds.width);
  assert.ok(Math.max(...cells.map(cell => cell.y + cell.height)) <= calendarBounds.y + calendarBounds.height);
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
