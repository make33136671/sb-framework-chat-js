import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'RealtimeChatUI',
      fileName: 'realtime-chat-ui',
    },
    rollupOptions: {
      external: ['@sb/realtime-core'],
      output: {
        globals: { '@sb/realtime-core': 'RealtimeCore' },
      },
    },
  },
})
