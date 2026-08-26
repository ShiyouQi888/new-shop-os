/**
 * 全局类型定义
 * 供 admin 和 shop 共用的 TypeScript 类型
 */

// ============ 通用 ============

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface Option<T = string | number> {
  label: string
  value: T
  disabled?: boolean
}

// ============ 会员与分享 ============

export enum MemberLevel {
  Normal = 0,
  Silver = 1, // 银卡 5800
  Gold = 2,    // 金卡 9800
}

export enum MemberStatus {
  Active = 1,
  Disabled = 0,
  Frozen = 2,
}

export interface Member {
  id: number
  phone: string
  nickname: string
  avatar: string
  level: MemberLevel
  inviterId: number | null
  secondInviterId: number | null
  thirdInviterId: number | null
  inviteCode: string
  status: MemberStatus
  realName: string
  registerTime: string
  becomeAgentTime: string | null
  levelExpireTime: string | null
}

export interface DistributionRelation {
  id: number
  memberId: number
  level: 1 | 2 | 3
  inviterId: number
  bindTime: string
  source: 'link' | 'invite_code' | 'manual'
}

// ============ 商品 ============

export enum ProductStatus {
  OnSale = 1,
  OffSale = 0,
}

export interface ProductSPU {
  id: number
  name: string
  categoryId: number
  brand: string
  mainImage: string
  images: string[]
  description: string
  price?: number
  minPrice?: number
  originalPrice?: number
  minOriginalPrice?: number
  isGiftPackage: boolean
  isMonthlyProduct: boolean
  excludeDiscount: boolean
  status: ProductStatus
  sort: number
  createTime: string
}

export interface ProductSKU {
  id: number
  spuId: number
  skuName: string
  specInfo: Record<string, string>
  price: number
  costPrice: number
  originalPrice?: number
  stock: number
  stockLocked: number
  status: ProductStatus
}

export interface ProductCategory {
  id: number
  name: string
  parentId: number
  icon: string
  sort: number
  isGiftZone: boolean
  status: ProductStatus
}

// ============ 文件资产（图片/视频） ============

export enum FileAssetType {
  Image = 'image',
  Video = 'video',
  Document = 'document',
  Audio = 'audio',
}

export const FileAssetTypeLabels: Record<FileAssetType, string> = {
  [FileAssetType.Image]: '图片',
  [FileAssetType.Video]: '视频',
  [FileAssetType.Document]: '文档',
  [FileAssetType.Audio]: '音频',
}

/** 文件资产分组 */
export interface FileAssetGroup {
  id: number
  name: string
  /** 自动归组规则：匹配文件扩展名（逗号分隔，如 "jpg,png"）或类型（如 "video"） */
  matchRules?: string
  /** 分组图标（emoji） */
  icon?: string
  /** 创建时间 */
  createTime: string
}

export interface FileAsset {
  id: number
  name: string
  url: string
  thumbUrl: string
  type: FileAssetType
  size: number
  width?: number
  height?: number
  duration?: number
  mimeType: string
  usedCount: number
  createTime: string
  /** 所属分组 id，null 表示未分组 */
  groupId: number | null
}

export interface FileAssetQuery {
  page: number
  pageSize: number
  keyword?: string
  type?: FileAssetType | ''
  /** 分组 id：null 查未分组，undefined 查全部 */
  groupId?: number | null
}

export interface GiftPackage {
  id: number
  name: string
  spuId: number
  price: number
  level: number // 关联的代理商等级标识（对应 LevelBenefitConfig.level）
  levelName?: string // 关联等级名称（接口联查返回）
  status: ProductStatus
  items: GiftPackageItem[]
}

export interface GiftPackageItem {
  id: number
  packageId: number
  skuId: number
  skuName: string
  quantity: number
  unitPrice: number
}

// ============ 订单 ============

export enum OrderType {
  Retail = 1,       // 零售
  GiftPackage = 2,  // 大礼包
  Credit = 3,       // 领货
  Resell = 4,       // 转卖
}

export enum OrderStatus {
  PendingPayment = 0,  // 待支付
  PaidPendingShip = 1, // 已支付待发货
  Shipped = 2,         // 已发货
  Completed = 3,       // 已完成
  Cancelled = 4,       // 已取消
  Refunding = 5,       // 退款中
  Refunded = 6,        // 已退款
}

export interface Order {
  id: number
  orderNo: string
  memberId: number
  orderType: OrderType
  totalAmount: number
  discountAmount: number
  couponAmount: number
  shippingFee: number
  payAmount: number
  memberLevel: MemberLevel
  payType: number | null
  payTime: string | null
  status: OrderStatus
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  logisticsCompany: string | null
  logisticsNo: string | null
  shipTime: string | null
  confirmTime: string | null
  inviterId: number | null
  remark: string | null
  createTime: string
  items: OrderItem[]
}

export interface OrderItem {
  id: number
  orderId: number
  skuId: number
  skuName: string
  quantity: number
  originalPrice: number
  memberPrice: number
  unitPrice: number
  totalPrice: number
  discountAmount: number
  sourceType: 1 | 2 // 1自有库存 2转卖匹配
  resellOrderId: number | null
}

// ============ 月度领货 ============

export enum CreditStatus {
  Unused = 0,        // 待使用
  PartialUsed = 1,   // 部分使用
  UsedUp = 2,        // 已用完
  Expired = 3,       // 已过期
  Resold = 4,        // 已转卖
}

export interface MonthlyCredit {
  id: number
  memberId: number
  memberLevel: MemberLevel
  packageId: number
  month: string // YYYY-MM
  creditAmount: number
  usedAmount: number
  remainAmount: number
  status: CreditStatus
  expireTime: string
  createTime: string
}

// ============ 转卖 ============

export enum ResellStatus {
  PendingMatch = 0,   // 待匹配
  Matching = 1,       // 匹配中
  Matched = 2,        // 已匹配
  Completed = 3,      // 已完成
  Cancelled = 4,      // 已取消
  MatchFailed = 5,    // 匹配失败
}

export interface ResellOrder {
  id: number
  resellNo: string
  memberId: number
  creditId: number
  skuId: number
  skuName: string
  quantity: number
  goodsValue: number
  serviceFee: number
  shippingFee: number
  settleAmount: number
  status: ResellStatus
  matchOrderId: number | null
  matchTime: string | null
  settleTime: string | null
  cancelTime: string | null
  createTime: string
}

// ============ 佣金与钱包 ============

export enum CommissionStatus {
  PendingSettle = 0,  // 待结算
  Available = 1,      // 可提现
  Withdrawn = 2,      // 已提现
  Frozen = 3,         // 已冻结
  RolledBack = 4,     // 已回滚
}

export interface Commission {
  id: number
  commissionNo: string
  memberId: number
  sourceMemberId: number
  sourceOrderId: number
  orderAmount: number
  packageLevel: MemberLevel
  distributionLevel: 1 | 2 | 3
  rate: number
  amount: number
  status: CommissionStatus
  settleTime: string | null
  rollbackReason: string | null
  createTime: string
}

export enum WithdrawStatus {
  PendingAudit = 0,      // 待审核
  AuditPassed = 1,      // 审核通过待打款
  Paid = 2,             // 已打款
  Rejected = 3,         // 已驳回
}

export interface Withdraw {
  id: number
  withdrawNo: string
  memberId: number
  amount: number
  fee: number
  actualAmount: number
  payType: 0 | 1 // 0银行卡 1支付宝
  bankName: string
  bankCard: string
  bankHolder: string
  alipayName: string
  alipayAccount: string
  status: WithdrawStatus
  auditTime: string | null
  auditOperator: string | null
  auditRemark: string | null
  payTime: string | null
  payTransactionNo: string | null
  createTime: string
}

export interface MemberWallet {
  id: number
  memberId: number
  balance: number
  frozen: number
  totalIncome: number
  totalWithdraw: number
  updateTime: string
}

// ============ 配置 ============

export interface LevelBenefitConfig {
  id: number
  level: number // 等级标识（自增档位 1/2/3...，可扩展任意多级）
  levelName: string // 等级身份名称（可自定义，如：银卡代理商/钻石代理商）
  levelSort: number // 展示排序，越小越靠前
  entryAmount: number
  shopDiscount: number // 90 = 9折
  monthlyCredit: number
  creditMonths: number
  resellFeeRate: number // 20 = 20%
  status: ProductStatus
}

export interface CommissionRuleConfig {
  id: number
  packageLevel: MemberLevel.Silver | MemberLevel.Gold
  distributionLevel: 1 | 2 | 3
  rate: number
  status: ProductStatus
}

export interface SystemConfig {
  id: number
  configKey: string
  configValue: string
  configGroup: string
  description: string
  updateTime: string
  updateOperator?: string
}

/** 站点品牌配置（公开接口，登录前/无鉴权场景使用：Logo、图标、站点名） */
export interface SiteBranding {
  name: string
  logo: string
  icon: string
}

// ============ 看板数据 ============

export interface DashboardStats {
  totalMembers: number
  totalAgents: number
  todayOrders: number
  todayRevenue: number
  totalCommission: number
  pendingWithdraw: number
  activeResellOrders: number
  monthlyCreditUsage: number
}

export interface DashboardTrend {
  date: string
  revenue: number
  orders: number
  newMembers: number
}

// ============ 枚举映射 ============

export const MemberLevelLabels: Record<MemberLevel, string> = {
  [MemberLevel.Normal]: '普通会员',
  [MemberLevel.Silver]: '银卡代理商',
  [MemberLevel.Gold]: '金卡代理商',
}

export const OrderTypeLabels: Record<OrderType, string> = {
  [OrderType.Retail]: '零售',
  [OrderType.GiftPackage]: '大礼包',
  [OrderType.Credit]: '领货',
  [OrderType.Resell]: '转卖',
}

export const OrderStatusLabels: Record<OrderStatus, string> = {
  [OrderStatus.PendingPayment]: '待支付',
  [OrderStatus.PaidPendingShip]: '待发货',
  [OrderStatus.Shipped]: '待收货',
  [OrderStatus.Completed]: '已完成',
  [OrderStatus.Cancelled]: '已取消',
  [OrderStatus.Refunding]: '退款中',
  [OrderStatus.Refunded]: '已退款',
}

export const CreditStatusLabels: Record<CreditStatus, string> = {
  [CreditStatus.Unused]: '待使用',
  [CreditStatus.PartialUsed]: '部分使用',
  [CreditStatus.UsedUp]: '已用完',
  [CreditStatus.Expired]: '已过期',
  [CreditStatus.Resold]: '已转卖',
}

export const ResellStatusLabels: Record<ResellStatus, string> = {
  [ResellStatus.PendingMatch]: '待匹配',
  [ResellStatus.Matching]: '匹配中',
  [ResellStatus.Matched]: '已匹配',
  [ResellStatus.Completed]: '已完成',
  [ResellStatus.Cancelled]: '已取消',
  [ResellStatus.MatchFailed]: '匹配失败',
}

export const CommissionStatusLabels: Record<CommissionStatus, string> = {
  [CommissionStatus.PendingSettle]: '待结算',
  [CommissionStatus.Available]: '可提现',
  [CommissionStatus.Withdrawn]: '已提现',
  [CommissionStatus.Frozen]: '已冻结',
  [CommissionStatus.RolledBack]: '已回滚',
}

export const WithdrawStatusLabels: Record<WithdrawStatus, string> = {
  [WithdrawStatus.PendingAudit]: '待审核',
  [WithdrawStatus.AuditPassed]: '审核通过',
  [WithdrawStatus.Paid]: '已打款',
  [WithdrawStatus.Rejected]: '已驳回',
}
