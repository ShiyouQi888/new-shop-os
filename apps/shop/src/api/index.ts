/**
 * Shop API - 对接后端服务（@shop-os/server, localhost:3000/api/v1/shop*）
 */
import { http, MEMBER_TOKEN_KEY } from './http'
import type {
  Member, ProductCategory, ProductSPU, ProductSKU, GiftPackage,
  Order, MonthlyCredit, ResellOrder, Commission, MemberWallet, SiteBranding, CreditPoolProduct,
} from '@shop-os/shared'

export { MEMBER_TOKEN_KEY }

type Row = Record<string, unknown>

/** 后端商品行 → 前端 ProductSPU 结构（补默认字段） */
const toSPU = (r: Row): ProductSPU => ({
  id: Number(r.id),
  name: String(r.name || ''),
  categoryId: r.categoryId !== null && r.categoryId !== undefined ? Number(r.categoryId) : 0,
  mainImage: String(r.mainImage || r.main_image || ''),
  images: Array.isArray(r.images) ? r.images : [],
  description: String(r.description || ''),
  isGiftPackage: Number(r.isGiftPackage ?? r.is_gift_package ?? 0) === 1,
  isMonthlyProduct: Number(r.isMonthlyProduct ?? r.is_monthly_product ?? 0) === 1,
  excludeDiscount: Number(r.excludeDiscount ?? r.exclude_discount ?? 0) === 1,
  status: Number(r.status ?? 1),
  sort: Number(r.sort ?? 0),
  createTime: String(r.createTime || r.create_time || ''),
  brand: '',
  minPrice: r.minPrice !== null && r.minPrice !== undefined ? Number(r.minPrice) : undefined,
  price: Number(r.price ?? r.minPrice ?? 0),
  minOriginalPrice: r.minOriginalPrice !== null && r.minOriginalPrice !== undefined ? Number(r.minOriginalPrice) : undefined,
  originalPrice: r.originalPrice !== null && r.originalPrice !== undefined ? Number(r.originalPrice) : (
    r.minOriginalPrice !== null && r.minOriginalPrice !== undefined ? Number(r.minOriginalPrice) : undefined
  ),
})

export const api = {
  // ===== 首页 =====
  getHomeData: async () => {
    const d = await http.get<Row>('/shop/home')
    return {
      banners: (d.banners as Row[] | undefined ?? []).map(b => ({
        image: String(b.image || ''), link: String(b.link || ''),
      })),
      categories: (d.categories as Row[] | undefined ?? []).map(c => ({
        id: Number(c.id), name: String(c.name), icon: String(c.icon || 'folder'),
        parentId: 0, isGiftZone: Number(c.isGiftZone ?? 0) === 1, status: 1, sort: 0,
      })),
      giftPackages: (d.giftPackages as Row[] | undefined ?? []).map(g => ({
        id: Number(g.id), name: String(g.name), price: Number(g.price), level: Number(g.level),
        spuId: Number(g.spuId ?? 0), status: 1,
        levelName: String(g.levelName || ''),
        items: (Array.isArray(g.items) ? g.items as Row[] : []).map(it => ({
          id: Number(it.id), packageId: Number(it.packageId), skuId: Number(it.skuId),
          skuName: String(it.skuName || ''), quantity: Number(it.quantity ?? 1),
          unitPrice: Number(it.unitPrice ?? 0),
        })),
        createTime: '',
      }) as GiftPackage),
      hotProducts: (d.hotProducts as Row[] | undefined ?? []).map(toSPU),
      newProducts: (d.newProducts as Row[] | undefined ?? []).map(toSPU),
    }
  },

  // ===== 商品 =====
  getProducts: async (params: { categoryId?: number; keyword?: string; isGiftPackage?: boolean }) => {
    const data = await http.get<{ list: Row[]; total: number }>('/shop/products', {
      categoryId: params.categoryId, keyword: params.keyword,
      isGiftPackage: params.isGiftPackage,
      page: 1, pageSize: 100,
    })
    return data.list.map(toSPU)
  },
  getProduct: async (id: number) => {
    const d = await http.get<Row & { skus?: Row[] }>(`/shop/products/${id}`)
    if (!d || !d.id) return null
    const spu = toSPU(d)
    const skus = (d.skus || []).map(s => ({
      id: Number(s.id), spuId: id, skuName: String(s.skuName || ''),
      specInfo: typeof s.specInfo === 'object' ? (s.specInfo as Record<string, string>) : {},
      price: Number(s.price ?? 0), costPrice: Number(s.originalPrice ?? s.price ?? 0),
      stock: Number(s.stock ?? 0), stockLocked: 0, status: Number(s.status ?? 1),
      image: String(s.image || ''), originalPrice: Number(s.originalPrice ?? s.price ?? 0),
    }) as ProductSKU)
    return { spu, skus }
  },
  getCategories: async (): Promise<ProductCategory[]> => {
    const list = await http.get<Row[]>('/shop/categories')
    const flat: ProductCategory[] = []
    const walk = (nodes: Row[]) => {
      for (const n of nodes) {
        const cat = {
          id: Number(n.id), name: String(n.name), parentId: Number(n.parentId ?? 0),
          icon: String(n.icon || 'folder'), sort: Number(n.sort ?? 0),
          isGiftZone: Number(n.isGiftZone ?? 0) === 1, status: 1,
        } as ProductCategory
        flat.push(cat)
        if (Array.isArray(n.children)) walk(n.children as Row[])
      }
    }
    walk(list)
    return flat
  },
  /** 等级权益配置（公开，供徽章/等级展示/入会专区） */
  getLevels: () => http.get<Array<{ level: number; levelName: string; levelSort: number; entryAmount: number; shopDiscount: number; monthlyCredit: number; creditMonths: number }>>('/shop/levels'),
  /** 佣金规则（公开，按礼包等级 × 分销层级） */
  getCommissionRules: () => http.get<Array<{ id: number; packageLevel: number; distributionLevel: number; rate: number; status: number }>>('/shop/commission-rules'),
  /** 分销开关配置（公开：总开关 + 分级开关 + 生效层级） */
  getDistributionConfig: () => http.get<{
    enabled: boolean; level1: boolean; level2: boolean; level3: boolean; activeLevels: number[]
  }>('/shop/distribution-config'),
  /** 推广配置（公开：站点域名，用于生成推广链接） */
  getPromoteConfig: () => http.get<{ domain: string; registerPath: string }>('/shop/promote-config'),
  /** 站点品牌配置（公开：Logo、图标、站点名） */
  getSiteConfig: () => http.get<SiteBranding>('/site/config'),
  /** 推广数据统计（需登录：直属/团队/成交/佣金，真实数据） */
  getPromoteStats: () => http.get<{
    directCount: number; teamCount: number; orderCount: number; commissionTotal: number
  }>('/shop/member/promote-stats'),
  /** 启用的推广海报（公开：固定海报 + 随机候选列表） */
  getPosters: () => http.get<{
    list: Array<{ id: number; title: string; image: string; isFixed: number; qrX: number; qrY: number; qrSize: number; sort: number }>
    fixed: { id: number; title: string; image: string; qrX: number; qrY: number; qrSize: number } | null
    randomList: Array<{ id: number; title: string; image: string; qrX: number; qrY: number; qrSize: number }>
  }>('/shop/posters'),

  // ===== 代理商 =====
  getAgentStats: async (member: Member) => {
    const d = await http.get<Row>('/shop/member/me', { memberId: member.id })
    const m = d.member as Row
    const walletRaw = (d.wallet ?? m.wallet ?? {}) as Row
    const comm = (d.commission ?? {}) as Row
    const team = (d.team ?? {}) as Row
    const memberData: Member = {
      id: Number(m.id), phone: String(m.phone || ''), nickname: String(m.nickname || ''),
      avatar: String(m.avatar || ''), level: Number(m.level ?? 0),
      inviterId: m.inviterId !== null && m.inviterId !== undefined ? Number(m.inviterId) : null,
      secondInviterId: m.secondInviterId !== null && m.secondInviterId !== undefined ? Number(m.secondInviterId) : null,
      thirdInviterId: m.thirdInviterId !== null && m.thirdInviterId !== undefined ? Number(m.thirdInviterId) : null,
      inviteCode: String(m.inviteCode || ''), status: Number(m.status ?? 1),
      realName: String(m.realName || ''), registerTime: String(m.registerTime || ''),
      becomeAgentTime: m.becomeAgentTime ? String(m.becomeAgentTime) : null,
      levelExpireTime: m.levelExpireTime ? String(m.levelExpireTime) : null,
    }
    const wallet: MemberWallet = {
      id: 0, memberId: memberData.id,
      balance: Number(walletRaw.balance ?? 0), frozen: Number(walletRaw.frozen ?? 0),
      totalIncome: Number(walletRaw.totalIncome ?? 0), totalWithdraw: Number(walletRaw.totalWithdraw ?? 0),
      updateTime: '',
    }
    return {
      member: memberData,
      wallet,
      /** 商城折扣率（90=9折），来自后端等级配置 */
      shopDiscount: Number(m.shopDiscount ?? 100),
      monthlyCredit: (d.monthlyCredit as MonthlyCredit | null) ?? null,
      /** 领货/转卖模式：lump_sum 一次性用完剩余额度 / flexible 自由任意额度 */
      claimMode: (d.claimMode === 'flexible' ? 'flexible' : 'lump_sum') as 'lump_sum' | 'flexible',
      commission: {
        total: Number(comm.total ?? 0), available: Number(comm.available ?? 0),
        pending: Number(comm.pending ?? 0), withdrawn: Number(comm.withdrawn ?? 0),
      },
      team: {
        level1: Number(team.level1 ?? 0), level2: Number(team.level2 ?? 0),
        level3: Number(team.level3 ?? 0), total: Number(team.total ?? 0),
      },
      resellActive: Number(d.resellActive ?? 0),
    }
  },
  getMonthlyCredit: (memberId: number) => http.get<MonthlyCredit[]>('/shop/member/credits', { memberId }),
  /** 我的等级可兑换的领货商品池 */
  getCreditPool: () => http.get<CreditPoolProduct[]>('/shop/member/credit-pool'),
  /** 用领货额度兑换商品池内商品，生成待发货订单（一次性模式下 items 合计须等于剩余额度） */
  redeemCredit: (creditId: number, payload: { items: { skuId: number; quantity: number }[]; receiverName: string; receiverPhone: string; receiverAddress: string }) =>
    http.post<{ orderId: number; cost: number; remainAmount: number }>(`/shop/member/credits/${creditId}/redeem`, payload),
  getResellOrders: (memberId: number) => http.get<ResellOrder[]>('/shop/member/resells', { memberId }),
  /** 发起转卖（落库，后台可见）：固定一次性转卖全部可转卖额度，金额与费用均由服务端权威计算 */
  createResell: (payload: { creditId?: number; skuName?: string }) =>
    http.post<ResellOrder>('/shop/member/resells', payload),
  getCommissions: (memberId: number, level?: number) =>
    http.get<Commission[]>('/shop/member/commissions', { memberId, level }),
  getTeam: (memberId: number, level: 1 | 2 | 3) =>
    http.get<Member[]>('/shop/member/team', { memberId, level }),

  // ===== 会员 =====
  login: (phone: string, password: string) => http.post<Row>('/shop/member/login', { phone, password }),
  register: (payload: { phone: string; password: string; nickname: string; inviteCode: string }) =>
    http.post<Row>('/shop/member/register', payload),
  upgradeToAgent: (level: number) =>
    http.post<Row>('/shop/member/upgrade', { level }),

  // ===== 订单 =====
  createOrder: (payload: Row) => http.post<{ orderId: number; payAmount: number }>('/shop/orders', payload),
  getOrders: (memberId: number) => http.get<Order[]>('/shop/member/orders', { memberId }),
  /** 创建支付单（微信/支付宝） */
  createPayment: (payload: { orderId: number; payType: 'wechat' | 'alipay' }) =>
    http.post<{
      paymentNo: string
      payType: string
      amount: number
      status: number
      mode: 'mock' | 'real'
      provider: 'mock' | 'wechat' | 'alipay'
      mock: boolean
      credential: Record<string, unknown>
    }>('/shop/payments', payload),
  /** 模拟第三方支付回调成功（生产由支付网关回调替代） */
  simulatePayment: (paymentNo: string) => http.post<{ orderId: number }>(`/shop/payments/${paymentNo}/simulate`),
  payOrder: (orderId: number) => http.post(`/shop/orders/${orderId}/pay`),
  confirmOrder: (orderId: number) => http.post(`/shop/orders/${orderId}/confirm`),
  cancelOrder: (orderId: number) => http.post(`/shop/orders/${orderId}/cancel`),

  // ===== 收货地址 =====
  getAddresses: () => http.get<Array<{
    id: number; memberId: number; name: string; phone: string; province: string; city: string; district: string; detail: string; isDefault: number; createTime: string
  }>>('/shop/member/addresses'),
  addAddress: (payload: Row) => http.post<{ id: number }>('/shop/member/addresses', payload),
  updateAddress: (id: number, payload: Row) => http.put(`/shop/member/addresses/${id}`, payload),
  setDefaultAddress: (id: number) => http.put(`/shop/member/addresses/${id}/default`),
  removeAddress: (id: number) => http.delete(`/shop/member/addresses/${id}`),

  // ===== 购物车 =====
  getCart: () => http.get<Array<{
    id: number; skuId: number; quantity: number; selected: number; skuName: string; price: number; originalPrice: number; mainImage: string; spuId: number; spuName: string
  }>>('/shop/member/cart'),
  addToCart: (payload: { skuId: number; quantity?: number }) => http.post('/shop/member/cart', payload),
  updateCartItem: (skuId: number, payload: { quantity?: number; selected?: boolean }) => http.put(`/shop/member/cart/${skuId}`, payload),
  setCartSelectAll: (selected: boolean) => http.put('/shop/member/cart/select-all', { selected }),
  removeCartItem: (skuId: number) => http.delete(`/shop/member/cart/${skuId}`),

  // ===== 收藏 =====
  getFavorites: () => http.get<Array<{ id: number; spuId: number; name: string; mainImage: string; description: string; minPrice: number; minOriginalPrice?: number; createTime: string }>>('/shop/member/favorites'),
  addFavorite: (spuId: number) => http.post('/shop/member/favorites', { spuId }),
  removeFavorite: (spuId: number) => http.delete(`/shop/member/favorites/${spuId}`),

  // ===== 浏览历史 =====
  getHistory: () => http.get<Array<{ id: number; spuId: number; name: string; mainImage: string; description: string; createTime: string }>>('/shop/member/history'),
  addHistory: (spuId: number) => http.post('/shop/member/history', { spuId }),

  // ===== 消息通知 =====
  getNotifications: () => http.get<{ list: Array<{ id: number; type: string; title: string; content: string; isRead: number; createTime: string }>; unread: number }>('/shop/member/notifications'),
  readAllNotifications: () => http.post('/shop/member/notifications/read-all'),

  // ===== 客服工单 =====
  getWorkOrders: () => http.get<Array<{
    id: number
    ticketNo: string
    type: string
    title: string
    content: string
    images: string[]
    priority: number
    status: number
    replyContent: string
    handler: string
    handleTime: string | null
    closeTime: string | null
    createTime: string
    updateTime: string
  }>>('/shop/member/work-orders'),
  createWorkOrder: (payload: { type: string; title: string; content: string; images?: string[]; priority?: number }) =>
    http.post<{ id: number }>('/shop/member/work-orders', payload),
  closeWorkOrder: (id: number) => http.patch(`/shop/member/work-orders/${id}/close`),

  // ===== 提现账号 / 提现申请 =====
  getPayoutAccount: () => http.get<{
    memberId: number; bankName: string; bankCard: string; bankHolder: string; alipayName: string; alipayAccount: string; updateTime: string
  }>('/shop/member/payout-account'),
  savePayoutAccount: (payload: Row) => http.put('/shop/member/payout-account', payload),
  getWithdrawals: () => http.get<Array<{
    id: number; withdrawNo: string; amount: number; fee: number; actualAmount: number; bankName: string; bankCard: string; status: number; auditRemark: string; createTime: string; payTime: string | null
  }>>('/shop/member/withdraws'),
  applyWithdrawal: (payload: { amount: number; payType?: 0 | 1 }) => http.post<{ id: number }>('/shop/member/withdraws', payload),

  // ===== 帮助中心 / 规则中心 =====
  getHelpList: () => http.get<Array<{ id: number; title: string; category: string }>>('/help', { scope: 'help' }),
  getHelpDetail: (id: number) =>
    http.get<{ id: number; title: string; category: string; content: string }>(`/help/${id}`),
  /** 规则条款列表（/mine/rules） */
  getRulesList: () => http.get<Array<{ id: number; title: string; category: string; content: string }>>('/help', { scope: 'rules' }),
}
