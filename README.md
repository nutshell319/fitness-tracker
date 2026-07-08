<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Zero_Dependencies-✓-brightgreen?style=for-the-badge" alt="Zero Dependencies">
  <img src="https://img.shields.io/badge/GitHub_Pages-✓-blue?style=for-the-badge&logo=github" alt="GitHub Pages">
  <img src="https://img.shields.io/badge/Data_MuscleWiki-ff6b35?style=for-the-badge" alt="MuscleWiki">
</p>

<h1 align="center">🏋️ 新手健身追踪器</h1>

<p align="center">
  <strong>基于 MuscleWiki 数据的新手健身训练网站</strong><br>
  深色健身主题 · 背胸肩三分化 · 4 日循环 · 18 个动作 · GIF 动画 + B站教学
</p>

<p align="center">
  <a href="https://nutshell319.github.io/fitness-tracker/"><strong>🔗 立即使用</strong></a>
  &nbsp;·&nbsp;
  <a href="#-训练计划">训练计划</a>
  &nbsp;·&nbsp;
  <a href="#-功能特性">功能特性</a>
  &nbsp;·&nbsp;
  <a href="#-快速开始">快速开始</a>
  &nbsp;·&nbsp;
  <a href="#-数据来源">数据来源</a>
</p>

---

## ✨ 为什么做这个

第一次去健身房，最大的障碍不是体力，而是**不知道做什么、怎么做**。

这个工具把训练计划压缩到最简：每天告诉你今天练什么，每个动作有 GIF 动画演示 + 中文视频教学 + 分步要领 + 常见错误提示。打开网页就能跟练，零门槛。

---

## 📅 训练计划

**练三休一 · 4 日循环**：背 → 胸 → 肩 → 休息

| 🔵 背日 | 🟠 胸日 | 🟡 肩日 | ⚪ 休息日 |
|:---|:---|:---|:---|
| 高位下拉 | 杠铃平板卧推 | 杠铃站姿推举 | 睡眠 + 营养 |
| 坐姿划船 | 哑铃上斜卧推 | 哑铃侧平举 | 泡沫轴放松 |
| 哑铃单臂划船 | 蝴蝶机夹胸 | 哑铃反向飞鸟 | 轻度有氧 |
| 杠铃俯身划船 | 器械坐姿推胸 | 哑铃前平举 | |
| 反向划船（自重） | 俯卧撑 | 蝴蝶机反向飞鸟 | |

每个部位另含 1 个备选动作，强度可进阶。

---

## 🎯 功能特性

### 核心功能

| 功能 | 说明 |
|------|------|
| 📅 **自动轮换** | 基于起始日推算，背→胸→肩→休息循环，打开就知道今天练什么 |
| ⏭ **跳过今天** | 加班、有事练不了？一键顺延，后续计划自动后移 |
| 📊 **详细参数** | 热身组、正式组、组间休息、动作节奏，每个动作标注完整 |
| 🎬 **双重演示** | MuscleWiki GIF 动画（正/侧两面 + 男女模特） + B站中文教学 |
| ⚠️ **避坑指南** | 每个动作列出 3 个最常见错误，新手少走弯路 |
| 📚 **动作库** | 18 个动作按背/胸/肩分类，含备选进阶动作 |
| 📱 **响应式** | 手机/平板/桌面全适配，健身房打开就能看 |
| 💾 **本地存储** | LocalStorage 记住起始日，刷新不丢失 |
| ⚙ **可配置** | 底部设置面板可修改起始日期，重新对齐计划 |

### 每个动作包含

<table>
  <tr>
    <td width="50%">
      <h4>🏋️ 训练参数表</h4>
      <ul>
        <li>所需器械 + 难度等级</li>
        <li>热身组重量/次数</li>
        <li>正式组数 × 次数</li>
        <li>组间休息时间</li>
        <li>动作节奏（向心/等长/离心）</li>
      </ul>
    </td>
    <td width="50%">
      <h4>📖 教学内容</h4>
      <ul>
        <li>6 步分解动作要领</li>
        <li>3 个常见错误 + 纠正方法</li>
        <li>🎬 MuscleWiki 动画演示</li>
        <li>▶️ B站中文视频教程</li>
      </ul>
    </td>
  </tr>
</table>

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
| 休息日 | `#5c5a57` 灰 |
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

全部 18 个动作数据来自 [**MuscleWiki**](https://musclewiki.com)——一个免费的交互式肌肉训练网站，提供 GIF 动画演示和肌肉发力热力图。

每个动作链接到 MuscleWiki 对应页面，可查看：
- 🎬 正面 + 侧面 GIF 动画（男/女模特）
- 🔥 肌肉群发力热力图
- 📝 英文分步说明
- ⚙ 器械/自重/弹力带分类

同时配 B站中文教学视频，中英文双通道学习。

---

## 📁 项目结构

```
fitness-tracker/
├── index.html          # 单文件应用（HTML + CSS + JS 全部内联）
├── README.md           # 项目说明
└── docs/               # 设计文档
    └── 2026-07-08-fitness-tracker-plan.md
```

---

## 🛠 技术栈

- **HTML5** — 语义化结构
- **CSS3** — CSS 变量 + Flexbox + 响应式媒体查询
- **Vanilla JS (ES6)** — 零框架，LocalStorage 持久化
- **GitHub Pages** — 静态托管，自动部署
- **MuscleWiki** — 动作演示数据源
