// ===== 服务端配置 =====
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// Server scripts run with apps/server as their working directory; load the
// repository-level .env first so pnpm development commands use the same values.
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })
dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 生产环境禁止使用兜底密钥：一旦忘记配置真实密钥，任何人读过源码都能离线签发超管 token
const INSECURE_DEFAULT_SECRETS = new Set(['shop-os-dev-secret-change-me', 'shop-os-change-me-in-production', 'change-me-to-a-long-random-secret'])
const jwtSecretFromEnv = process.env.JWT_SECRET
if (process.env.NODE_ENV === 'production' && (!jwtSecretFromEnv || INSECURE_DEFAULT_SECRETS.has(jwtSecretFromEnv))) {
  throw new Error('生产环境必须设置一个真实的 JWT_SECRET（不可为空或使用示例默认值），请在 .env 中配置后重启')
}

const databaseUrl = process.env.DATABASE_URL
const pgPassword = process.env.PGPASSWORD || ''
if (process.env.NODE_ENV === 'production' && !databaseUrl && !pgPassword) {
  throw new Error('生产环境必须设置 DATABASE_URL 或 PGPASSWORD')
}

export const config = {
  port: Number(process.env.PORT || 3000),
  // JWT
  jwtSecret: jwtSecretFromEnv || 'shop-os-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // PostgreSQL (DATABASE_URL takes precedence over PG* variables)
  databaseUrl,
  pgHost: process.env.PGHOST || '127.0.0.1',
  pgPort: Number(process.env.PGPORT || 5432),
  pgDatabase: process.env.PGDATABASE || 'shop_os',
  pgUser: process.env.PGUSER || 'shop_os',
  pgPassword,
  pgPoolMax: Number(process.env.PGPOOL_MAX || 10),
  pgSslMode: process.env.PGSSLMODE,
  autoSeed: process.env.AUTO_SEED !== '0',
  // 上传目录
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../uploads'),
  // 服务域名前缀（拼文件访问地址）
  baseUrl: process.env.BASE_URL || `http://localhost:${Number(process.env.PORT || 3000)}`,
  // 密码哈希轮数
  bcryptRounds: 10,
}
