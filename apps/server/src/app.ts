// ===== Express 应用装配 =====
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { config } from './config.js'
import { errorHandler, notFoundHandler } from './middlewares/error.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import memberRoutes from './routes/member.js'
import categoryRoutes from './routes/category.js'
import productRoutes from './routes/product.js'
import giftRoutes from './routes/gift.js'
import orderRoutes from './routes/order.js'
import configRoutes from './routes/config.js'
import dashboardRoutes from './routes/dashboard.js'
import creditRoutes from './routes/credit.js'
import resellRoutes from './routes/resell.js'
import commissionRoutes from './routes/commission.js'
import withdrawRoutes from './routes/withdraw.js'
import financeRoutes from './routes/finance.js'
import { fileRouter, fileGroupRouter } from './routes/file.js'
import shopRoutes from './routes/shop.js'
import shopMemberRoutes from './routes/shop-member.js'
import helpRoutes from './routes/help.js'
import logRoutes, { logLogin } from './routes/log.js'
import roleRoutes from './routes/roles.js'
import posterRoutes from './routes/posters.js'
import bannerRoutes from './routes/banners.js'
import workOrderRoutes from './routes/work-order.js'
import siteRoutes from './routes/site.js'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))

  // 静态资源：上传文件
  app.use('/uploads', express.static(config.uploadDir, { maxAge: '7d' }))

  // ===== API v1 路由 =====
  const api = express.Router()
  api.get('/health', (_req, res) => res.json({ code: 0, message: 'ok', data: { name: 'shop-os-server', uptime: process.uptime() } }))
  api.use('/auth', authRoutes)
  api.use('/admins', adminRoutes)
  api.use('/members', memberRoutes)
  api.use('/categories', categoryRoutes)
  api.use('/products', productRoutes)
  api.use('/gift-packages', giftRoutes)
  api.use('/orders', orderRoutes)
  api.use('/config', configRoutes)
  api.use('/dashboard', dashboardRoutes)
  api.use('/credits', creditRoutes)
  api.use('/resells', resellRoutes)
  api.use('/commissions', commissionRoutes)
  api.use('/withdraws', withdrawRoutes)
  api.use('/finance', financeRoutes)
  api.use('/files', fileRouter)
  api.use('/file-groups', fileGroupRouter)
  api.use('/shop', shopRoutes)
  api.use('/shop/member', shopMemberRoutes)
  api.use('/help', helpRoutes)
  api.use('/logs', logRoutes)
  api.use('/roles', roleRoutes)
  api.use('/posters', posterRoutes)
  api.use('/banners', bannerRoutes)
  api.use('/work-orders', workOrderRoutes)
  api.use('/site', siteRoutes)

  app.use('/api/v1', api)

  // 404 与错误处理
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
