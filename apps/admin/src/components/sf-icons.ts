import type { Component } from 'vue'
import {
  Folder, FolderOpened, Picture, VideoCamera, Promotion, Present,
  Brush, House, Iphone, ShoppingBag, Goods, Wallet, Coin,
  User, TrendCharts, Star, Discount, Ship, Bell, Document,
  Collection, Setting, Headset, DataLine, PriceTag, Apple,
} from '@element-plus/icons-vue'

/**
 * 全局 SVG 图标映射表：key -> Element Plus 图标组件。
 * 系统内所有「图标字段」（分类 icon、文件分组 icon 等）统一存储 key，
 * 通过 SfIcon 组件渲染为专业 SVG 图标；未知 key 回退为文件夹图标。
 */
export const SF_ICON_MAP: Record<string, Component> = {
  folder: Folder,
  'folder-opened': FolderOpened,
  picture: Picture,
  video: VideoCamera,
  megaphone: Promotion,
  gift: Present,
  lipstick: Brush,
  nutrition: Apple,
  home: House,
  device: Iphone,
  shopping: ShoppingBag,
  goods: Goods,
  wallet: Wallet,
  coin: Coin,
  user: User,
  trend: TrendCharts,
  star: Star,
  discount: Discount,
  ship: Ship,
  bell: Bell,
  document: Document,
  collection: Collection,
  setting: Setting,
  headset: Headset,
  data: DataLine,
  price: PriceTag,
}

/** 图标选择器预设（供 SfIconSelect / 表单下拉使用） */
export const SF_ICON_OPTIONS: { value: string; label: string }[] = [
  { value: 'folder', label: '文件夹' },
  { value: 'folder-opened', label: '文件夹(展开)' },
  { value: 'picture', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'megaphone', label: '宣传推广' },
  { value: 'gift', label: '礼包' },
  { value: 'lipstick', label: '美妆护肤' },
  { value: 'nutrition', label: '健康食品' },
  { value: 'home', label: '家居生活' },
  { value: 'device', label: '数码电器' },
  { value: 'shopping', label: '购物袋' },
  { value: 'goods', label: '商品' },
  { value: 'wallet', label: '钱包' },
  { value: 'coin', label: '金币' },
  { value: 'user', label: '用户' },
  { value: 'trend', label: '业绩趋势' },
  { value: 'star', label: '星标' },
  { value: 'discount', label: '折扣' },
  { value: 'ship', label: '物流' },
  { value: 'bell', label: '通知' },
  { value: 'document', label: '文档' },
  { value: 'collection', label: '收藏' },
  { value: 'setting', label: '设置' },
]
