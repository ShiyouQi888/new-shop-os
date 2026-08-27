import type { RouteRecordRaw } from 'vue-router'

const Layout = () => import('@/layouts/MainLayout.vue')

export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
    meta: { hidden: true },
  },
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
        meta: { title: '商品管理', icon: 'Goods', permission: 'product:view' },
      },
      {
        path: 'category',
        name: 'ProductCategory',
        component: () => import('@/views/product/CategoryList.vue'),
        meta: { title: '商品分类', icon: 'Files', permission: 'category:edit' },
      },
      {
        path: 'gift-package',
        name: 'GiftPackage',
        component: () => import('@/views/product/GiftPackageList.vue'),
        meta: { title: '大礼包管理', icon: 'Present', permission: 'gift:edit' },
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
        meta: { title: '订单列表', icon: 'Document', permission: 'order:view' },
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
        meta: { title: '会员列表', icon: 'User', permission: 'member:view' },
      },
      {
        path: 'agent',
        name: 'AgentList',
        component: () => import('@/views/member/AgentList.vue'),
        meta: { title: '代理商管理', icon: 'Avatar', permission: 'member:view' },
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
        meta: { title: '分销关系', icon: 'Share', permission: 'relation:view' },
      },
      {
        path: 'commission-rule',
        name: 'CommissionRule',
        component: () => import('@/views/distribution/CommissionRule.vue'),
        meta: { title: '佣金规则配置', icon: 'Setting', permission: 'commission:config' },
      },
      {
        path: 'commission-list',
        name: 'CommissionList',
        component: () => import('@/views/distribution/CommissionList.vue'),
        meta: { title: '佣金记录', icon: 'Money', permission: 'commission:view' },
      },
      {
        path: 'withdraw',
        name: 'WithdrawList',
        component: () => import('@/views/distribution/WithdrawList.vue'),
        meta: { title: '提现管理', icon: 'Wallet', permission: 'withdraw:view' },
      },
      {
        path: 'poster',
        name: 'PosterList',
        component: () => import('@/views/distribution/PosterList.vue'),
        meta: { title: '推广海报管理', icon: 'Picture', permission: 'poster:config' },
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
        meta: { title: '等级权益配置', icon: 'Medal', permission: 'benefit:config' },
      },
      {
        path: 'credit',
        name: 'CreditRule',
        component: () => import('@/views/benefit/CreditRuleConfig.vue'),
        meta: { title: '领货规则配置', icon: 'Calendar', permission: 'benefit:config' },
      },
      {
        path: 'resell',
        name: 'ResellRule',
        component: () => import('@/views/benefit/ResellRuleConfig.vue'),
        meta: { title: '转卖规则配置', icon: 'Refresh', permission: 'benefit:config' },
      },
      {
        path: 'global',
        redirect: '/system/config',
        meta: { hidden: true },
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
        meta: { title: '领货权益列表', icon: 'Calendar', permission: 'credit:view' },
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
        meta: { title: '转卖单列表', icon: 'RefreshRight', permission: 'resell:view' },
      },
    ],
  },
  {
    path: '/service',
    component: Layout,
    meta: { title: '客服中心', icon: 'Service' },
    children: [
      {
        path: 'work-orders',
        name: 'WorkOrderList',
        component: () => import('@/views/service/WorkOrderList.vue'),
        meta: { title: '客服工单', icon: 'Tickets', permission: 'workorder:view' },
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
        meta: { title: '资金总览', icon: 'Coin', permission: 'finance:view' },
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
        meta: { title: '管理员管理', icon: 'UserFilled', permission: 'system:admin' },
      },
      {
        path: 'log',
        name: 'SystemLog',
        component: () => import('@/views/system/SystemLog.vue'),
        meta: { title: '日志与审计', icon: 'Tickets', permission: 'system:log' },
      },
      {
        path: 'role',
        name: 'SystemRole',
        component: () => import('@/views/system/RoleList.vue'),
        meta: { title: '角色权限管理', icon: 'Lock', permission: 'system:admin' },
      },
      {
        path: 'config',
        name: 'SystemConfig',
        component: () => import('@/views/benefit/GlobalConfig.vue'),
        meta: { title: '系统参数', icon: 'Tools', permission: 'system:admin' },
      },
      {
        path: 'payment',
        name: 'PaymentConfig',
        component: () => import('@/views/system/PaymentConfig.vue'),
        meta: { title: '支付配置', icon: 'CreditCard', permission: 'system:admin' },
      },
      {
        path: 'help',
        name: 'HelpDocList',
        component: () => import('@/views/system/HelpDocList.vue'),
        meta: { title: '帮助文档', icon: 'QuestionFilled', permission: 'system:log' },
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
        meta: { title: '文件资产', icon: 'Picture', permission: 'system:file' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
    meta: { hidden: true },
  },
]
