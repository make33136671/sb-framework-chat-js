# @sb/chat-ui

> 可插拔聊天 UI 组件库 — Shadow DOM 隔离，插件化消息渲染。

原 `openim-chat-ui-js`，已重命名。基于 `realtime-core-js` 提供 UI 组件。

## 安装

```bash
npm install @sb/chat-ui
# 或从本地依赖
npm install @sb/chat-ui@file:../realtime-chat-ui
```

## 快速使用

```typescript
import { ChatUI } from '@sb/chat-ui';

const chatUI = new ChatUI({
  container: document.getElementById('chat-container'),
  // Shadow DOM 隔离，避免宿主页面样式污染
});
chatUI.mount();
```

## 特性

- **Shadow DOM 隔离**：宿主页面样式不影响聊天 UI
- **插件化消息渲染**：文本、图片、表情等可扩展
- **轻量**：原生 DOM 实现，无框架依赖

## 构建

```bash
npm install
npm run build      # 输出到 dist/
npm run type-check # 类型检查
```

## 依赖

- `@sb/realtime-core` (peer)
- TypeScript ~5.6.3
- Vite ^6.2.0

## 发布

```bash
npm publish  # 发布到内网 GitLab npm registry
```

Registry: `https://gitlab.saibo.club/api/v4/projects/28/packages/npm/`
