<template>
  <div class="sf-page">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <SfStatCard :value="stats.totalMembers" label="总会员数" icon="User" color="#FF6B35" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <SfStatCard :value="stats.totalAgents" label="代理商数" icon="Avatar" color="#FF6B35" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <SfStatCard :value="stats.todayOrders" label="今日订单" icon="Document" color="#18A66A" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <SfStatCard :value="stats.todayRevenue" label="今日营收" icon="Coin" color="#FF6B35" prefix="¥" />
      </el-col>
    </el-row>

    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <SfStatCard :value="stats.totalCommission" label="累计佣金" icon="Money" color="#E85222" prefix="¥" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <SfStatCard :value="stats.pendingWithdraw" label="待审核提现" icon="Wallet" color="#F5A623" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <SfStatCard :value="stats.activeResellOrders" label="转卖中" icon="RefreshRight" color="#626A73" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <SfStatCard :value="stats.monthlyCreditUsage" label="本月领货使用率" icon="Calendar" color="#18A66A" suffix="%" />
      </el-col>
    </el-row>

    <!-- 趋势图表 -->
    <el-row :gutter="16">
      <el-col :xs="24" :lg="16">
        <div class="sf-card">
          <div class="sf-card-title">
            <el-icon><TrendCharts /></el-icon>
            近14天营收趋势
          </div>
          <div ref="revenueChartRef" class="chart-container"></div>
        </div>
      </el-col>
      <el-col :xs="24" :lg="8">
        <div class="sf-card">
          <div class="sf-card-title">
            <el-icon><PieChart /></el-icon>
            会员构成
          </div>
          <div ref="memberChartRef" class="chart-container"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 业务快捷入口 -->
    <el-row :gutter="16" style="margin-top: 4px;">
      <el-col :span="24">
        <div class="sf-card">
          <div class="sf-card-title">
            <el-icon><Grid /></el-icon>
            快捷操作
          </div>
          <div class="quick-actions">
            <div class="quick-item" v-for="action in quickActions" :key="action.path" @click="router.push(action.path)">
              <el-icon :size="24" :color="action.color"><component :is="action.icon" /></el-icon>
              <span>{{ action.label }}</span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { apiDashboard } from '@/api'
import SfStatCard from '@/components/SfStatCard.vue'

const router = useRouter()
const stats = ref({
  totalMembers: 0, totalAgents: 0, todayOrders: 0, todayRevenue: 0,
  totalCommission: 0, pendingWithdraw: 0, activeResellOrders: 0, monthlyCreditUsage: 0,
  levelDist: [] as { level: number; count: number }[],
})

const revenueChartRef = ref<HTMLElement>()
const memberChartRef = ref<HTMLElement>()
let revenueChart: echarts.ECharts | null = null
let memberChart: echarts.ECharts | null = null

const quickActions = [
  { label: '商品管理', path: '/product/list', icon: 'Goods', color: '#FF6B35' },
  { label: '订单管理', path: '/order/list', icon: 'Document', color: '#18A66A' },
  { label: '会员管理', path: '/member/list', icon: 'User', color: '#FF6B35' },
  { label: '佣金配置', path: '/distribution/commission-rule', icon: 'Setting', color: '#FF6B35' },
  { label: '权益配置', path: '/benefit/level', icon: 'Medal', color: '#E85222' },
  { label: '提现审核', path: '/distribution/withdraw', icon: 'Wallet', color: '#F5A623' },
  { label: '领货管理', path: '/credit/list', icon: 'Calendar', color: '#626A73' },
  { label: '转卖管理', path: '/resell/list', icon: 'RefreshRight', color: '#FF6B35' },
]

onMounted(async () => {
  const data = await apiDashboard.getStats() as (typeof stats.value)
  stats.value = {
    ...data,
    levelDist: (data as unknown as { levelDist?: { level: number; count: number }[] }).levelDist ?? [],
  }

  await nextTick()
  initRevenueChart()
  initMemberChart()
})

onUnmounted(() => {
  revenueChart?.dispose()
  memberChart?.dispose()
  window.removeEventListener('resize', handleResize)
})

const handleResize = () => {
  revenueChart?.resize()
  memberChart?.resize()
}

function initRevenueChart() {
  if (!revenueChartRef.value) return
  revenueChart = echarts.init(revenueChartRef.value)
  const trends = apiDashboard.getTrends()
  trends.then(data => {
    revenueChart!.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['营收(¥)', '订单数'], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
      xAxis: { type: 'category', data: data.map(d => d.date), boundaryGap: false },
      yAxis: [
        { type: 'value', name: '营收(¥)', position: 'left' },
        { type: 'value', name: '订单数', position: 'right' },
      ],
      series: [
        {
          name: '营收(¥)',
          type: 'line',
          smooth: true,
          data: data.map(d => d.revenue),
          itemStyle: { color: '#FF6B35' },
          areaStyle: { color: 'rgba(255, 107, 53, 0.1)' },
        },
        {
          name: '订单数',
          type: 'bar',
          yAxisIndex: 1,
          data: data.map(d => d.orders),
          itemStyle: { color: '#FF6B35', borderRadius: [4, 4, 0, 0] },
        },
      ],
    })
  })
  window.addEventListener('resize', handleResize)
}

function initMemberChart() {
  if (!memberChartRef.value) return
  memberChart = echarts.init(memberChartRef.value)
  // 等级分布来自后端 summary.levelDist（多等级动态）
  const dist = stats.value.levelDist || []
  const countOf = (level: number) => dist.find(d => d.level === level)?.count ?? 0
  const normalCount = stats.value.totalMembers - countOf(1) - countOf(2) - countOf(3) - countOf(4)
  const data = [
    { value: countOf(2), name: '金卡代理商', itemStyle: { color: '#FF6B35' } },
    { value: countOf(1), name: '银卡代理商', itemStyle: { color: '#9AA1AA' } },
    { value: countOf(3), name: '铂金代理商', itemStyle: { color: '#E85222' } },
    { value: countOf(4), name: '钻石代理商', itemStyle: { color: '#626A73' } },
    { value: Math.max(0, normalCount), name: '普通会员', itemStyle: { color: '#FF6B35' } },
  ].filter(d => d.value > 0)
  memberChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: true, formatter: '{b}: {c}人' },
      data,
    }],
  })
}
</script>

<style scoped>
.stat-row {
  margin-bottom: 16px;
}
.chart-container {
  height: 320px;
}
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
}
.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: #F8F9FB;
}
.quick-item:hover {
  background: #FFF1EB;
  transform: translateY(-2px);
}
.quick-item span {
  font-size: 13px;
  color: #626A73;
}
</style>
