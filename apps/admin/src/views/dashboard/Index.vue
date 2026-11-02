<template>
  <div class="sf-page">
    <SfPageContainer title="经营工作台" description="订单履约、资金审核与经营表现一屏掌握" v-loading="loading">
      <template #header>
        <div class="header-actions">
          <span class="updated-at">更新于 {{ updatedAt }}</span>
          <el-button :icon="Refresh" :loading="loading" @click="loadDashboard">刷新数据</el-button>
        </div>
      </template>

      <section class="revenue-hero">
        <div class="revenue-copy">
          <span class="eyebrow">TODAY · {{ todayLabel }}</span>
          <h2>今日实收</h2>
          <div class="revenue-value"><small>¥</small>{{ money(stats.todayRevenue) }}</div>
          <p>按支付成功时间统计，退款申请中的订单仍计入实收；完成退款后从经营实收中扣除。</p>
        </div>
        <div class="hero-stats">
          <div>
            <span>今日下单</span>
            <strong>{{ stats.todayOrders.toLocaleString('zh-CN') }} <small>笔</small></strong>
          </div>
          <div>
            <span>今日新增会员</span>
            <strong>{{ stats.todayMembers.toLocaleString('zh-CN') }} <small>人</small></strong>
          </div>
          <div>
            <span>累计已支付</span>
            <strong>¥{{ money(stats.totalPaid) }}</strong>
          </div>
        </div>
      </section>

      <section class="section-block">
        <div class="section-heading">
          <div>
            <h3>待处理事项</h3>
            <p>按业务风险和履约时效优先处理</p>
          </div>
          <span class="section-caption">{{ pendingTotal }} 项待跟进</span>
        </div>
        <div class="todo-grid">
          <button
            v-for="item in visibleTodos"
            :key="item.path"
            class="todo-card"
            :class="item.tone"
            type="button"
            @click="router.push(item.path)"
          >
            <span class="todo-icon"><el-icon><component :is="item.icon" /></el-icon></span>
            <span class="todo-copy">
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </span>
            <span class="todo-count">{{ item.count }}</span>
            <el-icon class="todo-arrow"><ArrowRight /></el-icon>
          </button>
          <div v-if="visibleTodos.length === 0" class="todo-empty">
            <el-icon><CircleCheck /></el-icon>
            <span>当前没有需要跟进的事项</span>
          </div>
        </div>
      </section>

      <section class="section-block">
        <div class="section-heading">
          <div>
            <h3>经营概览</h3>
            <p>核心规模指标与资金业务量</p>
          </div>
        </div>
        <div class="metric-grid">
          <SfStatCard :value="stats.totalMembers" label="注册会员" icon="User" color="#FF6B35" />
          <SfStatCard :value="stats.totalAgents" label="有效代理商" icon="Avatar" color="#53647A" />
          <SfStatCard :value="stats.totalOrders" label="累计订单" icon="Document" color="#476A8A" />
          <SfStatCard :value="stats.totalCommission" label="佣金总额" icon="Money" color="#B56D32" prefix="¥" />
          <SfStatCard :value="stats.pendingWithdrawAmount" label="待提现审核/打款" icon="Wallet" color="#A25A50" prefix="¥" />
          <SfStatCard :value="stats.activeResellOrders" label="进行中转卖单" icon="RefreshRight" color="#577D70" />
          <SfStatCard :value="stats.monthlyCreditUsage" label="本月领货使用率" icon="Calendar" color="#6C6E98" suffix="%" />
          <SfStatCard :value="stats.pendingPaymentCount" label="待支付订单" icon="Timer" color="#8A7551" />
        </div>
      </section>

      <el-row :gutter="16" class="chart-row">
        <el-col :xs="24" :xl="16">
          <div class="sf-card chart-card">
            <div class="chart-heading">
              <div>
                <h3>近 14 天经营趋势</h3>
                <p>实收按支付时间；订单量按创建时间</p>
              </div>
              <span class="chart-legend"><i class="legend-revenue"></i>实收 <i class="legend-orders"></i>订单</span>
            </div>
            <div ref="revenueChartRef" class="chart-container"></div>
          </div>
        </el-col>
        <el-col :xs="24" :xl="8">
          <div class="sf-card chart-card">
            <div class="chart-heading">
              <div>
                <h3>会员等级构成</h3>
                <p>按当前有效会员等级统计</p>
              </div>
            </div>
            <div ref="memberChartRef" class="chart-container member-chart"></div>
          </div>
        </el-col>
      </el-row>

      <section class="section-block shortcuts-block">
        <div class="section-heading">
          <div>
            <h3>常用管理</h3>
            <p>按当前账号权限展示</p>
          </div>
        </div>
        <div class="shortcut-grid">
          <button v-for="item in visibleShortcuts" :key="item.path" class="shortcut" type="button" @click="router.push(item.path)">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
            <el-icon class="shortcut-arrow"><ArrowRight /></el-icon>
          </button>
        </div>
      </section>
    </SfPageContainer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { apiDashboard, type AdminDashboardStats } from '@/api'
import { getPermissions } from '@/utils/auth'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfStatCard from '@/components/SfStatCard.vue'

const router = useRouter()
const permissions = getPermissions()
const hasPermission = (code: string) => permissions === null || permissions.includes(code)
const loading = ref(false)
const updatedAt = ref('--:--')
const stats = ref<AdminDashboardStats>({
  totalMembers: 0, totalAgents: 0, todayMembers: 0, totalOrders: 0, todayOrders: 0,
  totalPaid: 0, todayRevenue: 0, pendingPaymentCount: 0, pendingShipCount: 0,
  pendingRefundCount: 0, pendingWithdrawCount: 0, pendingWithdrawAmount: 0,
  pendingWorkOrderCount: 0, totalCommission: 0, activeResellOrders: 0,
  monthlyCreditUsage: 0, levelDist: [],
})
const trendRows = ref<Array<{ date: string; revenue: number; orders: number }>>([])
const revenueChartRef = ref<HTMLElement>()
const memberChartRef = ref<HTMLElement>()
let revenueChart: echarts.ECharts | null = null
let memberChart: echarts.ECharts | null = null

const todayLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' }).format(new Date()))
const money = (value: number) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const todoItems = computed(() => [
  { label: '订单待发货', description: '已付款，等待仓库履约', count: stats.value.pendingShipCount, path: '/order/list', permission: 'order:view', icon: 'Van', tone: 'tone-orange' },
  { label: '退款申请', description: '需要审核并确认退款结果', count: stats.value.pendingRefundCount, path: '/order/list', permission: 'order:view', icon: 'Warning', tone: 'tone-red' },
  { label: '提现待审核', description: `${money(stats.value.pendingWithdrawAmount)} 元待审核或打款`, count: stats.value.pendingWithdrawCount, path: '/distribution/withdraw', permission: 'withdraw:view', icon: 'Wallet', tone: 'tone-blue' },
  { label: '客服待处理', description: '待接单或处理中工单', count: stats.value.pendingWorkOrderCount, path: '/service/work-orders', permission: 'workorder:view', icon: 'Service', tone: 'tone-green' },
  { label: '转卖进行中', description: '匹配、履约或结算跟进', count: stats.value.activeResellOrders, path: '/resell/list', permission: 'resell:view', icon: 'RefreshRight', tone: 'tone-violet' },
].filter(item => hasPermission(item.permission)))
const visibleTodos = computed(() => todoItems.value.filter(item => item.count > 0))
const pendingTotal = computed(() => visibleTodos.value.reduce((total, item) => total + item.count, 0))

const shortcuts = [
  { label: '商品管理', path: '/product/list', permission: 'product:view', icon: 'Goods' },
  { label: '订单管理', path: '/order/list', permission: 'order:view', icon: 'Document' },
  { label: '会员管理', path: '/member/list', permission: 'member:view', icon: 'User' },
  { label: '资金总览', path: '/finance/overview', permission: 'finance:view', icon: 'Coin' },
  { label: '佣金记录', path: '/distribution/commission-list', permission: 'commission:view', icon: 'Money' },
  { label: '客服工单', path: '/service/work-orders', permission: 'workorder:view', icon: 'Tickets' },
]
const visibleShortcuts = computed(() => shortcuts.filter(item => hasPermission(item.permission)))

const loadDashboard = async () => {
  loading.value = true
  try {
    const [summary, trends] = await Promise.all([apiDashboard.getStats(), apiDashboard.getTrends(14)])
    stats.value = summary
    trendRows.value = trends
    updatedAt.value = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date())
    await nextTick()
    renderCharts()
  } catch {
    ElMessage.error('经营数据加载失败，请检查服务连接后重试')
  } finally {
    loading.value = false
  }
}

const renderCharts = () => {
  if (revenueChartRef.value) {
    revenueChart?.dispose()
    revenueChart = echarts.init(revenueChartRef.value)
    revenueChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'line' } },
      grid: { left: 14, right: 18, top: 26, bottom: 12, containLabel: true },
      xAxis: {
        type: 'category', data: trendRows.value.map(item => item.date), boundaryGap: true,
        axisTick: { show: false }, axisLine: { lineStyle: { color: '#E5E9EF' } },
        axisLabel: { color: '#7A8492', margin: 12 },
      },
      yAxis: [
        { type: 'value', axisLabel: { color: '#7A8492' }, splitLine: { lineStyle: { color: '#EEF1F4' } } },
        { type: 'value', minInterval: 1, axisLabel: { color: '#7A8492' }, splitLine: { show: false } },
      ],
      series: [
        { name: '实收', type: 'line', yAxisIndex: 0, smooth: 0.25, showSymbol: false, data: trendRows.value.map(item => item.revenue), lineStyle: { width: 3, color: '#F26A3D' }, itemStyle: { color: '#F26A3D' }, areaStyle: { color: 'rgba(242,106,61,.09)' } },
        { name: '订单', type: 'bar', yAxisIndex: 1, data: trendRows.value.map(item => item.orders), barMaxWidth: 20, itemStyle: { color: '#D9E3EA', borderRadius: [4, 4, 0, 0] } },
      ],
    })
  }
  if (memberChartRef.value) {
    memberChart?.dispose()
    memberChart = echarts.init(memberChartRef.value)
    const levels = stats.value.levelDist
    const agentTotal = levels.reduce((sum, item) => sum + Number(item.count || 0), 0)
    const rows = [
      ...levels.map(item => ({ value: item.count, name: `等级 ${item.level}` })),
      { value: Math.max(0, stats.value.totalMembers - agentTotal), name: '普通会员' },
    ].filter(item => item.value > 0)
    memberChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}<br/>{c} 人 · {d}%' },
      color: ['#F26A3D', '#6E8BA1', '#D9A66B', '#8D9B78', '#B7C2CC'],
      legend: { bottom: 4, left: 'center', itemWidth: 8, itemHeight: 8, textStyle: { color: '#737E8B', fontSize: 11 } },
      series: [{ type: 'pie', radius: ['48%', '72%'], center: ['50%', '44%'], minAngle: 4, label: { show: false }, data: rows }],
    })
  }
}

const handleResize = () => {
  revenueChart?.resize()
  memberChart?.resize()
}

onMounted(() => {
  loadDashboard()
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  revenueChart?.dispose()
  memberChart?.dispose()
})
</script>

<style scoped>
.header-actions { display: flex; align-items: center; gap: 12px; }
.updated-at { color: #8A94A1; font-size: 12px; font-variant-numeric: tabular-nums; }
.revenue-hero {
  display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(360px, .75fr); gap: 32px;
  min-height: 210px; margin: 0 0 22px; padding: 28px 32px; border: 1px solid #273440;
  border-radius: 16px; color: #fff; background: linear-gradient(112deg, #202A33 0%, #293743 66%, #35424D 100%);
  box-shadow: 0 16px 36px rgba(31, 43, 53, .13);
}
.revenue-copy { align-self: center; }
.eyebrow { color: #FFB18F; font-size: 11px; font-weight: 700; letter-spacing: .12em; }
.revenue-copy h2 { margin: 10px 0 2px; color: rgba(255,255,255,.78); font-size: 14px; font-weight: 500; }
.revenue-value { font-size: clamp(30px, 3vw, 42px); line-height: 1.16; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -.03em; }
.revenue-value small { margin-right: 5px; font-size: 20px; font-weight: 600; }
.revenue-copy p { max-width: 590px; margin: 12px 0 0; color: rgba(255,255,255,.62); font-size: 12px; line-height: 1.6; }
.hero-stats { display: grid; align-content: center; grid-template-columns: repeat(3, minmax(0, 1fr)); border-left: 1px solid rgba(255,255,255,.13); }
.hero-stats > div { min-width: 0; padding: 6px 18px; }
.hero-stats > div + div { border-left: 1px solid rgba(255,255,255,.13); }
.hero-stats span, .hero-stats strong { display: block; }
.hero-stats span { margin-bottom: 10px; color: rgba(255,255,255,.62); font-size: 12px; white-space: nowrap; }
.hero-stats strong { color: #fff; font-size: 19px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hero-stats strong small { color: rgba(255,255,255,.65); font-size: 11px; font-weight: 500; }
.section-block { margin-bottom: 22px; }
.section-heading, .chart-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 12px; }
.section-heading h3, .chart-heading h3 { margin: 0; color: #202833; font-size: 16px; font-weight: 700; }
.section-heading p, .chart-heading p { margin: 4px 0 0; color: #8A94A1; font-size: 12px; }
.section-caption { color: #8A94A1; font-size: 12px; }
.todo-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.todo-card { min-width: 0; min-height: 92px; display: grid; grid-template-columns: 38px minmax(0, 1fr) auto 14px; align-items: center; gap: 10px; padding: 14px; text-align: left; border: 1px solid #E8ECF0; border-radius: 12px; background: #fff; color: inherit; cursor: pointer; transition: border-color .18s, box-shadow .18s, transform .18s; }
.todo-card:hover { transform: translateY(-2px); border-color: #D7DEE5; box-shadow: 0 9px 20px rgba(27, 39, 51, .07); }
.todo-icon { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 11px; font-size: 18px; }
.tone-orange .todo-icon { color: #E56B3D; background: #FFF1EA; }
.tone-red .todo-icon { color: #C85C50; background: #FBEEEC; }
.tone-blue .todo-icon { color: #527A99; background: #EDF3F7; }
.tone-green .todo-icon { color: #4E806D; background: #EDF5F1; }
.tone-violet .todo-icon { color: #7674A2; background: #F1F0F8; }
.todo-copy { min-width: 0; }
.todo-copy strong, .todo-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.todo-copy strong { color: #313A45; font-size: 13px; font-weight: 650; }
.todo-copy small { margin-top: 5px; color: #929BA6; font-size: 11px; }
.todo-count { min-width: 24px; color: #273541; font-size: 21px; font-weight: 700; font-variant-numeric: tabular-nums; text-align: right; }
.todo-arrow { color: #A3ACB6; font-size: 14px; }
.todo-empty { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 82px; color: #658878; border: 1px solid #E4ECE7; border-radius: 12px; background: #F8FBF9; font-size: 13px; }
.todo-empty .el-icon { font-size: 18px; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.chart-row { margin-bottom: 8px; }
.chart-card { min-height: 368px; padding: 20px; }
.chart-heading { margin-bottom: 8px; }
.chart-container { width: 100%; height: 294px; }
.member-chart { height: 294px; }
.chart-legend { display: flex; align-items: center; gap: 6px; color: #818B97; font-size: 11px; white-space: nowrap; }
.chart-legend i { width: 8px; height: 8px; border-radius: 50%; }
.legend-revenue { background: #F26A3D; }
.legend-orders { background: #D9E3EA; }
.shortcut-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.shortcut { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 0 14px; border: 1px solid #E8ECF0; border-radius: 10px; color: #46515D; background: #fff; font: inherit; text-align: left; cursor: pointer; transition: .18s; }
.shortcut:hover { border-color: #F1B39A; color: #D75E35; background: #FFFAF7; }
.shortcut > .el-icon:first-child { color: #E56B3D; font-size: 17px; }
.shortcut span { flex: 1; font-size: 12px; font-weight: 600; }
.shortcut-arrow { color: #A5ADB7; font-size: 13px; }
@media (max-width: 1200px) {
  .todo-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 768px) {
  .revenue-hero { grid-template-columns: 1fr; gap: 20px; padding: 22px; }
  .hero-stats { border-left: 0; border-top: 1px solid rgba(255,255,255,.13); padding-top: 14px; }
  .hero-stats > div { padding: 6px 10px; }
  .hero-stats > div:first-child { padding-left: 0; }
  .todo-grid, .shortcut-grid { grid-template-columns: 1fr; }
  .metric-grid { gap: 8px; }
  .chart-card { min-height: 330px; padding: 16px; }
  .chart-container, .member-chart { height: 260px; }
  .updated-at { display: none; }
}
</style>
