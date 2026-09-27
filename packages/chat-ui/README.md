# @saiboniuma/chat-ui

> 可插拔聊天 UI 组件库 — Shadow DOM 隔离，插件化消息渲染。

基于 `@saiboniuma/realtime-core` 提供 UI 组件。

## 安装

```bash
npm install @saiboniuma/chat-ui @saiboniuma/realtime-core
```

## 快速使用

```typescript
import { ChatUI } from '@saiboniuma/chat-ui';

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

- `@saiboniuma/realtime-core`
- TypeScript ~5.6.3
- Vite ^6.2.0

## 发布

```bash
pnpm build
pnpm publish --access public   # 发布到 npmjs.com
```

Registry: `https://registry.npmjs.org/`
