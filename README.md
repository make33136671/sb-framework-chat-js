# sb-framework-chat-js

> saibo 平台前端实时通讯框架库（框架级共享，不绑定业务产品）。

## 包清单

| 包 | 说明 | 源自 |
|----|------|------|
| `@sb/realtime-core` | 基于 @microsoft/signalr 的实时通讯 SDK（连接/认证/消息/会话/上传/Token 续期） | sb-agent-hub/realtime-core-js（Phase C 重做） |
| `@sb/chat-ui` | 可插拔聊天 UI 组件库（Shadow DOM 隔离） | sb-agent-hub/realtime-chat-ui-js |

## 开发

```bash
corepack enable
pnpm install
pnpm build        # 构建所有包
pnpm type-check   # 类型检查
```

## 被引用方式

业务项目（如 `apps/agenthub/agenthub-chat`）通过本地路径引用：

```json
{
  "dependencies": {
    "@sb/realtime-core": "file:../../../../sb/sb-framework-chat-js/packages/realtime-core",
    "@sb/chat-ui": "file:../../../../sb/sb-framework-chat-js/packages/chat-ui"
  }
}
```

## 目录结构

```
sb-framework-chat-js/
├── packages/
│   ├── realtime-core/   # @sb/realtime-core
│   └── chat-ui/         # @sb/chat-ui
├── package.json
├── pnpm-workspace.yaml
└── README.md
```
