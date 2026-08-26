/**
 * 前端 API 层：对接后端服务（@shop-os/server, localhost:3000）
 * 统一走 http 封装（JWT + {code,message,data} + 401 跳登录）
 * 后端已返回 camelCase 字段，与 @shop-os/shared 类型一致
 */
import { BASE_URL, http } from './http'
import {
  FileAssetType,
  type Member, type ProductSPU, type ProductSKU, type ProductCategory,
  type Order, type MonthlyCredit, type ResellOrder, type Commission,
  type Withdraw, type LevelBenefitConfig, type CommissionRuleConfig,
  type SystemConfig, type SiteBranding, type DashboardStats, type FileAsset,
  type FileAssetQuery, type FileAssetGroup, type GiftPackage, type MemberWallet,
  type OrderType, type OrderStatus, type CreditStatus, type ResellStatus,
  type CommissionStatus, type WithdrawStatus, type MemberLevel,
} from '@shop-os/shared'

export interface AdminUser {
  id: number
  username: string
  name: string
  role: string
  avatar: string
}

export interface AdminAccount {
  id: number
  name: string
  username: string
  role: string
  /** 角色显示名（来自后端角色表） */
  roleName?: string
  avatar: string
  status: boolean
  lastLogin: string
  /** 新增/改密时使用 */
  password?: string
}

/** 角色英文 → 中文展示（兜底，优先用后端 roleName） */
const roleLabel = (role: string): string => {
  const map: Record<string, string> = { super_admin: '超级管理员', ops: '运营', finance: '财务', customer_service: '客服' }
  return map[role] || role
}

/** 提现详情/列表补充字段（兼容原 mock 页面字段） */
type Row = Record<string, unknown>
const API_ORIGIN = BASE_URL.replace(/\/api\/v1\/?$/, '')
const resolveAssetUrl = (url: unknown) => {
  const value = String(url || '')
  if (!value || /^(https?:|data:|blob:)/.test(value)) return value
  return `${API_ORIGIN}${value.startsWith('/') ? value : '/' + value}`
}

// ============ 认证 ============
export const apiAuth = {
  login: async (username: string, password: string): Promise<{ token: string; user: AdminUser; permissions: string[] | null } | null> => {
    try {
      const data = await http.post<{ token: string; user: AdminUser; permissions: string[] | null }>(
        '/auth/login', { username, password }, { silent: true },
      )
      return {
        token: data.token,
        user: { ...data.user, role: roleLabel(data.user.role) },
        permissions: data.permissions ?? null,
      }
    } catch {
      return null
    }
  },
  logout: () => http.post('/auth/logout'),
  me: () => http.get<AdminUser & { roleName?: string; permissions: string[] | null }>('/auth/me'),
}

// ============ 仪表盘 ============
export const apiDashboard = {
  getStats: async (): Promise<DashboardStats> => {
    const s = await http.get<Row>('/dashboard/summary')
    return {
      totalMembers: Number(s.memberCount ?? 0),
      totalAgents: Number(s.totalAgents ?? 0),
      todayOrders: Number(s.todayOrders ?? 0),
      todayRevenue: Number(s.todayOrderAmount ?? 0),
      totalCommission: Number(s.commissionTotal ?? 0),
      pendingWithdraw: Number(s.pendingWithdraw ?? 0),
      activeResellOrders: Number(s.activeResellOrders ?? 0),
      monthlyCreditUsage: Number(s.monthlyCreditUsage ?? 0),
      levelDist: (s.levelDist as { level: number; count: number }[] | undefined) ?? [],
    } as unknown as DashboardStats
  },
  getTrends: (days = 7) =>
    http.get<Array<{ date: string; revenue: number; orders: number }>>('/dashboard/trends', { days }),
}

// ============ 日志与审计 ============
export interface OperationLog {
  id: number
  operator: string
  module: string
  action: string
  description: string
  ip: string
  createTime: string
}

export interface LoginLog {
  id: number
  username: string
  ip: string
  device: string
  success: number
  createTime: string
}

export const apiLog = {
  getOperations: (params: { page: number; pageSize: number; keyword?: string }) =>
    http.get<{ list: OperationLog[]; total: number }>('/logs/operations', params as unknown as Record<string, unknown>),
  getLogins: (params: { page: number; pageSize: number; keyword?: string; success?: number | '' }) =>
    http.get<{ list: LoginLog[]; total: number }>('/logs/logins', params as unknown as Record<string, unknown>),
}

// ============ 会员 ============
export const apiMember = {
  getList: (params: { page: number; pageSize: number; keyword?: string; level?: MemberLevel | '' }) =>
    http.get<{ list: Member[]; total: number }>('/members', params as unknown as Record<string, unknown>),
  /** 自定义创建会员（后台录入，可选登录密码，留空默认 123456） */
  create: (payload: { nickname: string; phone: string; level: number; realName?: string; password?: string }) =>
    http.post<Member>('/members', payload),
  getById: (id: number) => http.get<Member & { stats: Row; recentOrders: Order[]; recentCommissions: Commission[] }>(`/members/${id}`),
  toggleStatus: (id: number, status: number) =>
    http.patch(`/members/${id}/status`, { status }),
  /** 会员聚合统计：订单数/消费额/佣金/钱包 */
  getMemberStats: async (memberId: number) => {
    const detail = await http.get<Row & { stats: Row; balance: number; frozen: number; totalIncome: number; totalWithdraw: number }>(`/members/${memberId}`)
    return {
      orderCount: Number(detail.stats?.orderCount ?? 0),
      orderTotal: Number(detail.stats?.totalSpend ?? 0),
      commissionCount: Number(detail.stats?.commissionCount ?? 0),
      commissionTotal: Number(detail.stats?.totalCommission ?? 0),
      wallet: { balance: detail.balance, frozen: detail.frozen, totalIncome: detail.totalIncome, totalWithdraw: detail.totalWithdraw },
    }
  },
  getMemberOrders: (memberId: number) =>
    http.get<{ list: Order[]; total: number }>(`/members/${memberId}/orders`, { page: 1, pageSize: 100 }).then(r => r.list),
  getMemberCommissions: (memberId: number) =>
    http.get<{ list: Commission[]; total: number }>(`/members/${memberId}/commissions`, { page: 1, pageSize: 100 }).then(r => r.list),
}

// ============ 商品 ============
const boolFromFlag = (value: unknown) => value === true || value === 1 || value === '1'
const normalizeProduct = (row: Row): ProductSPU & { skuCount?: number; totalStock?: number } => ({
  ...(row as unknown as ProductSPU),
  id: Number(row.id),
  name: String(row.name || ''),
  categoryId: row.categoryId !== undefined ? Number(row.categoryId) : Number(row.category_id ?? 0),
  mainImage: String(row.mainImage ?? row.main_image ?? ''),
  images: Array.isArray(row.images) ? row.images as string[] : [],
  description: String(row.description || ''),
  isGiftPackage: boolFromFlag(row.isGiftPackage ?? row.is_gift_package),
  isMonthlyProduct: boolFromFlag(row.isMonthlyProduct ?? row.is_monthly_product),
  excludeDiscount: boolFromFlag(row.excludeDiscount ?? row.exclude_discount),
  status: Number(row.status ?? 1),
  sort: Number(row.sort ?? 0),
  createTime: String(row.createTime ?? row.create_time ?? ''),
  skuCount: Number(row.skuCount ?? 0),
  totalStock: Number(row.totalStock ?? 0),
})

const toProductPayload = (product: Partial<ProductSPU>) => {
  const row = product as Row
  return {
    name: product.name,
    categoryId: product.categoryId ?? (row.category_id !== undefined ? Number(row.category_id) : null),
    mainImage: product.mainImage || String(row.main_image || ''),
    images: product.images || (Array.isArray(row.images) ? row.images as string[] : []),
    description: product.description || '',
    isGiftPackage: boolFromFlag(product.isGiftPackage ?? row.is_gift_package),
    isMonthlyProduct: boolFromFlag(product.isMonthlyProduct ?? row.is_monthly_product),
    excludeDiscount: boolFromFlag(product.excludeDiscount ?? row.exclude_discount),
    status: product.status,
    sort: product.sort ?? Number(row.sort ?? 0),
  }
}

export const apiProduct = {
  getList: async (params: { page: number; pageSize: number; keyword?: string; categoryId?: number | '' }) => {
    const res = await http.get<{ list: Row[]; total: number }>('/products', params as unknown as Record<string, unknown>)
    return { ...res, list: res.list.map(normalizeProduct) }
  },
  getSkus: async (spuId: number) => {
    const skus = await http.get<Array<ProductSKU & { originalPrice?: number; image?: string; specInfo?: Record<string, string> | string }>>(`/products/${spuId}/skus`)
    return skus.map(sku => ({
      ...sku,
      specInfo: typeof sku.specInfo === 'string' ? JSON.parse(sku.specInfo || '{}') : (sku.specInfo || {}),
      costPrice: Number(sku.costPrice ?? sku.originalPrice ?? sku.price ?? 0),
      stockLocked: Number(sku.stockLocked ?? 0),
    }))
  },
  getById: (id: number) => http.get<ProductSPU & { skus: ProductSKU[] }>(`/products/${id}`),
  save: async (product: Partial<ProductSPU>): Promise<ProductSPU> => {
    const payload = toProductPayload(product)
    if (product.id) {
      const data = await http.put<Row>(`/products/${product.id}`, payload)
      return { ...product, id: product.id } as ProductSPU
    }
    const data = await http.post<{ id: number }>('/products', payload)
    return { ...product, id: data.id, createTime: new Date().toISOString() } as ProductSPU
  },
  toggleStatus: async (id: number) => {
    const cur = await http.get<{ status: number }>(`/products/${id}`)
    await http.patch(`/products/${id}/status`, { status: cur.status === 1 ? 0 : 1 })
    return { success: true }
  },
  batchToggleStatus: (ids: number[], status: number) => http.patch('/products/status', { ids, status }),
  remove: (id: number) => http.delete(`/products/${id}`),
  saveSkus: async (spuId: number, skus: ProductSKU[]) => {
    for (const sku of skus) {
      const payload = {
        skuName: sku.skuName,
        specInfo: sku.specInfo || {},
        price: sku.price,
        originalPrice: sku.costPrice ?? sku.price,
        stock: sku.stock,
        image: (sku as ProductSKU & { image?: string }).image || '',
        status: sku.status,
      }
      if (sku.id) await http.put(`/products/${spuId}/skus/${sku.id}`, payload)
      else await http.post(`/products/${spuId}/skus`, payload)
    }
    return { success: true }
  },
  removeSku: (spuId: number, skuId: number) => http.delete(`/products/${spuId}/skus/${skuId}`),
}

// ============ 分类 ============
export const apiCategory = {
  getList: () => http.get<(ProductCategory & { children: ProductCategory[]; productCount: number })[]>('/categories'),
  create: (category: Partial<ProductCategory>) =>
    http.post<{ id: number }>('/categories', {
      name: category.name, parentId: category.parentId, icon: category.icon,
      sort: category.sort, isGiftZone: category.isGiftZone,
    }).then(r => ({ ...category, id: r.id }) as ProductCategory),
  update: (id: number, patch: Partial<ProductCategory>) =>
    http.put(`/categories/${id}`, {
      name: patch.name, icon: patch.icon, sort: patch.sort,
      isGiftZone: patch.isGiftZone, status: patch.status,
    }),
  remove: (id: number) => http.delete(`/categories/${id}`),
}

// ============ 大礼包 ============
export const apiGiftPackage = {
  getList: () => http.get<GiftPackage[]>(`/gift-packages`),
  save: async (pkg: GiftPackage) => {
    const payload = {
      name: pkg.name, spuId: pkg.spuId, price: pkg.price, level: pkg.level,
      status: pkg.status,
      items: pkg.items?.map(i => ({ skuId: i.skuId, skuName: i.skuName, quantity: i.quantity, unitPrice: i.unitPrice })),
    }
    if (pkg.id) await http.put(`/gift-packages/${pkg.id}`, payload)
    else await http.post('/gift-packages', payload)
    return { success: true }
  },
}

// ============ 订单 ============
export const apiOrder = {
  getList: (params: { page: number; pageSize: number; orderType?: OrderType | ''; status?: OrderStatus | ''; keyword?: string }) =>
    http.get<{ list: Order[]; total: number }>('/orders', {
      page: params.page, pageSize: params.pageSize,
      type: params.orderType, status: params.status, keyword: params.keyword,
    }),
  getById: (id: number) => http.get<Order & { items: Row[] }>(`/orders/${id}`),
  ship: (id: number, logisticsCompany: string, logisticsNo: string) =>
    http.patch(`/orders/${id}/status`, { status: 2, logisticsCompany, logisticsNo }),
  /** 批量发货 */
  batchShip: (ids: number[], logisticsCompany: string, logisticsNo: string) =>
    http.patch('/orders/ship', { ids, company: logisticsCompany, no: logisticsNo }),
  /** 退款审核：pass 通过则置为已退款，否则驳回为已取消 */
  auditRefund: (id: number, pass: boolean, remark?: string) =>
    http.post(`/orders/${id}/refund-audit`, { pass, remark }),
}

// ============ 领货 ============
export const apiCredit = {
  getList: (params: { page: number; pageSize: number; status?: CreditStatus | ''; month?: string; keyword?: string }) =>
    http.get<{ list: MonthlyCredit[]; total: number }>('/credits', params as unknown as Record<string, unknown>),
  /** 调整领货额度：delta 为正则增加、负则扣减 */
  adjust: (id: number, delta: number, reason: string) =>
    http.post(`/credits/${id}/adjust`, { delta, reason }),
}

// ============ 转卖 ============
export const apiResell = {
  getList: (params: { page: number; pageSize: number; status?: ResellStatus | ''; keyword?: string }) =>
    http.get<{ list: ResellOrder[]; total: number }>('/resells', params as unknown as Record<string, unknown>),
  /** 待匹配的零售订单（手动匹配弹窗用） */
  getPendingOrders: () => http.get<Row[]>('/resells/pending-orders'),
  manualMatch: (id: number, matchOrderId: number) => http.post(`/resells/${id}/match`, { matchOrderId }),
  complete: (id: number) => http.post(`/resells/${id}/complete`),
  cancel: (id: number) => http.post(`/resells/${id}/cancel`),
}

// ============ 佣金 ============
export const apiCommission = {
  getList: (params: { page: number; pageSize: number; distributionLevel?: number | ''; status?: CommissionStatus | '' }) =>
    http.get<{ list: Commission[]; total: number }>('/commissions', {
      page: params.page, pageSize: params.pageSize,
      status: params.status, distributionLevel: params.distributionLevel,
    }),
  getById: (id: number) => http.get<Commission>(`/commissions/${id}`),
}

// ============ 提现 ============
export const apiWithdraw = {
  getList: (params: { page: number; pageSize: number; status?: WithdrawStatus | ''; keyword?: string }) =>
    http.get<{ list: Withdraw[]; total: number }>('/withdraws', params as unknown as Record<string, unknown>),
  /** 审核提现：pass 通过→待打款；驳回→已驳回（记备注） */
  audit: (id: number, pass: boolean, remark?: string) => http.post(`/withdraws/${id}/audit`, { pass, remark }),
  /** 打款 */
  pay: (id: number, transactionNo?: string) => http.post(`/withdraws/${id}/pay`, { transactionNo }),
}

// ============ 配置 ============
export const apiConfig = {
  getLevelConfigs: () => http.get<LevelBenefitConfig[]>('/config/levels'),
  saveLevelConfig: (config: LevelBenefitConfig) =>
    http.put(`/config/levels/${config.id}`, {
      levelName: config.levelName, levelSort: config.levelSort,
      entryAmount: config.entryAmount, shopDiscount: config.shopDiscount,
      monthlyCredit: config.monthlyCredit, creditMonths: config.creditMonths,
      resellFeeRate: config.resellFeeRate, status: config.status,
    }),
  createLevelConfig: async (config: Omit<LevelBenefitConfig, 'id'>) => {
    const data = await http.post<{ id: number; level: number }>('/config/levels', config)
    return { ...config, id: data.id, level: data.level } as LevelBenefitConfig
  },
  removeLevelConfig: (id: number) => http.delete(`/config/levels/${id}`),
  getCommissionConfigs: () => http.get<CommissionRuleConfig[]>('/config/commission-rules'),
  saveCommissionConfig: (config: CommissionRuleConfig) =>
    http.put(`/config/commission-rules/${config.id}`, { rate: config.rate, status: config.status }),
  getSystemConfigs: (group?: string) => http.get<SystemConfig[]>('/config/system', group ? { group } : undefined),
  saveSystemConfig: (config: SystemConfig) =>
    http.put(`/config/system/${config.id}`, {
      configValue: config.configValue, configGroup: config.configGroup, description: config.description,
    }),
  /** 站点品牌配置（公开接口，登录前也可读取） */
  getSiteConfig: () => http.get<SiteBranding>('/site/config'),
}

// ============ 钱包 ============
export const apiWallet = {
  getByMemberId: (memberId: number) => http.get<MemberWallet | null>(`/members/${memberId}/wallet`),
}

// ============ 管理员（后台账号） ============
export interface AdminRole {
  id: number
  code: string
  name: string
  description: string
  permissions: string[]
  isBuiltin: number
  status: number
  createTime: string
  updateTime: string
}

export interface PermissionGroup {
  group: string
  items: { code: string; name: string; desc?: string }[]
}

export const apiAdmin = {
  getList: async () => {
    const res = await http.get<{ list: Row[]; total: number }>('/admins', { page: 1, pageSize: 100 })
    return (res.list || []).map(a => ({
      id: Number(a.id), name: String(a.name), username: String(a.username),
      role: String(a.role), roleName: String(a.roleName ?? a.role),
      avatar: String(a.avatar || ''), status: Number(a.status) === 1,
      lastLogin: String(a.lastLogin ?? a.createdAt ?? '-'),
    })) as AdminAccount[]
  },
  create: (account: Partial<AdminAccount>) =>
    http.post<{ id: number }>('/admins', {
      username: account.username, password: account.password ?? '123456',
      name: account.name, role: account.role,
    }).then(r => ({ ...account, id: r.id }) as AdminAccount),
  update: (id: number, patch: Partial<AdminAccount>) =>
    http.put(`/admins/${id}`, {
      name: patch.name, role: patch.role, password: patch.password,
    }),
  remove: (id: number) => http.delete(`/admins/${id}`),
  toggleStatus: async (id: number) => {
    const list = await apiAdmin.getList()
    const cur = list.find(a => a.id === id)
    await http.patch(`/admins/${id}/status`, { status: cur?.status ? 0 : 1 })
    return { success: true }
  },
}

// ============ 角色与权限 ============
export const apiRole = {
  getList: () => http.get<AdminRole[]>('/roles'),
  getPermissionTree: () => http.get<PermissionGroup[]>('/roles/permission-tree'),
  create: (payload: { name: string; description?: string; permissions: string[] }) =>
    http.post<{ id: number }>('/roles', payload),
  update: (id: number, payload: Partial<AdminRole>) => http.put(`/roles/${id}`, payload),
  remove: (id: number) => http.delete(`/roles/${id}`),
  seedBuiltin: () => http.post('/roles/seed-builtin'),
}

// ============ 分销推广海报 ============
export interface PromotePoster {
  id: number
  title: string
  image: string
  status: number
  isFixed: number
  qrX: number
  qrY: number
  qrSize: number
  sort: number
  createTime: string
  updateTime: string
}

export const apiPoster = {
  getList: () => http.get<PromotePoster[]>('/posters'),
  create: (payload: { title?: string; image: string; status?: number; sort?: number; qrX?: number; qrY?: number; qrSize?: number }) =>
    http.post<{ id: number }>('/posters', payload),
  update: (id: number, payload: Partial<PromotePoster>) => http.put(`/posters/${id}`, payload),
  setFixed: (id: number, fixed: boolean) => http.patch(`/posters/${id}/fixed`, { fixed }),
  remove: (id: number) => http.delete(`/posters/${id}`),
}

// ============ 财务总览 ============
export const apiFinance = {
  /** 平台收支统计 */
  getOverview: async () => {
    const o = await http.get<Row>('/finance/overview')
    return {
      totalRevenue: Number(o.orderIncome ?? 0),
      commissionPaid: Number(o.commissionOut ?? 0),
      commissionPending: Number(o.commissionPending ?? 0),
      withdrawPaid: Number(o.withdrawOut ?? 0),
      resellServiceFee: Number(o.serviceFee ?? 0),
      grossProfit: Number(o.net ?? 0),
    }
  },
  /** 资金流水（按时间倒序） */
  getFlows: async () => {
    const data = await http.get<{ list: Row[] }>('/finance/flows', { page: 1, pageSize: 200 })
    const typeMap: Record<number, string> = { 1: '订单收入', 2: '服务费收入', 3: '佣金支出', 4: '提现打款', 5: '其他' }
    return data.list.map(f => ({
      time: String(f.createTime ?? ''),
      type: typeMap[Number(f.type)] || '其他',
      desc: String(f.remark ?? ''),
      amount: Number(f.amount ?? 0),
      balance: Number(f.balance ?? 0),
    }))
  },
}

// ============ 帮助文档 / 规则条款 ============
export interface HelpArticle {
  id: number
  scope: 'help' | 'rules'
  title: string
  category: string
  content: string
  sort: number
  status: number
  createTime: string
  updateTime: string
}

export const apiHelp = {
  getList: (keyword?: string, scope: 'help' | 'rules' = 'help') =>
    http.get<HelpArticle[]>('/help/admin/list', { keyword, scope }),
  create: (payload: { title: string; category: string; content: string; sort?: number; scope?: 'help' | 'rules' }) =>
    http.post<{ id: number }>('/help', payload),
  update: (id: number, payload: { title?: string; category?: string; content?: string; sort?: number; status?: number; scope?: 'help' | 'rules' }) =>
    http.put(`/help/${id}`, payload),
  remove: (id: number) => http.delete(`/help/${id}`),
}

// ============ 客服工单 ============
export interface WorkOrder {
  id: number
  ticketNo: string
  memberId: number
  memberName: string
  phone: string
  type: string
  title: string
  content: string
  images: string
  priority: number
  status: number
  replyContent: string
  handler: string
  handleTime: string | null
  closeTime: string | null
  createTime: string
  updateTime: string
}

export const apiWorkOrder = {
  getList: (params: { page: number; pageSize: number; status?: number | ''; type?: string; keyword?: string }) =>
    http.get<{ list: WorkOrder[]; total: number }>('/work-orders', params as unknown as Record<string, unknown>),
  getById: (id: number) => http.get<WorkOrder>(`/work-orders/${id}`),
  reply: (id: number, replyContent: string, status?: number) => http.post(`/work-orders/${id}/reply`, { replyContent, status }),
  updateStatus: (id: number, status: number) => http.patch(`/work-orders/${id}/status`, { status }),
}

// ============ 文件资产 ============
export const apiFileGroup = {
  getList: () => http.get<(FileAssetGroup & { assetCount: number })[]>('/file-groups'),
  create: (name: string, matchRules: string, icon?: string) =>
    http.post<{ id: number }>('/file-groups', { name, matchRules, icon: icon || 'folder' }),
  update: (id: number, patch: Partial<FileAssetGroup>) =>
    http.put(`/file-groups/${id}`, patch),
  remove: (id: number) => http.delete(`/file-groups/${id}`),
  getAssetCount: async (groupId: number | null) => {
    const data = await http.get<{ list: FileAsset[]; total: number }>('/files', { page: 1, pageSize: 1, groupId: groupId === null ? 'null' : groupId })
    return data.total
  },
}

const normalizeFileAsset = (asset: FileAsset | Row): FileAsset => {
  const rawType = (asset as Row).type
  const type = rawType === FileAssetType.Image || rawType === '1' || rawType === 1
    ? FileAssetType.Image
    : rawType === FileAssetType.Video || rawType === '2' || rawType === 2
      ? FileAssetType.Video
      : rawType === FileAssetType.Audio || rawType === '4' || rawType === 4
        ? FileAssetType.Audio
        : FileAssetType.Document
  const url = resolveAssetUrl((asset as Row).url)
  const thumbUrl = resolveAssetUrl((asset as Row).thumbUrl || (asset as Row).thumb_url || url)
  return {
    ...(asset as FileAsset),
    id: Number((asset as Row).id),
    name: String((asset as Row).name || ''),
    url,
    thumbUrl,
    type,
    size: Number((asset as Row).size ?? 0),
    width: (asset as Row).width ? Number((asset as Row).width) : undefined,
    height: (asset as Row).height ? Number((asset as Row).height) : undefined,
    duration: (asset as Row).duration ? Number((asset as Row).duration) : undefined,
    mimeType: String((asset as Row).mimeType || (asset as Row).mime_type || ''),
    usedCount: Number((asset as Row).usedCount ?? 0),
    createTime: String((asset as Row).createTime || (asset as Row).create_time || ''),
    groupId: (asset as Row).groupId === null || (asset as Row).group_id === null
      ? null
      : Number((asset as Row).groupId ?? (asset as Row).group_id ?? 0),
  }
}

export const apiFile = {
  getList: async (params: FileAssetQuery) => {
    const data = await http.get<{ list: Row[]; total: number; page?: number; pageSize?: number }>('/files', params as unknown as Record<string, unknown>)
    return { ...data, list: data.list.map(normalizeFileAsset) }
  },
  upload: (file: File, groupId?: number | null) => {
    const form = new FormData()
    form.append('file', file)
    if (groupId !== undefined && groupId !== null) form.append('groupId', String(groupId))
    return http.upload<Row>('/files/upload', form).then(normalizeFileAsset)
  },
  moveToGroup: (ids: number[], groupId: number | null) =>
    http.patch('/files/group', { ids, groupId }),
  delete: (id: number) => http.delete(`/files/${id}`),
  rename: (id: number, name: string) => http.patch(`/files/${id}/name`, { name }),
}
