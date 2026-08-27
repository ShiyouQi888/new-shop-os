/**
 * Mock 数据库 - 前端开发用模拟数据
 */
import {
  Member, MemberLevel, MemberStatus,
  ProductSPU, ProductSKU, ProductCategory, ProductStatus,
  GiftPackage,
  Order, OrderType, OrderStatus, OrderItem,
  MonthlyCredit, CreditStatus,
  ResellOrder, ResellStatus,
  Commission, CommissionStatus,
  Withdraw, WithdrawStatus,
  MemberWallet,
  LevelBenefitConfig, CommissionRuleConfig, SystemConfig,
  DashboardStats, DashboardTrend,
  FileAsset, FileAssetType, FileAssetGroup,
} from '../types'

// ============ 会员数据 ============
export const mockMembers: Member[] = [
  {
    id: 1, phone: '13800001111', nickname: '张伟', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
    level: MemberLevel.Gold, inviterId: null, secondInviterId: null, thirdInviterId: null,
    inviteCode: 'GOLD001', status: MemberStatus.Active, realName: '张伟',
    registerTime: '2026-01-10 09:30:00', becomeAgentTime: '2026-01-10 10:00:00', levelExpireTime: null,
  },
  {
    id: 2, phone: '13800002222', nickname: '李娜', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
    level: MemberLevel.Gold, inviterId: 1, secondInviterId: null, thirdInviterId: null,
    inviteCode: 'GOLD002', status: MemberStatus.Active, realName: '李娜',
    registerTime: '2026-02-15 14:20:00', becomeAgentTime: '2026-02-15 15:00:00', levelExpireTime: null,
  },
  {
    id: 3, phone: '13800003333', nickname: '王芳', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
    level: MemberLevel.Silver, inviterId: 2, secondInviterId: 1, thirdInviterId: null,
    inviteCode: 'SIL003', status: MemberStatus.Active, realName: '王芳',
    registerTime: '2026-03-20 10:15:00', becomeAgentTime: '2026-03-20 11:00:00', levelExpireTime: null,
  },
  {
    id: 4, phone: '13800004444', nickname: '刘洋', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
    level: MemberLevel.Silver, inviterId: 3, secondInviterId: 2, thirdInviterId: 1,
    inviteCode: 'SIL004', status: MemberStatus.Active, realName: '刘洋',
    registerTime: '2026-04-01 16:30:00', becomeAgentTime: '2026-04-01 17:00:00', levelExpireTime: null,
  },
  {
    id: 5, phone: '13800005555', nickname: '陈静', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
    level: MemberLevel.Normal, inviterId: 1, secondInviterId: null, thirdInviterId: null,
    inviteCode: 'NOR005', status: MemberStatus.Active, realName: '',
    registerTime: '2026-05-10 11:00:00', becomeAgentTime: null, levelExpireTime: null,
  },
  {
    id: 6, phone: '13800006666', nickname: '杨光', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=6',
    level: MemberLevel.Normal, inviterId: 2, secondInviterId: 1, thirdInviterId: null,
    inviteCode: 'NOR006', status: MemberStatus.Active, realName: '',
    registerTime: '2026-05-12 09:45:00', becomeAgentTime: null, levelExpireTime: null,
  },
  {
    id: 7, phone: '13800007777', nickname: '赵敏', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=7',
    level: MemberLevel.Gold, inviterId: 1, secondInviterId: null, thirdInviterId: null,
    inviteCode: 'GOLD007', status: MemberStatus.Active, realName: '赵敏',
    registerTime: '2026-06-01 13:00:00', becomeAgentTime: '2026-06-01 14:00:00', levelExpireTime: null,
  },
  {
    id: 8, phone: '13800008888', nickname: '黄磊', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=8',
    level: MemberLevel.Silver, inviterId: 7, secondInviterId: 1, thirdInviterId: null,
    inviteCode: 'SIL008', status: MemberStatus.Frozen, realName: '黄磊',
    registerTime: '2026-06-15 15:30:00', becomeAgentTime: '2026-06-15 16:00:00', levelExpireTime: null,
  },
]

// ============ 商品分类 ============
export const mockCategories: ProductCategory[] = [
  { id: 1, name: '美妆护肤', parentId: 0, icon: 'lipstick', sort: 1, isGiftZone: false, status: ProductStatus.OnSale },
  { id: 2, name: '健康食品', parentId: 0, icon: 'nutrition', sort: 2, isGiftZone: false, status: ProductStatus.OnSale },
  { id: 3, name: '家居生活', parentId: 0, icon: 'home', sort: 3, isGiftZone: false, status: ProductStatus.OnSale },
  { id: 4, name: '数码电器', parentId: 0, icon: 'device', sort: 4, isGiftZone: false, status: ProductStatus.OnSale },
  { id: 5, name: '入会专区', parentId: 0, icon: 'gift', sort: 0, isGiftZone: true, status: ProductStatus.OnSale },
  { id: 11, name: '面部护理', parentId: 1, icon: '', sort: 1, isGiftZone: false, status: ProductStatus.OnSale },
  { id: 12, name: '彩妆', parentId: 1, icon: '', sort: 2, isGiftZone: false, status: ProductStatus.OnSale },
  { id: 21, name: '营养补充', parentId: 2, icon: '', sort: 1, isGiftZone: false, status: ProductStatus.OnSale },
  { id: 22, name: '功能食品', parentId: 2, icon: '', sort: 2, isGiftZone: false, status: ProductStatus.OnSale },
]

// ============ 商品 SPU ============
const imgBase = 'https://picsum.photos/seed'
export const mockProducts: ProductSPU[] = [
  {
    id: 1, name: '金卡尊享大礼包', categoryId: 5, brand: '平台自营', mainImage: `${imgBase}/gift1/400/400`,
    images: [`${imgBase}/gift1/400/400`, `${imgBase}/gift1b/400/400`, `${imgBase}/gift1c/400/400`],
    description: '购买即成为金卡代理商，享8折商城购物、月度领货980元/月（10个月）、分享佣金15%等专属权益。',
    isGiftPackage: true, isMonthlyProduct: false, excludeDiscount: true, status: ProductStatus.OnSale, sort: 1,
    createTime: '2026-01-01 00:00:00',
  },
  {
    id: 2, name: '银卡优选大礼包', categoryId: 5, brand: '平台自营', mainImage: `${imgBase}/gift2/400/400`,
    images: [`${imgBase}/gift2/400/400`, `${imgBase}/gift2b/400/400`],
    description: '购买即成为银卡代理商，享9折商城购物、月度领货580元/月（10个月）、分享佣金10%等专属权益。',
    isGiftPackage: true, isMonthlyProduct: false, excludeDiscount: true, status: ProductStatus.OnSale, sort: 2,
    createTime: '2026-01-01 00:00:00',
  },
  {
    id: 3, name: '赋能焕颜精华套装', categoryId: 11, brand: '美研社', mainImage: `${imgBase}/p3/400/400`,
    images: [`${imgBase}/p3/400/400`, `${imgBase}/p3b/400/400`],
    description: '蕴含高浓度烟酰胺与玻尿酸，深层滋润，提亮肤色。套装含精华液30ml + 面霜50g。',
    isGiftPackage: false, isMonthlyProduct: true, excludeDiscount: false, status: ProductStatus.OnSale, sort: 10,
    createTime: '2026-02-01 00:00:00',
  },
  {
    id: 4, name: '鲜活鱼胶原蛋白肽', categoryId: 21, brand: '健康源', mainImage: `${imgBase}/p4/400/400`,
    images: [`${imgBase}/p4/400/400`, `${imgBase}/p4b/400/400`],
    description: '深海鱼皮提取，分子量<1000道尔顿，易吸收。每瓶含鱼胶原蛋白肽粉150g。',
    isGiftPackage: false, isMonthlyProduct: true, excludeDiscount: false, status: ProductStatus.OnSale, sort: 11,
    createTime: '2026-02-10 00:00:00',
  },
  {
    id: 5, name: '轻奢丝绸眼罩', categoryId: 3, brand: '居家优选', mainImage: `${imgBase}/p5/400/400`,
    images: [`${imgBase}/p5/400/400`],
    description: '100%桑蚕丝内里，柔软亲肤，遮光率99%，助您安然入眠。',
    isGiftPackage: false, isMonthlyProduct: false, excludeDiscount: false, status: ProductStatus.OnSale, sort: 20,
    createTime: '2026-03-01 00:00:00',
  },
  {
    id: 6, name: '便携蓝牙耳机', categoryId: 4, brand: '声科', mainImage: `${imgBase}/p6/400/400`,
    images: [`${imgBase}/p6/400/400`, `${imgBase}/p6b/400/400`],
    description: 'ANC主动降噪，蓝牙5.3，续航36小时，IPX5防水。',
    isGiftPackage: false, isMonthlyProduct: false, excludeDiscount: false, status: ProductStatus.OnSale, sort: 30,
    createTime: '2026-03-15 00:00:00',
  },
  {
    id: 7, name: '保湿水光面膜10片装', categoryId: 11, brand: '美研社', mainImage: `${imgBase}/p7/400/400`,
    images: [`${imgBase}/p7/400/400`],
    description: '玻尿酸+神经酰胺，深层补水，敏感肌可用。10片/盒。',
    isGiftPackage: false, isMonthlyProduct: true, excludeDiscount: false, status: ProductStatus.OnSale, sort: 12,
    createTime: '2026-04-01 00:00:00',
  },
  {
    id: 8, name: '益生菌固体饮料', categoryId: 21, brand: '健康源', mainImage: `${imgBase}/p8/400/400`,
    images: [`${imgBase}/p8/400/400`],
    description: '6种益生菌株，每袋300亿CFU，调理肠道健康。20袋/盒。',
    isGiftPackage: false, isMonthlyProduct: true, excludeDiscount: false, status: ProductStatus.OffSale, sort: 13,
    createTime: '2026-04-10 00:00:00',
  },
]

// ============ 文件资产 ============
/** 预置资产分组（含自动归组规则：matchRules 匹配扩展名/类型，上传时自动归入） */
export const mockFileAssetGroups: FileAssetGroup[] = [
  { id: 1, name: '礼包素材', matchRules: 'gift', icon: 'gift', createTime: '2026-01-01 09:00:00' },
  { id: 2, name: '商品图片', matchRules: 'jpg,png,jpeg,webp', icon: 'picture', createTime: '2026-01-01 09:00:00' },
  { id: 3, name: '介绍视频', matchRules: 'video', icon: 'video', createTime: '2026-01-01 09:00:00' },
  { id: 4, name: '宣传物料', matchRules: '', icon: 'megaphone', createTime: '2026-03-01 09:00:00' },
]

export const mockFileAssets: FileAsset[] = [
  { id: 1, name: '金卡礼包主图.jpg', url: `${imgBase}/gift1/800/800`, thumbUrl: `${imgBase}/gift1/200/200`, type: FileAssetType.Image, size: 256000, width: 800, height: 800, mimeType: 'image/jpeg', usedCount: 2, createTime: '2026-01-01 10:00:00', groupId: 1 },
  { id: 2, name: '银卡礼包主图.jpg', url: `${imgBase}/gift2/800/800`, thumbUrl: `${imgBase}/gift2/200/200`, type: FileAssetType.Image, size: 212000, width: 800, height: 800, mimeType: 'image/jpeg', usedCount: 1, createTime: '2026-01-01 10:05:00', groupId: 1 },
  { id: 3, name: '焕颜精华套装-1.jpg', url: `${imgBase}/p3/800/800`, thumbUrl: `${imgBase}/p3/200/200`, type: FileAssetType.Image, size: 189000, width: 800, height: 800, mimeType: 'image/jpeg', usedCount: 1, createTime: '2026-02-01 11:00:00', groupId: 2 },
  { id: 4, name: '焕颜精华套装-2.jpg', url: `${imgBase}/p3b/800/800`, thumbUrl: `${imgBase}/p3b/200/200`, type: FileAssetType.Image, size: 176000, width: 800, height: 800, mimeType: 'image/jpeg', usedCount: 0, createTime: '2026-02-01 11:10:00', groupId: 2 },
  { id: 5, name: '胶原蛋白肽-1.jpg', url: `${imgBase}/p4/800/800`, thumbUrl: `${imgBase}/p4/200/200`, type: FileAssetType.Image, size: 198000, width: 800, height: 800, mimeType: 'image/jpeg', usedCount: 1, createTime: '2026-02-10 12:00:00', groupId: 2 },
  { id: 6, name: '丝绸眼罩-藏青.jpg', url: `${imgBase}/p5/800/800`, thumbUrl: `${imgBase}/p5/200/200`, type: FileAssetType.Image, size: 145000, width: 800, height: 800, mimeType: 'image/jpeg', usedCount: 1, createTime: '2026-03-01 09:00:00', groupId: 2 },
  { id: 7, name: '蓝牙耳机-白色.jpg', url: `${imgBase}/p6/800/800`, thumbUrl: `${imgBase}/p6/200/200`, type: FileAssetType.Image, size: 223000, width: 800, height: 800, mimeType: 'image/jpeg', usedCount: 1, createTime: '2026-03-15 10:00:00', groupId: 2 },
  { id: 8, name: '蓝牙耳机-黑色.jpg', url: `${imgBase}/p6b/800/800`, thumbUrl: `${imgBase}/p6b/200/200`, type: FileAssetType.Image, size: 221000, width: 800, height: 800, mimeType: 'image/jpeg', usedCount: 0, createTime: '2026-03-15 10:30:00', groupId: null },
  { id: 9, name: '水光面膜10片装.jpg', url: `${imgBase}/p7/800/800`, thumbUrl: `${imgBase}/p7/200/200`, type: FileAssetType.Image, size: 167000, width: 800, height: 800, mimeType: 'image/jpeg', usedCount: 1, createTime: '2026-04-01 11:00:00', groupId: 2 },
  { id: 10, name: '益生菌固体饮料.jpg', url: `${imgBase}/p8/800/800`, thumbUrl: `${imgBase}/p8/200/200`, type: FileAssetType.Image, size: 154000, width: 800, height: 800, mimeType: 'image/jpeg', usedCount: 1, createTime: '2026-04-10 12:00:00', groupId: null },
  { id: 11, name: '金卡礼包介绍视频.mp4', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', thumbUrl: `${imgBase}/video1/400/300`, type: FileAssetType.Video, size: 4200000, width: 1280, height: 720, duration: 15, mimeType: 'video/mp4', usedCount: 0, createTime: '2026-01-05 10:00:00', groupId: 3 },
  { id: 12, name: '银卡礼包介绍视频.mp4', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', thumbUrl: `${imgBase}/video2/400/300`, type: FileAssetType.Video, size: 3800000, width: 1280, height: 720, duration: 12, mimeType: 'video/mp4', usedCount: 0, createTime: '2026-01-05 10:30:00', groupId: 3 },
]

// ============ 商品 SKU ============
export const mockSkus: ProductSKU[] = [
  { id: 1, spuId: 1, skuName: '金卡大礼包', specInfo: {}, price: 9800, costPrice: 2940, stock: 999, stockLocked: 0, status: ProductStatus.OnSale },
  { id: 2, spuId: 2, skuName: '银卡大礼包', specInfo: {}, price: 5800, costPrice: 1740, stock: 999, stockLocked: 0, status: ProductStatus.OnSale },
  { id: 3, spuId: 3, skuName: '焕颜精华套装-标准装', specInfo: { 规格: '标准装' }, price: 399, costPrice: 120, stock: 500, stockLocked: 12, status: ProductStatus.OnSale },
  { id: 4, spuId: 3, skuName: '焕颜精华套装-豪华装', specInfo: { 规格: '豪华装' }, price: 599, costPrice: 180, stock: 300, stockLocked: 5, status: ProductStatus.OnSale },
  { id: 5, spuId: 4, skuName: '胶原蛋白肽-单瓶', specInfo: { 规格: '150g' }, price: 299, costPrice: 90, stock: 800, stockLocked: 20, status: ProductStatus.OnSale },
  { id: 6, spuId: 4, skuName: '胶原蛋白肽-三瓶装', specInfo: { 规格: '150g×3' }, price: 799, costPrice: 250, stock: 200, stockLocked: 8, status: ProductStatus.OnSale },
  { id: 7, spuId: 5, skuName: '丝绸眼罩-藏青', specInfo: { 颜色: '藏青' }, price: 89, costPrice: 30, stock: 1000, stockLocked: 0, status: ProductStatus.OnSale },
  { id: 8, spuId: 5, skuName: '丝绸眼罩-香槟金', specInfo: { 颜色: '香槟金' }, price: 89, costPrice: 30, stock: 600, stockLocked: 0, status: ProductStatus.OnSale },
  { id: 9, spuId: 6, skuName: '蓝牙耳机-白色', specInfo: { 颜色: '白色' }, price: 299, costPrice: 100, stock: 300, stockLocked: 15, status: ProductStatus.OnSale },
  { id: 10, spuId: 6, skuName: '蓝牙耳机-黑色', specInfo: { 颜色: '黑色' }, price: 299, costPrice: 100, stock: 300, stockLocked: 10, status: ProductStatus.OnSale },
  { id: 11, spuId: 7, skuName: '水光面膜10片装', specInfo: {}, price: 129, costPrice: 40, stock: 1200, stockLocked: 30, status: ProductStatus.OnSale },
  { id: 12, spuId: 8, skuName: '益生菌固体饮料', specInfo: { 规格: '20袋/盒' }, price: 199, costPrice: 65, stock: 0, stockLocked: 0, status: ProductStatus.OffSale },
]

// ============ 大礼包 ============
export const mockGiftPackages: GiftPackage[] = [
  {
    id: 1, name: '金卡尊享大礼包', spuId: 1, price: 9800, level: MemberLevel.Gold, status: ProductStatus.OnSale,
    items: [
      { id: 1, packageId: 1, skuId: 3, skuName: '焕颜精华套装-豪华装', quantity: 2, unitPrice: 599 },
      { id: 2, packageId: 1, skuId: 6, skuName: '胶原蛋白肽-三瓶装', quantity: 3, unitPrice: 799 },
      { id: 3, packageId: 1, skuId: 11, skuName: '水光面膜10片装', quantity: 5, unitPrice: 129 },
    ],
  },
  {
    id: 2, name: '银卡优选大礼包', spuId: 2, price: 5800, level: MemberLevel.Silver, status: ProductStatus.OnSale,
    items: [
      { id: 4, packageId: 2, skuId: 4, skuName: '焕颜精华套装-标准装', quantity: 2, unitPrice: 399 },
      { id: 5, packageId: 2, skuId: 5, skuName: '胶原蛋白肽-单瓶', quantity: 3, unitPrice: 299 },
      { id: 6, packageId: 2, skuId: 11, skuName: '水光面膜10片装', quantity: 3, unitPrice: 129 },
    ],
  },
]

// ============ 订单 ============
export const mockOrders: Order[] = [
  {
    id: 1, orderNo: 'SFGP20260110100001', memberId: 1, orderType: OrderType.GiftPackage,
    totalAmount: 9800, discountAmount: 0, couponAmount: 0, shippingFee: 0, payAmount: 9800,
    memberLevel: MemberLevel.Normal, payType: 1, payTime: '2026-01-10 10:00:00', status: OrderStatus.Completed,
    receiverName: '张伟', receiverPhone: '138****1111', receiverAddress: '广东省深圳市南山区科技园路1号',
    logisticsCompany: '顺丰速运', logisticsNo: 'SF1234567890', shipTime: '2026-01-10 18:00:00',
    confirmTime: '2026-01-12 10:00:00', inviterId: null, remark: null, createTime: '2026-01-10 09:55:00',
    items: [
      { id: 1, orderId: 1, skuId: 1, skuName: '金卡尊享大礼包', quantity: 1, originalPrice: 9800, memberPrice: 9800, unitPrice: 9800, totalPrice: 9800, discountAmount: 0, sourceType: 1, resellOrderId: null },
    ],
  },
  {
    id: 2, orderNo: 'SFRT20260305143002', memberId: 5, orderType: OrderType.Retail,
    totalAmount: 399, discountAmount: 0, couponAmount: 0, shippingFee: 10, payAmount: 409,
    memberLevel: MemberLevel.Normal, payType: 1, payTime: '2026-03-05 14:35:00', status: OrderStatus.Completed,
    receiverName: '陈静', receiverPhone: '138****5555', receiverAddress: '北京市朝阳区建国路88号',
    logisticsCompany: '中通快递', logisticsNo: 'ZT9876543210', shipTime: '2026-03-05 20:00:00',
    confirmTime: '2026-03-08 09:00:00', inviterId: 1, remark: null, createTime: '2026-03-05 14:30:00',
    items: [
      { id: 2, orderId: 2, skuId: 3, skuName: '焕颜精华套装-标准装', quantity: 1, originalPrice: 399, memberPrice: 399, unitPrice: 399, totalPrice: 399, discountAmount: 0, sourceType: 1, resellOrderId: null },
    ],
  },
  {
    id: 3, orderNo: 'SFRT20260620110003', memberId: 1, orderType: OrderType.Retail,
    totalAmount: 428, discountAmount: 85.6, couponAmount: 0, shippingFee: 0, payAmount: 342.4,
    memberLevel: MemberLevel.Gold, payType: 2, payTime: '2026-06-20 11:05:00', status: OrderStatus.Shipped,
    receiverName: '张伟', receiverPhone: '138****1111', receiverAddress: '广东省深圳市南山区科技园路1号',
    logisticsCompany: '顺丰速运', logisticsNo: 'SF1111222233', shipTime: '2026-06-20 16:00:00',
    confirmTime: null, inviterId: null, remark: null, createTime: '2026-06-20 11:00:00',
    items: [
      { id: 3, orderId: 3, skuId: 9, skuName: '蓝牙耳机-白色', quantity: 1, originalPrice: 299, memberPrice: 239.2, unitPrice: 239.2, totalPrice: 239.2, discountAmount: 59.8, sourceType: 1, resellOrderId: null },
      { id: 4, orderId: 3, skuId: 7, skuName: '丝绸眼罩-藏青', quantity: 1, originalPrice: 89, memberPrice: 71.2, unitPrice: 71.2, totalPrice: 71.2, discountAmount: 17.8, sourceType: 1, resellOrderId: null },
    ],
  },
  {
    id: 4, orderNo: 'SFRT20260824120004', memberId: 3, orderType: OrderType.Retail,
    totalAmount: 129, discountAmount: 12.9, couponAmount: 0, shippingFee: 10, payAmount: 126.1,
    memberLevel: MemberLevel.Silver, payType: 1, payTime: '2026-08-24 12:05:00', status: OrderStatus.PaidPendingShip,
    receiverName: '王芳', receiverPhone: '138****3333', receiverAddress: '上海市浦东新区张江路100号',
    logisticsCompany: null, logisticsNo: null, shipTime: null, confirmTime: null,
    inviterId: 2, remark: '请尽快发货', createTime: '2026-08-24 12:00:00',
    items: [
      { id: 5, orderId: 4, skuId: 11, skuName: '水光面膜10片装', quantity: 1, originalPrice: 129, memberPrice: 116.1, unitPrice: 116.1, totalPrice: 116.1, discountAmount: 12.9, sourceType: 1, resellOrderId: null },
    ],
  },
  {
    id: 5, orderNo: 'SFRT20260823101005', memberId: 2, orderType: OrderType.Retail,
    totalAmount: 299, discountAmount: 0, couponAmount: 0, shippingFee: 10, payAmount: 309,
    memberLevel: MemberLevel.Gold, payType: 1, payTime: '2026-08-23 10:15:00', status: OrderStatus.Refunding,
    receiverName: '李娜', receiverPhone: '138****2222', receiverAddress: '浙江省杭州市西湖区文三路200号',
    logisticsCompany: '圆通速递', logisticsNo: 'YT5555666677', shipTime: '2026-08-23 15:00:00',
    confirmTime: null, inviterId: 1, remark: '申请退款：商品有瑕疵', createTime: '2026-08-23 10:10:00',
    items: [
      { id: 6, orderId: 5, skuId: 5, skuName: '胶原蛋白肽-单瓶', quantity: 1, originalPrice: 299, memberPrice: 299, unitPrice: 299, totalPrice: 299, discountAmount: 0, sourceType: 1, resellOrderId: null },
    ],
  },
]

// ============ 月度领货 ============
export const mockCredits: MonthlyCredit[] = [
  {
    id: 1, memberId: 1, memberLevel: MemberLevel.Gold, packageId: 1, month: '2026-08',
    creditAmount: 980, usedAmount: 399, remainAmount: 581, resellableAmount: 581, status: CreditStatus.PartialUsed,
    expireTime: '2026-08-31 23:59:59', createTime: '2026-08-01 00:00:00',
  },
  {
    id: 2, memberId: 2, memberLevel: MemberLevel.Gold, packageId: 1, month: '2026-08',
    creditAmount: 980, usedAmount: 0, remainAmount: 980, resellableAmount: 980, status: CreditStatus.Unused,
    expireTime: '2026-08-31 23:59:59', createTime: '2026-08-01 00:00:00',
  },
  {
    id: 3, memberId: 3, memberLevel: MemberLevel.Silver, packageId: 2, month: '2026-08',
    creditAmount: 580, usedAmount: 580, remainAmount: 0, resellableAmount: 0, status: CreditStatus.UsedUp,
    expireTime: '2026-08-31 23:59:59', createTime: '2026-08-01 00:00:00',
  },
  {
    id: 4, memberId: 4, memberLevel: MemberLevel.Silver, packageId: 2, month: '2026-08',
    creditAmount: 580, usedAmount: 129, remainAmount: 451, resellableAmount: 451, status: CreditStatus.PartialUsed,
    expireTime: '2026-08-31 23:59:59', createTime: '2026-08-01 00:00:00',
  },
]

// ============ 转卖 ============
export const mockResellOrders: ResellOrder[] = [
  {
    id: 1, resellNo: 'RS20260815001', memberId: 1, creditId: 1, skuId: 3, skuName: '焕颜精华套装-标准装',
    quantity: 1, goodsValue: 399, serviceFee: 79.8, shippingFee: 10, settleAmount: 309.2,
    status: ResellStatus.Completed, matchOrderId: 2, matchTime: '2026-08-16 10:00:00',
    settleTime: '2026-08-18 14:00:00', cancelTime: null, createTime: '2026-08-15 09:00:00',
  },
  {
    id: 2, resellNo: 'RS20260820002', memberId: 2, creditId: 2, skuId: 11, skuName: '水光面膜10片装',
    quantity: 2, goodsValue: 258, serviceFee: 51.6, shippingFee: 10, settleAmount: 196.4,
    status: ResellStatus.PendingMatch, matchOrderId: null, matchTime: null,
    settleTime: null, cancelTime: null, createTime: '2026-08-20 15:00:00',
  },
  {
    id: 3, resellNo: 'RS20260822003', memberId: 4, creditId: 4, skuId: 5, skuName: '胶原蛋白肽-单瓶',
    quantity: 1, goodsValue: 299, serviceFee: 59.8, shippingFee: 10, settleAmount: 229.2,
    status: ResellStatus.Matching, matchOrderId: null, matchTime: null,
    settleTime: null, cancelTime: null, createTime: '2026-08-22 11:00:00',
  },
]

// ============ 佣金 ============
export const mockCommissions: Commission[] = [
  {
    id: 1, commissionNo: 'CM20260110100001', memberId: 1, sourceMemberId: 2, sourceOrderId: 0,
    orderAmount: 9800, packageLevel: MemberLevel.Gold, distributionLevel: 1, rate: 15, amount: 1470,
    status: CommissionStatus.Available, settleTime: '2026-01-19 10:00:00', rollbackReason: null,
    createTime: '2026-01-10 10:00:00',
  },
  {
    id: 2, commissionNo: 'CM20260320110002', memberId: 1, sourceMemberId: 3, sourceOrderId: 0,
    orderAmount: 5800, packageLevel: MemberLevel.Silver, distributionLevel: 2, rate: 3, amount: 174,
    status: CommissionStatus.Withdrawn, settleTime: '2026-03-27 11:00:00', rollbackReason: null,
    createTime: '2026-03-20 11:00:00',
  },
  {
    id: 3, commissionNo: 'CM20260401120003', memberId: 1, sourceMemberId: 4, sourceOrderId: 0,
    orderAmount: 5800, packageLevel: MemberLevel.Silver, distributionLevel: 3, rate: 1, amount: 58,
    status: CommissionStatus.PendingSettle, settleTime: null, rollbackReason: null,
    createTime: '2026-04-01 12:00:00',
  },
  {
    id: 4, commissionNo: 'CM20260601130004', memberId: 1, sourceMemberId: 7, sourceOrderId: 0,
    orderAmount: 9800, packageLevel: MemberLevel.Gold, distributionLevel: 1, rate: 15, amount: 1470,
    status: CommissionStatus.Available, settleTime: '2026-06-08 13:00:00', rollbackReason: null,
    createTime: '2026-06-01 13:00:00',
  },
  {
    id: 5, commissionNo: 'CM20260601130005', memberId: 2, sourceMemberId: 7, sourceOrderId: 0,
    orderAmount: 9800, packageLevel: MemberLevel.Gold, distributionLevel: 2, rate: 5, amount: 490,
    status: CommissionStatus.PendingSettle, settleTime: null, rollbackReason: null,
    createTime: '2026-06-01 13:00:00',
  },
]

// ============ 提现 ============
export const mockWithdraws: Withdraw[] = [
  {
    id: 1, withdrawNo: 'WD20260120100001', memberId: 1, amount: 500, fee: 0, actualAmount: 500,
    payType: 0, bankName: '招商银行', bankCard: '6225****1234', bankHolder: '张伟',
    alipayName: '', alipayAccount: '', status: WithdrawStatus.Paid,
    auditTime: '2026-01-21 10:00:00', auditOperator: '财务-王', auditRemark: null,
    payTime: '2026-01-22 15:00:00', payTransactionNo: 'T20260122150001', createTime: '2026-01-20 10:00:00',
  },
  {
    id: 2, withdrawNo: 'WD20260824140002', memberId: 1, amount: 1470, fee: 0, actualAmount: 1470,
    payType: 0, bankName: '招商银行', bankCard: '6225****1234', bankHolder: '张伟',
    alipayName: '', alipayAccount: '', status: WithdrawStatus.PendingAudit,
    auditTime: null, auditOperator: null, auditRemark: null,
    payTime: null, payTransactionNo: null, createTime: '2026-08-24 14:30:00',
  },
]

// ============ 钱包 ============
export const mockWallets: MemberWallet[] = [
  { id: 1, memberId: 1, balance: 1528, frozen: 1528, totalIncome: 3170, totalWithdraw: 500, updateTime: '2026-08-24 14:30:00' },
  { id: 2, memberId: 2, balance: 490, frozen: 490, totalIncome: 490, totalWithdraw: 0, updateTime: '2026-06-01 13:00:00' },
]

// ============ 配置 ============
export const mockLevelConfigs: LevelBenefitConfig[] = [
  { id: 1, level: 1, levelName: '银卡代理商', levelSort: 1, entryAmount: 5800, shopDiscount: 90, monthlyCredit: 580, creditMonths: 10, resellFeeRate: 20, consumptionCreditRate: 0, consumptionCreditMonths: 0, consumptionResellable: 0, status: ProductStatus.OnSale },
  { id: 2, level: 2, levelName: '金卡代理商', levelSort: 2, entryAmount: 9800, shopDiscount: 80, monthlyCredit: 980, creditMonths: 10, resellFeeRate: 20, consumptionCreditRate: 0, consumptionCreditMonths: 0, consumptionResellable: 0, status: ProductStatus.OnSale },
  { id: 3, level: 3, levelName: '铂金代理商', levelSort: 3, entryAmount: 19800, shopDiscount: 70, monthlyCredit: 1980, creditMonths: 12, resellFeeRate: 18, consumptionCreditRate: 0, consumptionCreditMonths: 0, consumptionResellable: 0, status: ProductStatus.OnSale },
  { id: 4, level: 4, levelName: '钻石代理商', levelSort: 4, entryAmount: 39800, shopDiscount: 60, monthlyCredit: 3980, creditMonths: 12, resellFeeRate: 15, consumptionCreditRate: 0, consumptionCreditMonths: 0, consumptionResellable: 0, status: ProductStatus.OnSale },
]

export const mockCommissionConfigs: CommissionRuleConfig[] = [
  { id: 1, packageLevel: MemberLevel.Silver, distributionLevel: 1, rate: 10, status: ProductStatus.OnSale },
  { id: 2, packageLevel: MemberLevel.Silver, distributionLevel: 2, rate: 3, status: ProductStatus.OnSale },
  { id: 3, packageLevel: MemberLevel.Silver, distributionLevel: 3, rate: 1, status: ProductStatus.OnSale },
  { id: 4, packageLevel: MemberLevel.Gold, distributionLevel: 1, rate: 15, status: ProductStatus.OnSale },
  { id: 5, packageLevel: MemberLevel.Gold, distributionLevel: 2, rate: 5, status: ProductStatus.OnSale },
  { id: 6, packageLevel: MemberLevel.Gold, distributionLevel: 3, rate: 2, status: ProductStatus.OnSale },
]

export const mockSystemConfigs: SystemConfig[] = [
  { id: 1, configKey: 'credit.expire_policy', configValue: 'void', configGroup: 'credit', description: '领货逾期处理策略（void作废/extend顺延/autoresell自动转卖）', updateTime: '2026-01-01 00:00:00', updateOperator: '系统' },
  { id: 2, configKey: 'credit.start_day', configValue: '1', configGroup: 'credit', description: '领货周期起始日', updateTime: '2026-01-01 00:00:00', updateOperator: '系统' },
  { id: 3, configKey: 'resell.timeout_days', configValue: '30', configGroup: 'resell', description: '转卖匹配超时天数', updateTime: '2026-01-01 00:00:00', updateOperator: '系统' },
  { id: 4, configKey: 'resell.timeout_policy', configValue: 'fallback', configGroup: 'resell', description: '转卖超时处理策略', updateTime: '2026-01-01 00:00:00', updateOperator: '系统' },
  { id: 5, configKey: 'resell.shipping_fee', configValue: '10', configGroup: 'resell', description: '转卖快递费（元）', updateTime: '2026-01-01 00:00:00', updateOperator: '系统' },
  { id: 6, configKey: 'discount.stackable', configValue: 'false', configGroup: 'discount', description: '会员折扣与促销是否可叠加', updateTime: '2026-01-01 00:00:00', updateOperator: '系统' },
  { id: 7, configKey: 'withdraw.min_amount', configValue: '10', configGroup: 'withdraw', description: '最低提现金额（元）', updateTime: '2026-01-01 00:00:00', updateOperator: '系统' },
  { id: 8, configKey: 'withdraw.fee_rate', configValue: '0', configGroup: 'withdraw', description: '提现手续费率%', updateTime: '2026-01-01 00:00:00', updateOperator: '系统' },
  { id: 9, configKey: 'commission.settle_days', configValue: '7', configGroup: 'commission', description: '佣金结算天数（确认收货后N天）', updateTime: '2026-01-01 00:00:00', updateOperator: '系统' },
]

// ============ 看板数据 ============
export const mockDashboardStats: DashboardStats = {
  totalMembers: 8,
  totalAgents: 6,
  todayOrders: 1,
  todayRevenue: 126.1,
  totalCommission: 3170,
  pendingWithdraw: 1,
  activeResellOrders: 2,
  monthlyCreditUsage: 65.5,
}

export const mockDashboardTrends: DashboardTrend[] = Array.from({ length: 14 }, (_, i) => {
  const date = new Date(2026, 7, 24 - 13 + i)
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`
  return {
    date: dateStr,
    revenue: Math.round(Math.random() * 5000 + 1000),
    orders: Math.round(Math.random() * 15 + 2),
    newMembers: Math.round(Math.random() * 5),
  }
})
