// ===== 服务端配置 =====
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const config = {
  port: Number(process.env.PORT || 3000),
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'shop-os-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // 数据库文件
  dbFile: process.env.DB_FILE || path.resolve(__dirname, '../data/shop-os.db'),
  // 上传目录
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../uploads'),
  // 服务域名前缀（拼文件访问地址）
  baseUrl: process.env.BASE_URL || `http://localhost:${Number(process.env.PORT || 3000)}`,
  // 密码哈希轮数
  bcryptRounds: 10,
}
