import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '@/stores/user'

const TabLayout = () => import('@/layouts/TabLayout.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/Register.vue'),
    meta: { title: '注册' },
  },
  {
    // 推广邀请链接：/r/{邀请码} → 注册页并自动带出邀请码
    path: '/r/:inviteCode',
    name: 'RegisterByInvite',
    redirect: (to) => ({ path: '/register', query: { invite: to.params.inviteCode as string } }),
    meta: { title: '注册' },
  },
  {
    path: '/',
    component: TabLayout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/shop/Home.vue'),
        meta: { title: '商城' },
      },
      {
        path: 'category',
        name: 'Category',
        component: () => import('@/views/shop/Category.vue'),
        meta: { title: '分类' },
      },
      {
        path: 'cart',
        name: 'Cart',
        component: () => import('@/views/shop/Cart.vue'),
        meta: { title: '购物车', requiresAuth: true },
      },
      {
        path: 'mine',
        name: 'Mine',
        component: () => import('@/views/common/Mine.vue'),
        meta: { title: '我的', requiresAuth: true },
      },
    ],
  },
  // 商城子页
  {
    path: '/product/:id',
    name: 'ProductDetail',
    component: () => import('@/views/shop/ProductDetail.vue'),
    meta: { title: '商品详情' },
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: () => import('@/views/shop/Checkout.vue'),
    meta: { title: '订单结算', requiresAuth: true },
  },
  {
    path: '/orders',
    name: 'OrderList',
    component: () => import('@/views/shop/OrderList.vue'),
    meta: { title: '我的订单', requiresAuth: true },
  },
  {
    path: '/mine/address',
    name: 'MineAddress',
    component: () => import('@/views/common/AddressList.vue'),
    meta: { title: '收货地址', requiresAuth: true },
  },
  {
    path: '/mine/favorites',
    name: 'MineFavorites',
    component: () => import('@/views/common/Favorites.vue'),
    meta: { title: '我的收藏', requiresAuth: true },
  },
  {
    path: '/mine/history',
    name: 'MineHistory',
    component: () => import('@/views/common/BrowsingHistory.vue'),
    meta: { title: '浏览历史', requiresAuth: true },
  },
  {
    path: '/mine/notifications',
    name: 'MineNotifications',
    component: () => import('@/views/common/Notifications.vue'),
    meta: { title: '消息通知', requiresAuth: true },
  },
  {
    path: '/mine/help',
    name: 'MineHelp',
    component: () => import('@/views/common/HelpCenter.vue'),
    meta: { title: '客服与帮助', requiresAuth: true },
  },
  {
    path: '/mine/work-orders',
    name: 'MineWorkOrders',
    component: () => import('@/views/common/WorkOrderCenter.vue'),
    meta: { title: '我的工单', requiresAuth: true },
  },
  {
    path: '/mine/rules',
    name: 'MineRules',
    component: () => import('@/views/common/RulesCenter.vue'),
    meta: { title: '规则中心', requiresAuth: true },
  },
  {
    path: '/gift-zone',
    name: 'GiftZone',
    component: () => import('@/views/shop/GiftZone.vue'),
    meta: { title: '入会专区', requiresAuth: true },
  },
  // 代理商专属
  {
    path: '/agent',
    name: 'AgentHome',
    component: () => import('@/views/agent/AgentHome.vue'),
    meta: { title: '会员工作台', requiresAuth: true, requiresAgent: true },
  },
  {
    path: '/agent/credit',
    name: 'AgentCredit',
    component: () => import('@/views/agent/MonthlyCredit.vue'),
    // 普通会员购物消费也可累加领货额度（无转卖权），故不限代理商
    meta: { title: '月度领货', requiresAuth: true },
  },
  {
    path: '/agent/credit-pool',
    name: 'AgentCreditPool',
    component: () => import('@/views/agent/CreditRedeem.vue'),
    meta: { title: '领取商品自用', requiresAuth: true },
  },
  {
    path: '/agent/resell',
    name: 'AgentResell',
    component: () => import('@/views/agent/ResellCenter.vue'),
    // 转卖资格由额度来源决定（后台可配置消费所得额度是否支持转卖），故不限代理商身份
    meta: { title: '转卖中心', requiresAuth: true },
  },
  {
    path: '/agent/commission',
    name: 'AgentCommission',
    component: () => import('@/views/agent/MyCommission.vue'),
    meta: { title: '我的佣金', requiresAuth: true, requiresAgent: true },
  },
  {
    path: '/agent/withdraw-account',
    name: 'AgentWithdrawAccount',
    component: () => import('@/views/agent/WithdrawAccount.vue'),
    meta: { title: '提现账号绑定', requiresAuth: true, requiresAgent: true },
  },
  {
    path: '/agent/team',
    name: 'AgentTeam',
    component: () => import('@/views/agent/MyTeam.vue'),
    meta: { title: '我的团队', requiresAuth: true, requiresAgent: true },
  },
  {
    path: '/agent/promote',
    name: 'AgentPromote',
    component: () => import('@/views/agent/PromoteCenter.vue'),
    meta: { title: '推广中心', requiresAuth: true, requiresAgent: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(to => {
  const userStore = useUserStore()
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    showToast('请先登录')
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAgent && !userStore.isAgent) {
    showToast('购买入会礼包后可使用代理商功能')
    return { path: '/gift-zone', query: { redirect: to.fullPath } }
  }
})

export default router
