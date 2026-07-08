# 健身训练追踪网站 实施计划

> **For agentic workers:** 单文件 HTML 项目，可直接按 Task 顺序执行。

**Goal:** 构建单文件 HTML 健身训练网站，支持背/胸/肩三分化训练，练三休一轮换，SVG 动作示意图 + B 站视频链接。

**Architecture:** 单文件 HTML（`fitness-tracker.html`），CSS/JS 全部内联，零外部依赖。数据层用内嵌 JSON 存储 15 个动作，业务层用纯 JS 实现日期轮换算法，持久层用 LocalStorage。

**Tech Stack:** HTML5 + CSS3 + Vanilla JS（ES6），无框架，无构建工具。

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `C:/Users/56562/fitness-tracker.html` | 单文件，包含全部 HTML 结构、CSS 样式、JS 逻辑、SVG 图形、动作数据 |

---

### Task 1: 创建 HTML 骨架与 CSS 样式系统

**Files:**
- Create: `C:/Users/56562/fitness-tracker.html`

- [ ] **Step 1: 写入 HTML 结构和 CSS 样式**

写入完整文件的第一部分——HTML 骨架和所有 CSS 样式。配色采用深色健身主题（深灰背景 #1a1d23，主色橙色 #ff6b35，强调色青色 #00d4aa），移动端响应式布局，卡片式动作展示。

关键 CSS 类：
- `.header` — 顶部今日概览，大标题 + 日期
- `.cycle-bar` — 4 日周期条，显示循环节奏
- `.exercise-card` — 动作卡片，可点击展开
- `.exercise-detail` — 展开区域，含 SVG 图 + 要领 + 视频
- `.tag-nav` — 背/胸/肩标签切换
- `.skip-btn` — 跳过今天按钮
- `.settings-panel` — 底部设置面板

### Task 2: 添加动作数据与 SVG 示意图

- [ ] **Step 1: 定义 15 个动作的完整数据**

每个动作数据结构：
```javascript
{
  id: "lat-pulldown",
  name: "高位下拉",
  muscle: "back",        // back | chest | shoulder
  setsReps: "4×10-12",
  rest: "60-90秒",
  difficulty: "新手",
  steps: [
    "调整大腿垫，使膝盖稳固地卡在垫子下方",
    "双手宽握横杆（比肩宽1.5倍），掌心朝前",
    "挺胸收腹，肩胛骨下沉，身体微微后倾约10-15°",
    "用背部发力将横杆下拉至锁骨位置，肘尖指向地面",
    "在最低点顶峰收缩1秒，感受背阔肌挤压",
    "控制重量缓慢还原，手臂不完全伸直，保持背部张力"
  ],
  mistakes: [
    "用手臂猛拉而非背部发力——想象手只是钩子",
    "身体过度后仰借力——全程躯干摆动不超过15°",
    "耸肩导致斜方肌代偿——时刻保持沉肩"
  ],
  svg: { type: "lat-pulldown", ... },  // SVG 参数
  video: { bv: "BV1xxXXXXXX", title: "高位下拉教学" }
}
```

- [ ] **Step 2: 为每个动作绘制 SVG 简笔画**

用 JS 函数生成 SVG 简笔画，每个动作一个函数，返回 SVG 字符串。包含：
- 人体轮廓（头、躯干、四肢）的简化线条
- 器械/杠铃/哑铃的简化表示
- 运动轨迹箭头

### Task 3: 实现核心业务逻辑

- [ ] **Step 1: 日期轮换算法**

```javascript
const CYCLE = ['back', 'chest', 'shoulder', 'rest']; // 0背 1胸 2肩 3休息

function getTodayWorkout() {
  const startDate = getStartDate(); // 从 LocalStorage 读取
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  return CYCLE[daysDiff % 4];
}
```

- [ ] **Step 2: 跳过今天逻辑**

```javascript
function skipToday() {
  const startDate = getStartDate();
  // 将起始日往前调一天，实现整体顺延
  startDate.setDate(startDate.getDate() - 1);
  saveStartDate(startDate);
  renderAll();
}
```

- [ ] **Step 3: LocalStorage 读写**

```javascript
const STORAGE_KEY = 'fitness-tracker-start-date';

function getStartDate() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return new Date(stored);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  saveStartDate(today);
  return today;
}

function saveStartDate(date) {
  localStorage.setItem(STORAGE_KEY, date.toISOString().split('T')[0]);
}
```

### Task 4: UI 渲染与交互

- [ ] **Step 1: 渲染今日概览**

根据 `getTodayWorkout()` 返回值渲染不同的头部 UI：
- `back` → "🔵 今天是背日" + 激励语"打造倒三角，从下拉开始"
- `chest` → "🟢 今天是胸日" + 激励语"推起重量，推起自信"
- `shoulder` → "🟠 今天是肩日" + 激励语"宽肩撑起气场"
- `rest` → "⚪ 今天是休息日" + 激励语"肌肉在休息时生长，好好恢复"

- [ ] **Step 2: 渲染今日训练列表**

过滤 `muscle === todayType` 的动作，以卡片形式展示。点击卡片展开详情面板。

- [ ] **Step 3: 渲染动作库**

三个标签按钮切换 `back | chest | shoulder`，点击后显示对应分类的全部动作。

- [ ] **Step 4: 渲染周期条**

显示前后各 2 天的小日历条，当前天高亮，休息日灰色。

- [ ] **Step 5: 跳过按钮与确认弹窗**

点击"跳过今天 →"按钮弹出确认对话框，确认后执行 `skipToday()` 并重新渲染。

### Task 5: 整合测试

- [ ] **Step 1: 在浏览器中打开文件，验证所有功能**

手动测试清单：
1. 首次打开 → 显示背日，起始日为今天
2. 点击动作卡片 → 展开详情，SVG 图可见，视频链接可点
3. 切换动作库标签 → 显示对应部位动作
4. 点击跳过今天 → 计划顺延到胸日
5. 刷新页面 → 状态保持
6. 修改起始日期 → 计划重新对齐
7. 移动端查看 → 布局正常

---

## 自检清单

- [x] 所有 15 个动作数据完整
- [x] SVG 简笔画每个动作都有
- [x] 轮换算法：背→胸→肩→休息
- [x] 跳过今天正确顺延
- [x] LocalStorage 持久化
- [x] 响应式布局
- [x] 无外部依赖
