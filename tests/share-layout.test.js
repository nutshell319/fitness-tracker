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

/** 只加载年度统计函数，便于在不依赖浏览器 DOM 的情况下验证日期边界。 */
function loadYearlyStats(sandbox) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = source.indexOf('function computeYearlyStats() {');
  const end = source.indexOf('\nfunction getCurrentStreak()', start);
  assert.notEqual(start, -1, '未找到年度统计函数');
  assert.notEqual(end, -1, '未找到年度统计函数结束边界');
  vm.runInNewContext(`${source.slice(start, end)}\n;globalThis.__yearlyStats = computeYearlyStats;`, sandbox, {
    filename: 'yearly-stats.js'
  });
  return sandbox.__yearlyStats;
}

/** 构造在给定转折日后额外增加一小时的本地日期，用于模拟夏令时结束的时间差。 */
function createDstShiftDate(fixedDate, transitionDate) {
  const RealDate = Date;
  function DstShiftDate(...args) {
    if (!new.target) return new RealDate(fixedDate.getTime()).toString();
    if (!args.length) this.value = new RealDate(fixedDate.getTime());
    else if (args.length === 1 && args[0] instanceof DstShiftDate) this.value = new RealDate(args[0].value.getTime());
    else this.value = new RealDate(...args);
  }
  DstShiftDate.prototype.getFullYear = function() { return this.value.getFullYear(); };
  DstShiftDate.prototype.getMonth = function() { return this.value.getMonth(); };
  DstShiftDate.prototype.getDate = function() { return this.value.getDate(); };
  DstShiftDate.prototype.getDay = function() { return this.value.getDay(); };
  DstShiftDate.prototype.setHours = function(...args) { return this.value.setHours(...args); };
  DstShiftDate.prototype.setDate = function(...args) { return this.value.setDate(...args); };
  DstShiftDate.prototype.valueOf = function() {
    return this.value.getTime() + (this.value >= transitionDate ? 60 * 60 * 1000 : 0);
  };
  return DstShiftDate;
}

function countCalendarDays(start, end) {
  const cursor = new Date(start);
  let count = 0;
  while (cursor <= end) {
    count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
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

test('热力图导出复用统一画布外框而非手工 arcTo 序列', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = source.indexOf('function shareHeatmap() {');
  assert.notEqual(start, -1, '未找到热力图分享渲染器');
  const end = source.indexOf('</script>', start);
  const body = source.slice(start, end);

  assert.match(body, /drawShareCanvas\('heatmap'\)/);
  assert.doesNotMatch(body, /ctx\.arcTo\(/);
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

test('当前自然年 53 列热力图在导出正文指定区域内居中且完整落入底边界', () => {
  const layout = loadShareLayout();
  const body = layout.createShareLayout('heatmap').body;
  const bounds = {
    x: body.x,
    y: body.y + 92,
    width: body.width,
    height: body.height - 172
  };
  const grid = layout.fitHeatmapGrid(bounds, 53, 7, 4);
  const gridX = bounds.x + (bounds.width - grid.width) / 2;

  assert.ok(grid.cell > 0);
  assert.ok(gridX >= bounds.x);
  assert.ok(gridX + grid.width <= bounds.x + bounds.width);
  assert.ok(bounds.y + grid.height <= bounds.y + bounds.height);
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

function getMockFontSize(font) {
  const match = /(\d+(?:\.\d+)?)px/.exec(String(font));
  return match ? Number(match[1]) : 14;
}

function measureMockText(text, font) {
  return Array.from(String(text)).length * getMockFontSize(font);
}

function createMockCanvasContext() {
  const fillRects = [];
  const roundRects = [];
  const texts = [];
  const linearGradients = [];
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    fillRect: (x, y, width, height) => fillRects.push({ x, y, width, height }),
    roundRect: (x, y, width, height, radius) => roundRects.push({ x, y, width, height, radius }),
    fillText: (text, x, y) => texts.push({
      text: String(text),
      x,
      y,
      fillStyle: context.fillStyle,
      font: context.font,
      textAlign: context.textAlign
    }),
    measureText: text => ({ width: measureMockText(text, context.font) }),
    beginPath: () => {},
    stroke: () => {},
    fill: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    arc: () => {},
    createLinearGradient: (...args) => {
      const gradient = { args, stops: [] };
      linearGradients.push(gradient);
      return { addColorStop: (offset, color) => gradient.stops.push({ offset, color }) };
    },
    createRadialGradient: () => ({ addColorStop: () => {} })
  };
  return { context, fillRects, roundRects, texts, linearGradients };
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

function createShareRendererHarness(fixedDate = new Date(2026, 7, 31), overrides = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = source.indexOf('const SHARE_FORMATS');
  const end = source.indexOf('\nfunction getMotivation(', start);
  const heatmapStart = source.indexOf('function shareHeatmap() {');
  const heatmapEnd = source.indexOf('\nupdateSettingsUI();', heatmapStart);
  assert.notEqual(start, -1, '未找到分享格式定义');
  assert.notEqual(end, -1, '未找到分享渲染器边界');
  assert.notEqual(heatmapStart, -1, '未找到热力图渲染器边界');
  assert.notEqual(heatmapEnd, -1, '未找到热力图渲染器结束边界');

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
    getStartDate: () => new Date(2026, 2, 12),
    getSkipDates: () => ['2026-03-18', '2026-05-12', '2026-08-21'],
    getCardioDates: () => ['2026-04-06', '2026-06-08'],
    getCycle: () => [{ colors: ['#4ecdc4'], color: '#4ecdc4' }],
    getCycleDayIndexForDate: () => 0,
    getEarnedBadges: () => [{ id: 'badge-1' }, { id: 'badge-2' }],
    formatLocalDate,
    getCycleDayForDate: () => ({ colors: ['#a78bfa'], color: '#a78bfa' }),
    computeStats: () => ({
      trainDays: 18,
      skipDays: 3,
      totalDays: 31,
      muscleCount: { back: 7, chest: 6, shoulder: 5, abs: 4, legs: 3, arms: 2, cardio: 1 },
      dailyStatus
    }),
    computeYearlyStats: () => ({
      trainDays: 112,
      skipDays: 11,
      totalD: 243,
      longestStreak: 17,
      monthWeeks: Array.from({ length: 12 }, (_, month) => Array.from({ length: 5 }, (_, week) => (month + week) % 4)),
      muscleCount: { back: 27, chest: 23, shoulder: 18, abs: 15, legs: 12, arms: 9, cardio: 6 },
      bestMonth: 7,
      bestMonthDays: 18
    }),
    showSharePreview: (canvas, title, filename) => previews.push({ canvas, title, filename }),
    ...overrides
  };
  const code = source.slice(start, end) + '\n' + source.slice(heatmapStart, heatmapEnd);
  vm.runInNewContext(`${code}\n;globalThis.__shareRenderers = { createShareLayout, shareCheckinCard, shareWeeklyReport, shareMonthlyReport, shareYearlyReport, shareHeatmap };`, sandbox, {
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
    const isFooterText = text.text.includes('FitnessTracker') || text.text === '每日打卡 · 成就更好的自己';
    if (isFooterText) {
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
  assert.ok(actionTexts.some(text => text.text === '另 9 项动作'));
});

test('日签将进度与动作排成连续且清晰的卡片', () => {
  const harness = createShareRendererHarness();
  harness.shareCheckinCard();

  const [canvas] = harness.canvases;
  const layout = harness.createShareLayout('daily');
  const progressCard = canvas.recorded.roundRects.find(rectangle =>
    rectangle.x === layout.body.x &&
    rectangle.y === layout.body.y + 132 &&
    rectangle.width === layout.body.width &&
    rectangle.height === 142
  );
  assert.ok(progressCard, '进度必须使用正文中的独立信息卡');

  const motivationCard = canvas.recorded.roundRects.find(rectangle =>
    rectangle.x === layout.body.x &&
    rectangle.y === layout.body.y + 12 &&
    rectangle.width === layout.body.width &&
    rectangle.height === 96
  );
  assert.ok(motivationCard, '寄语必须使用紧凑的正文卡片');

  const actionCards = canvas.recorded.roundRects.filter(rectangle =>
    rectangle.x === layout.body.x &&
    rectangle.width === layout.body.width &&
    rectangle.height === 74 &&
    rectangle.y > progressCard.y
  );
  assert.ok(actionCards.length > 0, '今日计划必须使用动作卡片而非项目符号');
  assert.equal(actionCards[0].y - (progressCard.y + progressCard.height), 58, '首个动作卡必须与进度卡保持固定紧凑间距');
  assert.ok(actionCards.every(rectangle => rectangle.y + rectangle.height <= layout.footer.y - 84), '动作卡片必须为底部提示和页脚预留空间');

  const bodyTexts = canvas.recorded.texts.filter(text => text.y >= layout.body.y && text.y < layout.footer.y);
  assert.ok(bodyTexts.some(text => text.text === '已完成'));
  assert.ok(bodyTexts.some(text => text.text === '待完成'));
  const overflowLabel = bodyTexts.find(text => text.text === '另 9 项动作');
  assert.ok(overflowLabel, '折叠动作必须显示准确数量');
  const overflowStatus = bodyTexts.find(text => text.text === '已折叠');
  assert.ok(overflowStatus, '折叠动作必须显示明确状态');
  assert.equal(overflowStatus.x, layout.body.x + layout.body.width - 24, '折叠状态必须位于动作卡右侧');
  assert.equal(overflowStatus.y, overflowLabel.y - 1, '折叠状态必须与聚合行动作对齐');
  assert.ok(!bodyTexts.some(text => text.text === '查看计划'));
  const focusText = bodyTexts.find(text => text.text === '完成下一个动作，今天就会更进一步。');
  assert.ok(focusText, '有可用空间时必须绘制焦点提示');
  assert.ok(focusText.y <= layout.footer.y - 24, '焦点提示基线必须至少距页脚 24px');
  assertCanvasCoordinates(canvas);
  assertPeriodicContentFitsFooter(canvas, layout);
});

test('日签无动作时显示中性空态并保留页脚', () => {
  const harness = createShareRendererHarness(new Date(2026, 7, 31), {
    getTodayExercises: () => []
  });
  harness.shareCheckinCard();

  const [canvas] = harness.canvases;
  const layout = harness.createShareLayout('daily');
  const bodyTexts = canvas.recorded.texts.filter(text => text.y >= layout.body.y && text.y < layout.footer.y);
  const emptyCard = canvas.recorded.roundRects.find(rectangle =>
    rectangle.x === layout.body.x &&
    rectangle.y === layout.body.y + 332 &&
    rectangle.width === layout.body.width &&
    rectangle.height === 74
  );
  assert.ok(emptyCard, '无动作时必须绘制中性空态卡片');
  assert.ok(bodyTexts.some(text => text.text === '今天还没有安排动作，给身体一点恢复空间。'));
  assert.ok(!bodyTexts.some(text => /^另 \d+ 项动作$/.test(text.text)));
  assertCanvasCoordinates(canvas);
  assertPeriodicContentFitsFooter(canvas, layout);
});

test('日签会省略超长动作名称并保持正文安全边界', () => {
  const longExerciseName = '高强度全身训练动作名称验证文字溢出后必须被省略显示'.repeat(4);
  const harness = createShareRendererHarness(new Date(2026, 7, 31), {
    getTodayExercises: () => [{ id: 'long-exercise-1', name: longExerciseName }]
  });
  harness.shareCheckinCard();

  const [canvas] = harness.canvases;
  const layout = harness.createShareLayout('daily');
  const labelWidth = layout.body.width - 220;
  assert.ok(measureMockText(longExerciseName, '26px "Microsoft YaHei"') > labelWidth, '长文本夹具必须超过动作标签可用宽度');
  const actionText = canvas.recorded.texts.find(text =>
    text.y >= layout.body.y + 332 &&
    text.y < layout.footer.y &&
    text.font === '26px "Microsoft YaHei","PingFang SC",sans-serif' &&
    text.text.endsWith('…')
  );
  assert.ok(actionText, '超长动作名称必须以省略号结尾');
  assert.ok(measureMockText(actionText.text, actionText.font) <= labelWidth, '动作名称必须按实际 26px 字体测量后省略');
  const statusText = canvas.recorded.texts.find(text => text.text === '待完成');
  assert.ok(statusText, '动作卡必须绘制右侧状态');
  const statusReservedX = statusText.x - measureMockText(statusText.text, statusText.font);
  assert.ok(actionText.x + measureMockText(actionText.text, actionText.font) <= statusReservedX, '动作名称右缘不得侵入右侧状态预留区');
  assertCanvasCoordinates(canvas);
  assertPeriodicContentFitsFooter(canvas, layout);
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

test('年报渲染器在模拟画布中使用纵向安全布局并保留预览文件名', () => {
  const harness = createShareRendererHarness(new Date(2026, 7, 31));
  harness.shareYearlyReport();

  const [canvas] = harness.canvases;
  const [preview] = harness.previews;
  const layout = harness.createShareLayout('yearly');
  assert.equal(canvas.width, 1080);
  assert.equal(canvas.height, 1440);
  assert.equal(preview.canvas, canvas);
  assert.equal(preview.filename, 'FitnessTracker-Yearly-2026.png');
  assert.equal(canvas.recorded.roundRects.filter(rectangle => rectangle.y === layout.body.y + 12 && rectangle.height === 128).length, 4);
  assertCanvasCoordinates(canvas);

  const overviewBounds = { x: layout.body.x, y: layout.body.y + 206, width: layout.body.width, height: 238 };
  const overviewCells = canvas.recorded.roundRects.filter(rectangle => rectangle.radius === 6 && rectangle.y >= overviewBounds.y && rectangle.y < overviewBounds.y + overviewBounds.height);
  assert.ok(overviewCells.length >= 12);
  assert.ok(overviewCells.every(cell => cell.x >= overviewBounds.x && cell.x + cell.width <= overviewBounds.x + overviewBounds.width));
  assert.ok(overviewCells.every(cell => cell.y + cell.height <= overviewBounds.y + overviewBounds.height));
});

test('热力图渲染器固定导出当前自然年 53 周并将网格限制在安全正文区域', () => {
  const harness = createShareRendererHarness(new Date(2026, 7, 31));
  harness.shareHeatmap();

  const [canvas] = harness.canvases;
  const [preview] = harness.previews;
  const layout = harness.createShareLayout('heatmap');
  const bounds = {
    x: layout.body.x,
    y: layout.body.y + 92,
    width: layout.body.width,
    height: layout.body.height - 172
  };
  const sourceLayout = loadShareLayout();
  const grid = sourceLayout.fitHeatmapGrid(bounds, 53, 7, 4);
  const cells = canvas.recorded.roundRects.filter(rectangle => rectangle.width === grid.cell && rectangle.height === grid.cell && rectangle.radius === 6);

  assert.equal(canvas.width, 1600);
  assert.equal(canvas.height, 900);
  assert.equal(preview.canvas, canvas);
  assert.equal(preview.filename, 'FitnessTracker-2026-08-31.png');
  assert.equal(cells.length, 53 * 7);
  assert.ok(cells.every(cell => cell.x >= bounds.x && cell.x + cell.width <= bounds.x + bounds.width));
  assert.ok(cells.every(cell => cell.y >= bounds.y && cell.y + cell.height <= bounds.y + bounds.height));
  assertCanvasCoordinates(canvas);
});

test('年度统计按日历循环计算总天数，不受夏令时结束额外一小时影响', () => {
  const fixedDate = new Date(2026, 10, 2);
  const DstShiftDate = createDstShiftDate(fixedDate, new Date(2026, 6, 1));
  const computeYearlyStats = loadYearlyStats({
    Date: DstShiftDate,
    localStorage: { getItem: () => null },
    getStartDate: () => new DstShiftDate(2026, 0, 1),
    formatLocalDate: date => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
    getCycleDayForDate: () => null
  });

  const stats = computeYearlyStats();
  const expectedDays = countCalendarDays(new Date(2026, 0, 1), fixedDate);
  assert.equal(stats.totalD, expectedDays);
  assert.equal(stats.trainDays, expectedDays);
});

test('年报最长连续指标使用当年统计值而非历史纪录', () => {
  const harness = createShareRendererHarness(new Date(2026, 7, 31), {
    getLongestStreak: () => 999,
    computeYearlyStats: () => ({
      trainDays: 112,
      skipDays: 11,
      totalD: 243,
      longestStreak: 8,
      monthWeeks: Array.from({ length: 12 }, () => [1, 1, 1, 1, 1]),
      muscleCount: { back: 27 },
      bestMonth: 7,
      bestMonthDays: 18
    })
  });
  harness.shareYearlyReport();

  const metricValues = harness.canvases[0].recorded.texts
    .filter(text => text.fillStyle === '#a78bfa')
    .map(text => text.text);
  assert.ok(metricValues.includes('8'));
  assert.ok(!metricValues.includes('999'));
});

test('无训练年度显示中性提示而不把一月标成最努力月份', () => {
  const harness = createShareRendererHarness(new Date(2026, 7, 31), {
    computeYearlyStats: () => ({
      trainDays: 0,
      skipDays: 0,
      totalD: 243,
      longestStreak: 0,
      monthWeeks: Array.from({ length: 12 }, () => []),
      muscleCount: {},
      bestMonth: 0,
      bestMonthDays: 0
    })
  });
  harness.shareYearlyReport();

  const texts = harness.canvases[0].recorded.texts.map(text => text.text);
  assert.ok(texts.includes('本年度暂未记录训练，随时开始第一天。'));
  assert.ok(!texts.some(text => text.includes('最努力月份：1 月')));
});

test('热力图统计限定当前自然年，即使训练开始日期位于更早年份', () => {
  const harness = createShareRendererHarness(new Date(2026, 7, 31), {
    getStartDate: () => new Date(2024, 0, 1),
    getSkipDates: () => ['2024-01-10'],
    getCardioDates: () => []
  });
  harness.shareHeatmap();

  const stats = harness.canvases[0].recorded.texts;
  assert.ok(stats.some(text => text.text === '243' && text.fillStyle === '#ff6b35'));
  assert.ok(stats.some(text => text.text === '0' && text.fillStyle === '#e85d75'));
  assert.ok(stats.some(text => text.text === '243' && text.fillStyle === '#4ecdc4'));
});

test('热力图为双色训练计划创建并填充线性渐变', () => {
  const harness = createShareRendererHarness(new Date(2026, 7, 31), {
    getCycle: () => [{ colors: ['#112233', '#445566'], color: '#112233' }]
  });
  harness.shareHeatmap();

  const gradients = harness.canvases[0].recorded.linearGradients;
  assert.ok(gradients.length > 0);
  assert.deepEqual(gradients[0].stops, [
    { offset: 0, color: '#112233' },
    { offset: 1, color: '#445566' }
  ]);
});

test('闰年周日开始的当前自然年生成 54 列热力图且所有单元格位于安全边界内', () => {
  const harness = createShareRendererHarness(new Date(2012, 11, 31), {
    getStartDate: () => new Date(2012, 0, 1),
    getSkipDates: () => [],
    getCardioDates: () => []
  });
  harness.shareHeatmap();

  const layout = harness.createShareLayout('heatmap');
  const bounds = {
    x: layout.body.x,
    y: layout.body.y + 92,
    width: layout.body.width,
    height: layout.body.height - 172
  };
  const grid = loadShareLayout().fitHeatmapGrid(bounds, 54, 7, 4);
  const cells = harness.canvases[0].recorded.roundRects
    .filter(rectangle => rectangle.width === grid.cell && rectangle.height === grid.cell && rectangle.radius === 6);

  assert.equal(cells.length, 54 * 7);
  assert.ok(cells.every(cell => cell.x >= bounds.x && cell.x + cell.width <= bounds.x + bounds.width));
  assert.ok(cells.every(cell => cell.y >= bounds.y && cell.y + cell.height <= bounds.y + bounds.height));
});
