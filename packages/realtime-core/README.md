# @sb/realtime-core

> 实时通讯核心库 — 基于 SignalR 的聊天消息、认证、会话管理 SDK。

替代旧版 `openim-core-js`（基于 OpenIM SDK），从零重做，消除所有 monkey-patch。

## 安装

```bash
npm install @sb/realtime-core
# 或从本地依赖
npm install @sb/realtime-core@file:../realtime-core
```

## 快速使用

```typescript
import { RealtimeClient } from '@sb/realtime-core';

const client = new RealtimeClient({
  baseURL: 'https://api.example.com',
  wsAddr: 'https://api.example.com/hubs/chat',
  logLevel: 2,  // 0=trace 1=debug 2=info 3=warn 4=error
});

// 登录（建立 SignalR 连接）
await client.login(userId, token);

// 发送消息
const msg = await client.message.sendText(recvId, 'hello');

// 监听新消息
client.events.on('message:received', (msg) => {
  console.log('收到消息:', msg);
});
```

## 模块结构

| 模块 | 说明 |
|------|------|
| `RealtimeClient` | 核心客户端，管理 SignalR HubConnection |
| `AuthService` | 认证服务（登录、token 续期） |
| `MessageService` | 消息收发（文本、图片等） |
| `ConversationService` | 会话管理 |
| `SessionManager` | 会话状态管理 |
| `TokenRefresher` | Token 自动续期 |
| `UploadService` | 文件上传 |
| `EventManager` | 事件管理器 |

## 构建

```bash
npm install
npm run build      # 输出到 dist/
npm run type-check # 类型检查
```

## 依赖

- `@microsoft/signalr` ^8.0.7
- TypeScript ~5.6.3
- Vite ^6.2.0

## 发布

```bash
npm publish  # 发布到内网 GitLab npm registry
```

Registry: `https://gitlab.saibo.club/api/v4/projects/27/packages/npm/`
