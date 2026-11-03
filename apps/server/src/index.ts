// ===== 服务入口 =====
import { createApp } from './app.js'
import { config } from './config.js'
import { seed } from './db/seed.js'
import { closeDatabase, initializeDatabase } from './db/index.js'

async function main() {
  await initializeDatabase()
  if (config.autoSeed) await seed()
  const app = createApp()
  const server = app.listen(config.port, () => {
    console.log(`[shop-os-server] 后端服务已启动: http://localhost:${config.port}`)
    console.log(`[shop-os-server] 健康检查: http://localhost:${config.port}/api/v1/health`)
  })

  const shutdown = () => server.close(() => {
    void closeDatabase().finally(() => process.exit(0))
  })
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

main().catch((e) => {
  console.error('[shop-os-server] 启动失败:', e)
  process.exit(1)
})
