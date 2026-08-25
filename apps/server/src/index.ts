// ===== 服务入口 =====
import { createApp } from './app.js'
import { config } from './config.js'
import { seed } from './db/seed.js'

async function main() {
  await seed()
  const app = createApp()
  app.listen(config.port, () => {
    console.log(`[shop-os-server] 后端服务已启动: http://localhost:${config.port}`)
    console.log(`[shop-os-server] 健康检查: http://localhost:${config.port}/api/v1/health`)
    console.log(`[shop-os-server] 演示账号: admin / ops / finance（密码 123456）`)
  })
}

main().catch((e) => {
  console.error('[shop-os-server] 启动失败:', e)
  process.exit(1)
})
