import type { RouteRecordRaw } from 'vue-router'

const Layout = () => import('@/layouts/MainLayout.vue')

export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { hidden: true },
  },
  {
    path: '/dashboard',
    component: Layout,
    meta: { title: '仪表盘', icon: 'Odometer' },
    redirect: '/dashboard/index',
    children: [
      {
        path: 'index',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/Index.vue'),
        meta: { hidden: true },
      },
    ],
  },
  {
    path: '/product',
    component: Layout,
    meta: { title: '商城管理', icon: 'Goods' },
    children: [
      {
        path: 'list',
        name: 'ProductList',
        component: () => import('@/views/product/ProductList.vue'),
        meta: { title: '商品管理', icon: 'Goods' },
      },
      {
        path: 'category',
        name: 'ProductCategory',
        component: () => import('@/views/product/CategoryList.vue'),
        meta: { title: '商品分类', icon: 'Files' },
      },
      {
        path: 'gift-package',
        name: 'GiftPackage',
        component: () => import('@/views/product/GiftPackageList.vue'),
        meta: { title: '大礼包管理', icon: 'Present' },
      },
    ],
  },
  {
    path: '/order',
    component: Layout,
    meta: { title: '订单管理', icon: 'Document' },
    children: [
      {
        path: 'list',
        name: 'OrderList',
        component: () => import('@/views/order/OrderList.vue'),
        meta: { title: '订单列表', icon: 'Document' },
      },
    ],
  },
  {
    path: '/member',
    component: Layout,
    meta: { title: '会员管理', icon: 'User' },
    children: [
      {
        path: 'list',
        name: 'MemberList',
        component: () => import('@/views/member/MemberList.vue'),
        meta: { title: '会员列表', icon: 'User' },
      },
      {
        path: 'agent',
        name: 'AgentList',
        component: () => import('@/views/member/AgentList.vue'),
        meta: { title: '代理商管理', icon: 'Avatar' },
      },
    ],
  },
  {
    path: '/distribution',
    component: Layout,
    meta: { title: '分销管理', icon: 'Share' },
    children: [
      {
        path: 'relation',
        name: 'DistributionRelation',
        component: () => import('@/views/distribution/RelationList.vue'),
        meta: { title: '分销关系', icon: 'Share' },
      },
      {
        path: 'commission-rule',
        name: 'CommissionRule',
        component: () => import('@/views/distribution/CommissionRule.vue'),
        meta: { title: '佣金规则配置', icon: 'Setting' },
      },
      {
        path: 'commission-list',
        name: 'CommissionList',
        component: () => import('@/views/distribution/CommissionList.vue'),
        meta: { title: '佣金记录', icon: 'Money' },
      },
      {
        path: 'withdraw',
        name: 'WithdrawList',
        component: () => import('@/views/distribution/WithdrawList.vue'),
        meta: { title: '提现管理', icon: 'Wallet' },
      },
    ],
  },
  {
    path: '/benefit',
    component: Layout,
    meta: { title: '权益规则配置', icon: 'Medal' },
    children: [
      {
        path: 'level',
        name: 'LevelBenefit',
        component: () => import('@/views/benefit/LevelBenefitConfig.vue'),
        meta: { title: '等级权益配置', icon: 'Medal' },
      },
      {
        path: 'credit',
        name: 'CreditRule',
        component: () => import('@/views/benefit/CreditRuleConfig.vue'),
        meta: { title: '领货规则配置', icon: 'Calendar' },
      },
      {
        path: 'resell',
        name: 'ResellRule',
        component: () => import('@/views/benefit/ResellRuleConfig.vue'),
        meta: { title: '转卖规则配置', icon: 'Refresh' },
      },
      {
        path: 'global',
        name: 'GlobalConfig',
        component: () => import('@/views/benefit/GlobalConfig.vue'),
        meta: { title: '全局参数', icon: 'Tools' },
      },
    ],
  },
  {
    path: '/credit',
    component: Layout,
    meta: { title: '月度领货管理', icon: 'Calendar' },
    children: [
      {
        path: 'list',
        name: 'CreditList',
        component: () => import('@/views/credit/CreditList.vue'),
        meta: { title: '领货权益列表', icon: 'Calendar' },
      },
    ],
  },
  {
    path: '/resell',
    component: Layout,
    meta: { title: '转卖管理', icon: 'RefreshRight' },
    children: [
      {
        path: 'list',
        name: 'ResellList',
        component: () => import('@/views/resell/ResellList.vue'),
        meta: { title: '转卖单列表', icon: 'RefreshRight' },
      },
    ],
  },
  {
    path: '/finance',
    component: Layout,
    meta: { title: '财务管理', icon: 'Coin' },
    children: [
      {
        path: 'overview',
        name: 'FinanceOverview',
        component: () => import('@/views/finance/FinanceOverview.vue'),
        meta: { title: '资金总览', icon: 'Coin' },
      },
    ],
  },
  {
    path: '/system',
    component: Layout,
    meta: { title: '系统设置', icon: 'Setting' },
    children: [
      {
        path: 'admin',
        name: 'SystemAdmin',
        component: () => import('@/views/system/SystemAdmin.vue'),
        meta: { title: '管理员管理', icon: 'UserFilled' },
      },
      {
        path: 'log',
        name: 'SystemLog',
        component: () => import('@/views/system/SystemLog.vue'),
        meta: { title: '日志与审计', icon: 'Tickets' },
      },
    ],
  },
  {
    path: '/file',
    component: Layout,
    meta: { title: '文件管理', icon: 'Picture' },
    children: [
      {
        path: 'asset',
        name: 'FileAssetList',
        component: () => import('@/views/file/FileAssetList.vue'),
        meta: { title: '文件资产', icon: 'Picture' },
      },
    ],
  },
]
