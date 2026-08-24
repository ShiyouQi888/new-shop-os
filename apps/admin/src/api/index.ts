/**
 * Mock API - 模拟后端接口
 */
import {
  mockMembers, mockProducts, mockSkus, mockCategories, mockGiftPackages,
  mockOrders, mockCredits, mockResellOrders, mockCommissions, mockWithdraws,
  mockWallets, mockLevelConfigs, mockCommissionConfigs, mockSystemConfigs,
  mockDashboardStats, mockDashboardTrends, mockFileAssets, mockFileAssetGroups,
  Member, ProductSPU, ProductSKU, ProductCategory, Order, MonthlyCredit,
  ResellOrder, Commission, Withdraw, LevelBenefitConfig, CommissionRuleConfig,
  SystemConfig, DashboardStats, DashboardTrend,
  OrderType, OrderStatus, MemberLevel, CreditStatus, ResellStatus, CommissionStatus, WithdrawStatus,
  FileAsset, FileAssetType, FileAssetQuery, FileAssetGroup, GiftPackage,
} from '@shop-os/shared'

// 模拟网络延迟
function delay<T>(data: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

// 分页处理
function paginate<T>(list: T[], page: number, pageSize: number): { list: T[]; total: number } {
  const start = (page - 1) * pageSize
  return { list: list.slice(start, start + pageSize), total: list.length }
}

// ============ 认证（模拟） ============
const mockAdmins = [
  { id: 1, username: 'admin', password: '123456', name: '超级管理员', role: '超级管理员', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' },
  { id: 2, username: 'ops', password: '123456', name: '运营-王', role: '运营', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin2' },
  { id: 3, username: 'finance', password: '123456', name: '财务-李', role: '财务', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin3' },
]

export interface AdminUser {
  id: number
  username: string
  name: string
  role: string
  avatar: string
}

export const apiAuth = {
  login: (username: string, password: string): Promise<{ token: string; user: AdminUser } | null> => {
    const found = mockAdmins.find(a => a.username === username && a.password === password)
    if (!found) return delay(null, 400)
    const { password: _pwd, ...user } = found
    return delay({ token: `mock-token-${found.id}-${Date.now()}`, user }, 600)
  },
  logout: () => delay({ success: true }, 200),
}

// ============ 仪表盘 ============
export const apiDashboard = {
  getStats: () => delay({ ...mockDashboardStats }),
  getTrends: () => delay([...mockDashboardTrends]),
}

// ============ 会员 ============
export const apiMember = {
  getList: (params: { page: number; pageSize: number; keyword?: string; level?: MemberLevel | '' }) => {
    let list = [...mockMembers]
    if (params.keyword) {
      const kw = params.keyword.toLowerCase()
      list = list.filter(m => m.nickname.toLowerCase().includes(kw) || m.phone.includes(kw) || m.inviteCode.toLowerCase().includes(kw))
    }
    if (params.level !== '' && params.level !== undefined) {
      list = list.filter(m => m.level === params.level)
    }
    return delay(paginate(list, params.page, params.pageSize))
  },
  getById: (id: number) => delay(mockMembers.find(m => m.id === id) || null),
  toggleStatus: (id: number, status: number) => {
    const m = mockMembers.find(m => m.id === id)
    if (m) m.status = status
    return delay({ success: true })
  },
  /** 会员聚合统计：订单数/消费额/佣金/钱包 */
  getMemberStats: (memberId: number) => {
    const orders = mockOrders.filter(o => o.memberId === memberId)
    const commissions = mockCommissions.filter(c => c.memberId === memberId)
    const wallet = mockWallets.find(w => w.memberId === memberId) || null
    return delay({
      orderCount: orders.length,
      orderTotal: orders.reduce((s, o) => s + o.payAmount, 0),
      commissionCount: commissions.length,
      commissionTotal: commissions.reduce((s, c) => s + c.amount, 0),
      wallet,
    })
  },
  getMemberOrders: (memberId: number) => delay(mockOrders.filter(o => o.memberId === memberId)),
  getMemberCommissions: (memberId: number) => delay(mockCommissions.filter(c => c.memberId === memberId)),
}

// ============ 商品 ============
export const apiProduct = {
  getList: (params: { page: number; pageSize: number; keyword?: string; categoryId?: number | '' }) => {
    let list = [...mockProducts]
    if (params.keyword) {
      const kw = params.keyword.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(kw) || p.brand.toLowerCase().includes(kw))
    }
    if (params.categoryId) {
      list = list.filter(p => p.categoryId === params.categoryId)
    }
    return delay(paginate(list, params.page, params.pageSize))
  },
  getSkus: (spuId: number) => delay(mockSkus.filter(s => s.spuId === spuId)),
  getById: (id: number) => delay(mockProducts.find(p => p.id === id) || null),
  save: (product: Partial<ProductSPU>): Promise<ProductSPU> => {
    if (product.id) {
      const idx = mockProducts.findIndex(p => p.id === product.id)
      if (idx >= 0) Object.assign(mockProducts[idx], product)
      return delay(mockProducts[idx])
    } else {
      const created = { ...product, id: Date.now(), createTime: new Date().toISOString() } as ProductSPU
      mockProducts.push(created)
      return delay(created)
    }
  },
  toggleStatus: (id: number) => {
    const p = mockProducts.find(p => p.id === id)
    if (p) p.status = p.status === 1 ? 0 : 1
    return delay({ success: true })
  },
  batchToggleStatus: (ids: number[], status: number) => {
    ids.forEach(id => {
      const p = mockProducts.find(p => p.id === id)
      if (p) p.status = status
    })
    return delay({ success: true })
  },
  remove: (id: number) => {
    const idx = mockProducts.findIndex(p => p.id === id)
    if (idx >= 0) mockProducts.splice(idx, 1)
    const skuIdx = mockSkus.filter(s => s.spuId === id)
    skuIdx.forEach(s => {
      const i = mockSkus.indexOf(s)
      if (i >= 0) mockSkus.splice(i, 1)
    })
    return delay({ success: true })
  },
  saveSkus: (spuId: number, skus: ProductSKU[]) => {
    const existing = mockSkus.filter(s => s.spuId === spuId)
    existing.forEach(s => {
      const idx = mockSkus.indexOf(s)
      if (idx >= 0) mockSkus.splice(idx, 1)
    })
    skus.forEach((s, i) => {
      mockSkus.push({ ...s, id: s.id || Date.now() + i, spuId })
    })
    return delay({ success: true })
  },
}

// ============ 分类 ============
export const apiCategory = {
  getList: () => delay([...mockCategories]),
  create: (category: Partial<ProductCategory>) => {
    const newCat = { ...category, id: Date.now(), status: 1, sort: 0 } as ProductCategory
    mockCategories.push(newCat)
    return delay(newCat)
  },
  update: (id: number, patch: Partial<ProductCategory>) => {
    const c = mockCategories.find(c => c.id === id)
    if (c) Object.assign(c, patch)
    return delay({ success: true })
  },
  remove: (id: number) => {
    // 删除分类及其子分类；关联商品分类置空（置为0）
    const toRemove = mockCategories.filter(c => c.id === id || c.parentId === id).map(c => c.id)
    for (let i = mockCategories.length - 1; i >= 0; i--) {
      if (toRemove.includes(mockCategories[i].id)) mockCategories.splice(i, 1)
    }
    mockProducts.forEach(p => { if (toRemove.includes(p.categoryId)) p.categoryId = 0 })
    return delay({ success: true })
  },
}

// ============ 大礼包 ============
export const apiGiftPackage = {
  getList: () => delay([...mockGiftPackages]),
  save: (pkg: GiftPackage) => {
    const idx = mockGiftPackages.findIndex(p => p.id === pkg.id)
    if (idx >= 0) Object.assign(mockGiftPackages[idx], pkg)
    return delay({ success: true })
  },
}

// ============ 订单 ============
export const apiOrder = {
  getList: (params: { page: number; pageSize: number; orderType?: OrderType | ''; status?: OrderStatus | ''; keyword?: string }) => {
    let list = [...mockOrders]
    if (params.orderType !== '' && params.orderType !== undefined) {
      list = list.filter(o => o.orderType === params.orderType)
    }
    if (params.status !== '' && params.status !== undefined) {
      list = list.filter(o => o.status === params.status)
    }
    if (params.keyword) {
      const kw = params.keyword.toLowerCase()
      list = list.filter(o => o.orderNo.toLowerCase().includes(kw) || o.receiverName.includes(kw) || o.receiverPhone.includes(kw))
    }
    return delay(paginate(list, params.page, params.pageSize))
  },
  getById: (id: number) => delay(mockOrders.find(o => o.id === id) || null),
  ship: (id: number, logisticsCompany: string, logisticsNo: string) => {
    const o = mockOrders.find(o => o.id === id)
    if (o) {
      o.status = OrderStatus.Shipped
      o.logisticsCompany = logisticsCompany
      o.logisticsNo = logisticsNo
      o.shipTime = new Date().toISOString()
    }
    return delay({ success: true })
  },
  /** 批量发货：每项可独立指定物流，未指定时使用统一物流 */
  batchShip: (ids: number[], logisticsCompany: string, logisticsNo: string) => {
    ids.forEach(id => {
      const o = mockOrders.find(o => o.id === id)
      if (o && o.status === OrderStatus.PaidPendingShip) {
        o.status = OrderStatus.Shipped
        o.logisticsCompany = logisticsCompany
        o.logisticsNo = logisticsNo
        o.shipTime = new Date().toISOString()
      }
    })
    return delay({ success: true, shipped: ids.length })
  },
  /** 退款审核：pass 通过则置为已退款，否则驳回为已取消 */
  auditRefund: (id: number, pass: boolean, remark?: string) => {
    const o = mockOrders.find(o => o.id === id)
    if (o && o.status === OrderStatus.Refunding) {
      o.status = pass ? OrderStatus.Refunded : OrderStatus.Cancelled
      if (remark) o.remark = remark
    }
    return delay({ success: true })
  },
}

// ============ 领货 ============
export const apiCredit = {
  getList: (params: { page: number; pageSize: number; status?: CreditStatus | ''; month?: string; keyword?: string }) => {
    let list = [...mockCredits]
    if (params.status !== '' && params.status !== undefined) {
      list = list.filter(c => c.status === params.status)
    }
    if (params.month) {
      list = list.filter(c => c.month === params.month)
    }
    if (params.keyword) {
      const kw = params.keyword.toLowerCase()
      list = list.filter(c => c.memberId === Number(kw) || mockMembers.some(m => m.id === c.memberId && m.nickname.toLowerCase().includes(kw)))
    }
    return delay(paginate(list, params.page, params.pageSize))
  },
  /** 调整领货额度：delta 为正则增加、负则扣减 */
  adjust: (id: number, delta: number, reason: string) => {
    const c = mockCredits.find(c => c.id === id)
    if (c) {
      c.creditAmount += delta
      c.remainAmount = c.remainAmount + delta
      if (c.remainAmount < 0) c.remainAmount = 0
      if (c.creditAmount < 0) c.creditAmount = 0
      c.status = c.remainAmount <= 0 ? CreditStatus.UsedUp : CreditStatus.PartialUsed
      if (c.remainAmount === c.creditAmount && c.usedAmount === 0 && delta > 0) c.status = CreditStatus.Unused
    }
    return delay({ success: true, reason })
  },
}

// ============ 转卖 ============
export const apiResell = {
  getList: (params: { page: number; pageSize: number; status?: ResellStatus | ''; keyword?: string }) => {
    let list = [...mockResellOrders]
    if (params.status !== '' && params.status !== undefined) {
      list = list.filter(r => r.status === params.status)
    }
    if (params.keyword) {
      const kw = params.keyword.toLowerCase()
      list = list.filter(r => r.resellNo.toLowerCase().includes(kw) || r.skuName.toLowerCase().includes(kw))
    }
    return delay(paginate(list, params.page, params.pageSize))
  },
  /** 手动匹配：将待匹配转卖单匹配到指定零售订单（模拟） */
  manualMatch: (id: number, matchOrderId: number) => {
    const r = mockResellOrders.find(r => r.id === id)
    if (r) {
      r.status = ResellStatus.Matched
      r.matchOrderId = matchOrderId
      r.matchTime = new Date().toISOString()
    }
    return delay({ success: true })
  },
  cancel: (id: number) => {
    const r = mockResellOrders.find(r => r.id === id)
    if (r) {
      r.status = ResellStatus.Cancelled
      r.cancelTime = new Date().toISOString()
    }
    return delay({ success: true })
  },
}

// ============ 佣金 ============
export const apiCommission = {
  getList: (params: { page: number; pageSize: number; distributionLevel?: number | ''; status?: CommissionStatus | '' }) => {
    let list = [...mockCommissions]
    if (params.distributionLevel) {
      list = list.filter(c => c.distributionLevel === params.distributionLevel)
    }
    if (params.status !== '' && params.status !== undefined) {
      list = list.filter(c => c.status === params.status)
    }
    return delay(paginate(list, params.page, params.pageSize))
  },
  getById: (id: number) => delay(mockCommissions.find(c => c.id === id) || null),
}

// ============ 提现 ============
export const apiWithdraw = {
  getList: (params: { page: number; pageSize: number; status?: WithdrawStatus | ''; keyword?: string }) => {
    let list = [...mockWithdraws]
    if (params.status !== '' && params.status !== undefined) {
      list = list.filter(w => w.status === params.status)
    }
    if (params.keyword) {
      const kw = params.keyword.toLowerCase()
      list = list.filter(w => w.withdrawNo.toLowerCase().includes(kw) || String(w.memberId) === kw)
    }
    return delay(paginate(list, params.page, params.pageSize))
  },
  /** 审核提现：pass 通过→待打款；驳回→已驳回（记备注） */
  audit: (id: number, pass: boolean, remark?: string) => {
    const w = mockWithdraws.find(w => w.id === id)
    if (w) {
      w.status = pass ? WithdrawStatus.AuditPassed : WithdrawStatus.Rejected
      w.auditTime = new Date().toISOString()
      w.auditOperator = '当前管理员'
      if (remark) w.auditRemark = remark
    }
    return delay({ success: true })
  },
  /** 打款：审核通过后执行打款 */
  pay: (id: number, transactionNo?: string) => {
    const w = mockWithdraws.find(w => w.id === id)
    if (w) {
      w.status = WithdrawStatus.Paid
      w.payTime = new Date().toISOString()
      w.payTransactionNo = transactionNo || `T${Date.now()}`
    }
    return delay({ success: true })
  },
}

// ============ 配置 ============
export const apiConfig = {
  getLevelConfigs: () => delay([...mockLevelConfigs]),
  saveLevelConfig: (config: LevelBenefitConfig) => {
    const idx = mockLevelConfigs.findIndex(c => c.id === config.id)
    if (idx >= 0) Object.assign(mockLevelConfigs[idx], config)
    return delay({ success: true })
  },
  createLevelConfig: (config: Omit<LevelBenefitConfig, 'id'>) => {
    const id = Math.max(0, ...mockLevelConfigs.map(c => c.id)) + 1
    const item: LevelBenefitConfig = { ...config, id }
    mockLevelConfigs.push(item)
    return delay(item)
  },
  removeLevelConfig: (id: number) => {
    const idx = mockLevelConfigs.findIndex(c => c.id === id)
    if (idx >= 0) mockLevelConfigs.splice(idx, 1)
    return delay({ success: true })
  },
  getCommissionConfigs: () => delay([...mockCommissionConfigs]),
  saveCommissionConfig: (config: CommissionRuleConfig) => {
    const idx = mockCommissionConfigs.findIndex(c => c.id === config.id)
    if (idx >= 0) Object.assign(mockCommissionConfigs[idx], config)
    return delay({ success: true })
  },
  getSystemConfigs: (group?: string) => {
    let list = [...mockSystemConfigs]
    if (group) list = list.filter(c => c.configGroup === group)
    return delay(list)
  },
  saveSystemConfig: (config: SystemConfig) => {
    const idx = mockSystemConfigs.findIndex(c => c.id === config.id)
    if (idx >= 0) Object.assign(mockSystemConfigs[idx], config)
    return delay({ success: true })
  },
}

// ============ 钱包 ============
export const apiWallet = {
  getByMemberId: (memberId: number) => delay(mockWallets.find(w => w.memberId === memberId) || null),
}

// ============ 管理员（后台账号） ============
export interface AdminAccount {
  id: number
  name: string
  username: string
  role: string
  avatar: string
  status: boolean
  lastLogin: string
}

const mockAdminAccounts: AdminAccount[] = [
  { id: 1, name: '超级管理员', username: 'admin', role: '超级管理员', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin1', status: true, lastLogin: '2026-08-24 14:00:00' },
  { id: 2, name: '运营-王', username: 'ops_wang', role: '运营', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin2', status: true, lastLogin: '2026-08-23 16:30:00' },
  { id: 3, name: '财务-李', username: 'fin_li', role: '财务', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin3', status: true, lastLogin: '2026-08-22 09:15:00' },
  { id: 4, name: '客服-赵', username: 'cs_zhao', role: '客服', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin4', status: false, lastLogin: '2026-08-20 11:00:00' },
]

export const apiAdmin = {
  getList: () => delay([...mockAdminAccounts]),
  create: (account: Partial<AdminAccount>) => {
    const a: AdminAccount = {
      id: Date.now(),
      name: account.name || '',
      username: account.username || '',
      role: account.role || '运营',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=admin${Date.now()}`,
      status: true,
      lastLogin: '-',
    }
    mockAdminAccounts.push(a)
    return delay(a)
  },
  update: (id: number, patch: Partial<AdminAccount>) => {
    const a = mockAdminAccounts.find(a => a.id === id)
    if (a) Object.assign(a, patch)
    return delay({ success: true })
  },
  remove: (id: number) => {
    const idx = mockAdminAccounts.findIndex(a => a.id === id)
    if (idx >= 0) mockAdminAccounts.splice(idx, 1)
    return delay({ success: true })
  },
  toggleStatus: (id: number) => {
    const a = mockAdminAccounts.find(a => a.id === id)
    if (a) a.status = !a.status
    return delay({ success: true })
  },
}

// ============ 财务总览 ============
export const apiFinance = {
  /** 聚合平台收入/支出统计（由订单、佣金、提现、转卖推导） */
  getOverview: () => {
    const orderRevenue = mockOrders.filter(o => o.status !== OrderStatus.Cancelled && o.status !== OrderStatus.PendingPayment)
      .reduce((s, o) => s + o.payAmount, 0)
    const commissionPaid = mockCommissions.filter(c => c.status === CommissionStatus.Withdrawn)
      .reduce((s, c) => s + c.amount, 0)
    const commissionPending = mockCommissions
      .filter(c => c.status === CommissionStatus.Available || c.status === CommissionStatus.PendingSettle)
      .reduce((s, c) => s + c.amount, 0)
    const withdrawPaid = mockWithdraws.filter(w => w.status === WithdrawStatus.Paid)
      .reduce((s, w) => s + w.actualAmount, 0)
    const resellServiceFee = mockResellOrders.reduce((s, r) => s + r.serviceFee, 0)
    const grossProfit = orderRevenue - mockProducts.reduce((s, p) => s + 0, 0)
      + resellServiceFee - withdrawPaid
    return delay({
      totalRevenue: orderRevenue,
      commissionPaid,
      commissionPending,
      withdrawPaid,
      resellServiceFee,
      grossProfit: Math.round((orderRevenue + resellServiceFee - withdrawPaid) * 100) / 100,
    })
  },
  /** 资金流水（按时间倒序） */
  getFlows: () => {
    const flows: Array<{ time: string; type: string; desc: string; amount: number; balance: number }> = []
    mockOrders.forEach(o => {
      if (o.payTime) {
        flows.push({ time: o.payTime, type: '订单收入', desc: `订单 ${o.orderNo} 实付`, amount: o.payAmount, balance: 0 })
      }
    })
    mockWithdraws.forEach(w => {
      if (w.payTime) {
        flows.push({ time: w.payTime, type: '提现打款', desc: `提现单 ${w.withdrawNo}`, amount: -w.actualAmount, balance: 0 })
      }
    })
    mockResellOrders.forEach(r => {
      if (r.settleTime) {
        flows.push({ time: r.settleTime, type: '转卖结算', desc: `转卖单 ${r.resellNo} 结算`, amount: -r.settleAmount, balance: 0 })
        flows.push({ time: r.settleTime, type: '服务费收入', desc: `转卖单 ${r.resellNo} 服务费`, amount: r.serviceFee, balance: 0 })
      }
    })
    flows.sort((a, b) => b.time.localeCompare(a.time))
    let running = 0
    // 从最早一笔开始推算余额
    const asc = [...flows].sort((a, b) => a.time.localeCompare(b.time))
    const total = asc.reduce((s, f) => s + f.amount, 0)
    const balances = new Map<string, number>()
    let acc = 0
    asc.forEach(f => {
      acc += f.amount
      balances.set(`${f.time}-${f.desc}`, acc)
    })
    return delay(flows.map(f => ({ ...f, balance: Math.round(balances.get(`${f.time}-${f.desc}`) || 0 * 100) / 100 })))
  },
}

// ============ 文件资产 ============
/** 根据文件名 + 分组规则自动匹配分组 */
const autoMatchGroup = (fileName: string, mimeType: string, explicitGroupId?: number | null): number | null => {
  if (explicitGroupId !== undefined && explicitGroupId !== null) return explicitGroupId
  const lower = fileName.toLowerCase()
  const isVideo = mimeType.startsWith('video/') || lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm')
  // 精确规则优先：按顺序匹配第一个命中
  for (const g of mockFileAssetGroups) {
    if (!g.matchRules) continue
    const rules = g.matchRules.split(',').map(r => r.trim().toLowerCase()).filter(Boolean)
    for (const rule of rules) {
      if (rule === 'video' && isVideo) return g.id
      if (rule === 'image' && !isVideo && mimeType.startsWith('image/')) return g.id
      if (rule && lower.includes(rule)) return g.id
    }
  }
  return null
}

export const apiFileGroup = {
  getList: () => delay([...mockFileAssetGroups]),
  create: (name: string, matchRules: string, icon?: string) => {
    const group: FileAssetGroup = {
      id: Date.now(),
      name,
      matchRules,
      icon: icon || 'folder',
      createTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    mockFileAssetGroups.push(group)
    return delay(group)
  },
  update: (id: number, patch: Partial<FileAssetGroup>) => {
    const g = mockFileAssetGroups.find(g => g.id === id)
    if (g) Object.assign(g, patch)
    return delay({ success: true })
  },
  remove: (id: number) => {
    const idx = mockFileAssetGroups.findIndex(g => g.id === id)
    if (idx >= 0) mockFileAssetGroups.splice(idx, 1)
    // 组内资产自动变为未分组
    mockFileAssets.forEach(f => { if (f.groupId === id) f.groupId = null })
    return delay({ success: true })
  },
  getAssetCount: (groupId: number | null) => {
    const count = mockFileAssets.filter(f => f.groupId === groupId).length
    return delay(count)
  },
}

export const apiFile = {
  getList: (params: FileAssetQuery) => {
    let list = [...mockFileAssets]
    if (params.type) {
      list = list.filter(f => f.type === params.type)
    }
    if (params.keyword) {
      const kw = params.keyword.toLowerCase()
      list = list.filter(f => f.name.toLowerCase().includes(kw))
    }
    if (params.groupId !== undefined) {
      list = list.filter(f => f.groupId === params.groupId)
    }
    return delay(paginate(list, params.page, params.pageSize))
  },
  upload: (file: File, groupId?: number | null) => {
    // 模拟上传：生成新的文件资产
    const isVideo = file.type.startsWith('video/')
    const id = Date.now()
    const seed = `upload${id}`
    const base = 'https://picsum.photos/seed'
    const asset: FileAsset = {
      id,
      name: file.name,
      url: isVideo
        ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'
        : `${base}/${seed}/800/800`,
      thumbUrl: isVideo
        ? `${base}/${seed}/400/300`
        : `${base}/${seed}/200/200`,
      type: isVideo ? FileAssetType.Video : FileAssetType.Image,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      usedCount: 0,
      createTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      groupId: autoMatchGroup(file.name, file.type, groupId),
    }
    mockFileAssets.unshift(asset)
    return delay(asset, 600)
  },
  moveToGroup: (ids: number[], groupId: number | null) => {
    ids.forEach(id => {
      const f = mockFileAssets.find(f => f.id === id)
      if (f) f.groupId = groupId
    })
    return delay({ success: true, moved: ids.length })
  },
  delete: (id: number) => {
    const idx = mockFileAssets.findIndex(f => f.id === id)
    if (idx >= 0) mockFileAssets.splice(idx, 1)
    return delay({ success: true })
  },
  rename: (id: number, name: string) => {
    const f = mockFileAssets.find(f => f.id === id)
    if (f) f.name = name
    return delay({ success: true })
  },
}
