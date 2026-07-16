# Daily Share Card Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 1080×1440 daily share card feel full and make each planned exercise immediately scannable without changing data semantics or the footer safe zone.

**Architecture:** Keep the existing `shareCheckinCard` Canvas renderer and shared `daily` safe layout. Replace only its motivation/progress/list body with a compact motivation panel, a progress summary card, and sequential exercise cards; use existing `planRankedItems`, `ellipsizeText`, and `roundedRect` helpers.

**Tech Stack:** Vanilla JavaScript, HTML Canvas 2D, Node.js `node:test` with the existing Canvas mock harness.

---

## File Structure

| File | Responsibility |
|---|---|
| `C:/programs/个人项目/fitness-tracker/index.html` | Render the denser daily card body within the existing `layout.body` and `layout.footer` safe regions. |
| `C:/programs/个人项目/fitness-tracker/tests/share-layout.test.js` | Assert the new daily summary and action cards are contiguous, bounded, and preserve the footer. |

### Task 1: Render a dense and readable daily plan

**Files:**
- Modify: `C:/programs/个人项目/fitness-tracker/index.html:1712-1778` (`shareCheckinCard` body section)
- Modify: `C:/programs/个人项目/fitness-tracker/tests/share-layout.test.js:466-485`

- [ ] **Step 1: Add a failing renderer contract for the daily summary and action cards**

Insert this test immediately after the existing daily renderer test:

```javascript
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

  const actionCards = canvas.recorded.roundRects.filter(rectangle =>
    rectangle.x === layout.body.x &&
    rectangle.width === layout.body.width &&
    rectangle.height === 74 &&
    rectangle.y > progressCard.y
  );
  assert.ok(actionCards.length > 0, '今日计划必须使用动作卡片而非项目符号');
  assert.ok(actionCards[0].y - (progressCard.y + progressCard.height) <= 72, '动作列表应紧接进度卡，避免大面积留白');
  assert.ok(actionCards.every(rectangle => rectangle.y + rectangle.height <= layout.footer.y - 84), '动作卡片必须为底部提示和页脚预留空间');

  const bodyTexts = canvas.recorded.texts.filter(text => text.y >= layout.body.y && text.y < layout.footer.y);
  assert.ok(bodyTexts.some(text => text.text === '已完成'));
  assert.ok(bodyTexts.some(text => text.text === '待完成'));
  assert.ok(bodyTexts.some(text => text.text === '另 4 项动作'));
  assertCanvasCoordinates(canvas);
  assertPeriodicContentFitsFooter(canvas, layout);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
& 'C:\Program Files\nodejs\node.exe' --test --test-name-pattern "日签将进度与动作排成连续且清晰的卡片" tests/share-layout.test.js
```

Expected: FAIL with `进度必须使用正文中的独立信息卡`, because the current renderer has only a thin progress bar and bullet-style actions.

- [ ] **Step 3: Replace the daily body with summary and action cards**

In `shareCheckinCard`, keep the header and footer unchanged. Replace the existing `motivationBounds` through `plannedActions.forEach` section with the following behavior:

```javascript
const motivationBounds = { x: layout.body.x, y: layout.body.y + 12, width: layout.body.width, height: 96 };
// 保留两行以内的训练寄语，但缩短面板，让进度和计划尽早进入视线。
ctx.fillStyle = 'rgba(255,255,255,0.03)';
ctx.beginPath();
roundedRect(ctx, motivationBounds.x, motivationBounds.y, motivationBounds.width, motivationBounds.height, 18);
ctx.fill();
ctx.strokeStyle = '#2a2d36';
ctx.lineWidth = 2;
ctx.beginPath();
roundedRect(ctx, motivationBounds.x, motivationBounds.y, motivationBounds.width, motivationBounds.height, 18);
ctx.stroke();
const motivation = cycleDay && cycleDay.motivation ? cycleDay.motivation : '坚持就是胜利！';
ctx.textAlign = 'center';
ctx.fillStyle = '#c0bbb4';
ctx.font = '24px "Microsoft YaHei","PingFang SC",sans-serif';
wrapText(measure, `“${motivation}”`, motivationBounds.width - 72, 2).lines
  .forEach((line, index) => ctx.fillText(line, width / 2, motivationBounds.y + 42 + index * 30));

const completion = exercises.length ? completedCount / exercises.length : 0;
const progressBounds = { x: layout.body.x, y: layout.body.y + 132, width: layout.body.width, height: 142 };
ctx.fillStyle = 'rgba(255,255,255,0.035)';
ctx.beginPath();
roundedRect(ctx, progressBounds.x, progressBounds.y, progressBounds.width, progressBounds.height, 18);
ctx.fill();
ctx.strokeStyle = '#2a2d36';
ctx.lineWidth = 2;
ctx.beginPath();
roundedRect(ctx, progressBounds.x, progressBounds.y, progressBounds.width, progressBounds.height, 18);
ctx.stroke();
ctx.textAlign = 'left';
ctx.fillStyle = '#a09d98';
ctx.font = '23px "Microsoft YaHei","PingFang SC",sans-serif';
ctx.fillText('今日进度', progressBounds.x + 28, progressBounds.y + 40);
ctx.fillStyle = '#e4e2df';
ctx.font = 'bold 42px "Microsoft YaHei","PingFang SC",sans-serif';
ctx.fillText(`${completedCount}/${exercises.length}`, progressBounds.x + 28, progressBounds.y + 90);
ctx.textAlign = 'right';
ctx.fillStyle = completion === 1 && exercises.length ? '#22c55e' : '#ff6b35';
ctx.font = 'bold 34px "Microsoft YaHei","PingFang SC",sans-serif';
ctx.fillText(`${Math.round(completion * 100)}%`, progressBounds.x + progressBounds.width - 28, progressBounds.y + 64);
ctx.fillStyle = '#121418';
ctx.beginPath();
roundedRect(ctx, progressBounds.x + 28, progressBounds.y + 108, progressBounds.width - 56, 12, 6);
ctx.fill();
if (completion > 0) {
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  roundedRect(ctx, progressBounds.x + 28, progressBounds.y + 108, Math.max(12, (progressBounds.width - 56) * completion), 12, 6);
  ctx.fill();
}

const actionRowHeight = 74;
const actionListY = progressBounds.y + progressBounds.height + 58;
const focusReserve = 96;
const actionBounds = { x: layout.body.x, y: actionListY, width: layout.body.width, height: layout.footer.y - actionListY - focusReserve };
const plannedActions = planRankedItems(
  exercises.map((exercise, index) => [String(index), exercises.length - index]),
  actionBounds.height,
  actionRowHeight
);
ctx.textAlign = 'left';
ctx.fillStyle = '#a09d98';
ctx.font = 'bold 24px "Microsoft YaHei","PingFang SC",sans-serif';
ctx.fillText('今日计划', actionBounds.x, actionBounds.y - 18);
if (!plannedActions.length && !exercises.length) {
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  ctx.beginPath();
  roundedRect(ctx, actionBounds.x, actionBounds.y, actionBounds.width, 74, 16);
  ctx.fill();
  ctx.fillStyle = '#a09d98';
  ctx.font = '24px "Microsoft YaHei","PingFang SC",sans-serif';
  ctx.fillText('今天还没有安排动作，给身体一点恢复空间。', actionBounds.x + 28, actionBounds.y + 46);
}
plannedActions.forEach(([actionIndex], rowIndex) => {
  const y = actionBounds.y + rowIndex * actionRowHeight;
  const isOverflow = actionIndex === '其他';
  const exercise = isOverflow ? null : exercises[Number(actionIndex)];
  const done = Boolean(exercise && isDone(exercise.id));
  ctx.fillStyle = done ? 'rgba(34,197,94,0.09)' : 'rgba(255,255,255,0.035)';
  ctx.beginPath();
  roundedRect(ctx, actionBounds.x, y, actionBounds.width, 74, 16);
  ctx.fill();
  ctx.fillStyle = done ? '#22c55e' : '#3a3d47';
  ctx.beginPath();
  ctx.arc(actionBounds.x + 28, y + 37, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = done ? '#10120f' : '#c0bbb4';
  ctx.font = 'bold 18px "Microsoft YaHei","PingFang SC",sans-serif';
  ctx.fillText(done ? '✓' : String(rowIndex + 1), actionBounds.x + 28, y + 43);
  const label = isOverflow
    ? `另 ${plannedActions.hiddenCount || 0} 项动作`
    : ellipsizeText(measure, exercise ? exercise.name : '未命名动作', actionBounds.width - 220);
  ctx.textAlign = 'left';
  ctx.fillStyle = isOverflow ? '#a09d98' : (done ? '#e4e2df' : '#c0bbb4');
  ctx.font = '26px "Microsoft YaHei","PingFang SC",sans-serif';
  ctx.fillText(label, actionBounds.x + 64, y + 45);
  ctx.textAlign = 'right';
  ctx.fillStyle = done ? '#22c55e' : '#a09d98';
  ctx.font = '21px "Microsoft YaHei","PingFang SC",sans-serif';
  ctx.fillText(isOverflow ? '查看计划' : (done ? '已完成' : '待完成'), actionBounds.x + actionBounds.width - 24, y + 44);
});
```

After the action rows, draw a small neutral focus sentence only when it fits entirely above `layout.footer.y`; do not move or redraw the existing footer. For incomplete plans use `完成下一个动作，今天就会更进一步。`; for completed plans use `今日计划已完成，记得适度拉伸和补水。`.

- [ ] **Step 4: Run focused and full regression tests to confirm GREEN**

Run:

```powershell
& 'C:\Program Files\nodejs\node.exe' --test --test-name-pattern "日签" tests/share-layout.test.js
& 'C:\Program Files\nodejs\node.exe' --test tests/*.test.js
```

Expected: the focused daily tests pass, then the full suite passes with no failures.

- [ ] **Step 5: Parse the page script, inspect whitespace, and commit**

Run:

```powershell
& 'C:\Program Files\nodejs\node.exe' -e "const fs=require('fs');const html=fs.readFileSync('index.html','utf8');for(const [,source] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))new Function(source);console.log('index.html inline scripts parsed');"
& 'C:\Program Files\Git\bin\git.exe' diff --check
& 'C:\Program Files\Git\bin\git.exe' add -- index.html tests/share-layout.test.js
& 'C:\Program Files\Git\bin\git.exe' commit -m "refactor: densify daily share card"
```

Expected: parser reports one successful parse, `git diff --check` has no output, and the commit contains only the renderer and its regression test.

## Plan Self-Review

- Spec coverage: Task 1 preserves the fixed daily format and footer, adds a clear progress card and stateful action cards, handles empty and overflowing plans, and asserts long/overflow content remains bounded.
- Placeholder scan: no `TODO`, `TBD`, deferred implementation, or undefined helper is used; all referenced helpers already exist in the renderer.
- Type consistency: `roundRects`, `texts`, `createShareRendererHarness`, `assertCanvasCoordinates`, and `assertPeriodicContentFitsFooter` are existing test-harness APIs; `planRankedItems`, `ellipsizeText`, `wrapText`, and `roundedRect` are existing production helpers.
