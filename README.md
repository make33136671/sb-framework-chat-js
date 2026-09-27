# sb-framework-chat-js

> saibo 平台前端实时通讯框架库（框架级共享，不绑定业务产品）。

## 包清单

发布于 npmjs.com 公共源（scope：`@saiboniuma`）：

| 包 | 说明 |
|----|------|
| `@saiboniuma/realtime-core` | 基于 @microsoft/signalr 的实时通讯 SDK（连接/认证/消息/会话/上传/Token 续期） |
| `@saiboniuma/chat-ui` | 可插拔聊天 UI 组件库（Shadow DOM 隔离） |

## 开发

```bash
corepack enable
pnpm install
pnpm build        # 构建所有包
pnpm type-check   # 类型检查
```

## 被引用方式

业务项目从 npm 公共源按版本引用：

```json
{
  "dependencies": {
    "@saiboniuma/realtime-core": "^0.1.0",
    "@saiboniuma/chat-ui": "^0.1.0"
  }
}
```

本地联调可在业务项目中用 `pnpm link --global` 或 override 到本 workspace 的包目录。

## 目录结构

```
sb-framework-chat-js/
├── packages/
│   ├── realtime-core/   # @saiboniuma/realtime-core
│   └── chat-ui/         # @saiboniuma/chat-ui
├── package.json
├── pnpm-workspace.yaml
└── README.md
```
