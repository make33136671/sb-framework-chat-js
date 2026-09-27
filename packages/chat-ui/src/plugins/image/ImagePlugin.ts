import type { ChatUIPlugin, PluginContext } from '../../types/index'
import { ImageRenderer } from './ImageRenderer'

/** 图片消息插件 */
export class ImagePlugin implements ChatUIPlugin {
  name = 'image'
  version = '0.1.0'

  install(context: PluginContext): void {
    context.registerRenderer(new ImageRenderer())

    context.registerInputTool({
      name: 'image-upload',
      icon: '\u{1F5BC}',
      tooltip: context.i18n.t('image.upload'),
      order: 10,
      onActivate(ctx) {
        // 创建隐藏的文件输入框
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.style.display = 'none'

        input.addEventListener('change', async () => {
          const file = input.files?.[0]
          if (!file) return
          if (!file.type.startsWith('image/')) return
          if (file.size > 10 * 1024 * 1024) return

          const recvID = ctx.getRecvID()
          if (!recvID || !ctx.core) return

          try {
            // 获取图片尺寸
            const dimensions = await getImageDimensions(file)
            // 上传文件
            const uploadResult = await ctx.core.upload.uploadFile(file)
            // 发送图片消息
            const msg = await ctx.core.message.sendImage(recvID, file, uploadResult.absfileName, {
              width: dimensions.width,
              height: dimensions.height,
              size: file.size,
              type: file.type,
            }, ctx.isGroup())
            // 追加到聊天列表
            ctx.appendMessage(msg)
          } catch (err) {
            console.error('[ImagePlugin] 发送图片失败:', err)
          }

          input.remove()
        })

        document.body.appendChild(input)
        input.click()
      },
    })
  }
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      reject(new Error('无法读取图片尺寸'))
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  })
}
