<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Zero_Dependencies-✓-brightgreen?style=for-the-badge" alt="Zero Dependencies">
  <img src="https://img.shields.io/badge/GitHub_Pages-✓-blue?style=for-the-badge&logo=github" alt="GitHub Pages">
  <img src="https://img.shields.io/badge/Data_MuscleWiki-ff6b35?style=for-the-badge" alt="MuscleWiki">
  <img src="https://img.shields.io/badge/101_Exercises-✓-brightgreen?style=for-the-badge" alt="101 Exercises">
</p>

<h1 align="center">🏋️ FitnessTracker</h1>

<p align="center">
  <strong>基于 MuscleWiki 数据的健身训练追踪器</strong><br>
  深色健身主题 · 可自定义训练周期 · 热力图统计 · 101 个动作 · 三级难度 · 智能分享卡片
</p>

<p align="center">
  <a href="https://nutshell319.github.io/fitness-tracker/"><strong>🔗 立即使用</strong></a>
  &nbsp;·&nbsp;
  <a href="#-训练计划">训练计划</a>
  &nbsp;·&nbsp;
  <a href="#-功能特性">功能特性</a>
  &nbsp;·&nbsp;
  <a href="#-动作库">动作库</a>
  &nbsp;·&nbsp;
  <a href="#-快速开始">快速开始</a>
</p>

---

## ✨ 为什么做这个

第一次去健身房，最大的障碍不是体力，而是**不知道做什么、怎么做**。

FitnessTracker 把训练计划压缩到最简：每天告诉你今天练什么，每个动作有 MuscleWiki GIF 动画 + B站中文视频 + 分步要领 + 常见错误提示。打开网页就能跟练，零门槛。

---

## 📅 训练计划

**默认为练四休一的 5 日循环**，支持**完全自定义**——增减天数、自定义名称/图标/颜色/训练部位，适配任何训练分化方案。

| 🔵 背日 | 🟠 胸日 | 🟡 肩日 | 🟢 腹日 | 🔵 有氧日 |
|:---|:---|:---|:---|:---|
| 高位下拉 | 杠铃平板卧推 | 杠铃站姿推举 | 卷腹 | 跑步机快走 |
| 坐姿划船 | 哑铃上斜卧推 | 哑铃侧平举 | 平板支撑 | 跳绳 |
| 哑铃单臂划船 | 蝴蝶机夹胸 | 哑铃反向飞鸟 | 俄罗斯转体 | 缓坡快走 |
| 杠铃俯身划船 | 器械坐姿推胸 | 哑铃前平举 | 自行车卷腹 | 固定单车 |
| 反向划船 | 俯卧撑 | 蝴蝶机反向飞鸟 | 反向卷腹 | 慢跑 |

每个部位另含大量备选动作和进阶动作，训练计划可按天自定义——自由增减、调整顺序。

### 🎯 自定义训练周期

不只是自定义动作，而是**自定义整个训练周期**：

- ✏️ 增加/删除训练日
- 🎨 自定义每天的名称、图标、颜色
- 🏋️ 每天可指定多个训练部位（如"胸+三头日"）
- 💬 每天可写一句话（显示在 Header）

---

## 🎯 功能特性

| 功能 | 说明 |
|------|------|
| 📅 **自动轮换** | 基于起始日推算，自定义周期自动轮换，打开就知道今天练什么 |
| 🔄 **自定义周期** | 自由设计训练周期（推拉腿、上下肢分化……任意方案） |
| 📝 **自定义计划** | 每天可自由增减动作、调整顺序，保存到本地 |
| 📊 **训练热力图** | GitHub 贡献图风格，全年训练可视化，可点击格子管理跳过 |
| 📸 **智能分享卡片** | 5 种分享类型：日签打卡卡 × 周报 × 月报 × 年报 × 热力图，Canvas 3×高清渲染，自适应布局 |
| 📤 **一键导出** | 所有分享卡片一键导出高清 PNG，直接保存或分享到社交平台 |
| ⏭ **跳过管理** | 支持当天跳过、撤销跳过、过往日期补跳过，热力图点击/设置面板均可操作 |
| ↩ **全局撤销** | 底部常驻撤销栏，任何操作均可一键还原 |
| 🎬 **双重演示** | MuscleWiki GIF 动画（正/侧两面 + 男女模特） + B站中文视频教学 |
| ⚠️ **避坑指南** | 每个动作列出 3 个最常见错误 + 纠正方法 |
| 📚 **丰富动作库** | 101 个动作 × 7 大肌群 × 3 级难度（新手/中级/高级） |
| 📱 **响应式** | 手机/平板/桌面全适配，健身房打开就能看 |
| 💾 **本地存储** | LocalStorage 记住所有设置，刷新不丢失 |

---

## 📸 分享卡片

一键生成高清训练分享图，Canvas 3×分辨率渲染，内容自适应布局，五种卡片覆盖全维度：

| 卡片类型 | 内容 | 特点 |
|----------|------|------|
| 🎫 **日签打卡** | 当日训练动作列表 + 完成进度 + 连续打卡天数 | 双列动作布局，内容驱动高度自适配 |
| 📊 **周报** | 本周每日状态柱状图 + 部位分布 + 运动/跳过统计 | 7 天状态逐日展示，自适应部位条形图 |
| 📅 **月报** | 当月热力图（居中日历格） + 运动天数 + 部位分布 | 按日历行数自适配热力图高度 |
| 📈 **年报** | 12 月热力图块 + 年度统计 + 部位分布 + 运动总结 | 大字体卡片 + 右对齐数据 + 12 块月热力 |
| 🔥 **热力图** | 全年训练热力图（GitHub 风格）+ 色彩图例 | 全年一览，深浅表示训练频率 |

---

## 📚 动作库

**101 个动作**，覆盖 7 大肌群，每个动作包含完整训练参数和分步教学。

| 肌群 | 数量 | 新手 | 中级 | 高级 |
|------|:--:|:--:|:--:|:--:|
| 🔵 背 | 11 | 6 | 3 | 2 |
| 🟠 胸 | 15 | 9 | 4 | 2 |
| 🟡 肩 | 14 | 10 | 3 | 1 |
| 🟢 腹 | 22 | 14 | 5 | 3 |
| 🟤 腿 | 20 | 7 | 8 | 5 |
| 🟣 手臂 | 5 | 4 | — | 1 |
| 🔵 有氧 | 9 | 6 | 1 | 2 |

**每个动作包含**：器械、建议重量、热身组、正式组数×次数、组间休息、动作节奏（向心/等长/离心）、6 步分解要领、3 个常见错误、MuscleWiki 动画演示、B站中文视频。

---

## 🎨 视觉风格

| 元素 | 值 |
|------|-----|
| 背景 | `#121418` 深黑 |
| 卡片 | `#1e2127` 暗灰 |
| 主色 | `#ff6b35` 活力橙 |
| 辅色 | `#4ecdc4` 清新青 |
| 背日 | `#4ecdc4` 青 |
| 胸日 | `#ff6b35` 橙 |
| 肩日 | `#f0c040` 金 |
| 腹日 | `#22c55e` 绿 |
| 有氧日 | `#60a5fa` 蓝 |
| 高级 | `#f8719e` 粉 |
| 跳过 | `#e85d75` 暗红 |
| 字体 | Microsoft YaHei / PingFang SC |

---

## 🚀 快速开始

### 在线使用

👉 **[nutshell319.github.io/fitness-tracker](https://nutshell319.github.io/fitness-tracker/)**

浏览器打开即用，无需安装。手机添加到主屏幕，去健身房直接打开。

### 本地运行

```bash
git clone https://github.com/nutshell319/fitness-tracker.git
cd fitness-tracker
# 双击 index.html 即可
```

---

## 📊 数据来源

**MuscleWiki** — 免费的交互式肌肉训练网站，提供 GIF 动画演示和肌肉发力热力图。

约 80 个动作含 MuscleWiki 演示页面（正/侧面 GIF + 肌肉热力图），其余高阶/有氧动作配 B站精准搜索链接。

---

## 🛠 技术栈

- **HTML5** — 语义化结构
- **CSS3** — CSS 变量 + Flexbox + Grid + 响应式
- **Vanilla JS (ES6)** — 零框架，LocalStorage 持久化
- **Canvas API** — 分享卡片渲染（3×高清）+ 热力图导出
- **GitHub Pages** — 静态托管，自动部署
- **MuscleWiki + Bilibili** — 动作演示数据源
