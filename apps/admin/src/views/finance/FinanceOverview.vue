<template>
  <div class="sf-page">
    <SfPageContainer title="财务管理大盘" description="订单实收、佣金结算、转卖打款、待发货履约与资金池风险分析" v-loading="loading">
      <section class="finance-hero">
        <div>
          <div class="hero-kicker">CAPITAL POOL</div>
          <h2>资金池余额 ¥{{ money(overview.fundPoolBalance) }}</h2>
          <p>实收 ¥{{ money(overview.cashIn) }}，已分出/打款 ¥{{ money(overview.cashOut) }}，资金风险敞口 ¥{{ money(overview.cashRiskExposure) }}。</p>
        </div>
        <div class="risk-badge" :class="`risk-${overview.riskLevel}`">
          <span>{{ riskText }}</span>
          <strong>缺口 ¥{{ money(overview.riskGap) }}</strong>
        </div>
      </section>

      <div class="finance-grid">
        <article class="metric-card primary">
          <span>会员订单实收</span>
          <strong>¥{{ money(overview.memberOrderIncome) }}</strong>
          <small>{{ overview.memberOrderCount }} 笔会员/零售订单</small>
        </article>
        <article class="metric-card">
          <span>礼包入会实收</span>
          <strong>¥{{ money(overview.giftOrderIncome) }}</strong>
          <small>{{ overview.giftOrderCount }} 笔入会订单</small>
        </article>
        <article class="metric-card warning">
          <span>待发货订单</span>
          <strong>¥{{ money(overview.pendingShipAmount) }}</strong>
          <small>{{ overview.pendingShipCount }} 笔待发货，{{ overview.inTransitCount }} 笔运输中</small>
        </article>
        <article class="metric-card">
          <span>平台净留存</span>
          <strong>¥{{ money(overview.grossProfit) }}</strong>
          <small>扣除佣金、提现、转卖结算后的估算</small>
        </article>
      </div>

      <el-row :gutter="16" class="stat-row">
        <el-col :xs="12" :sm="6">
          <SfStatCard :value="overview.walletBalance" label="会员可提现余额" icon="Wallet" color="#E85222" prefix="¥" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <SfStatCard :value="overview.walletFrozen" label="会员冻结中余额" icon="Lock" color="#626A73" prefix="¥" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <SfStatCard :value="overview.commissionPending" label="待结算佣金" icon="Timer" color="#F5A623" prefix="¥" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <SfStatCard :value="overview.pendingWithdraw" label="待提现打款（含于冻结）" icon="Money" color="#9AA1AA" prefix="¥" />
        </el-col>
      </el-row>

      <el-row :gutter="16" class="stat-row">
        <el-col :xs="12" :sm="6">
          <SfStatCard :value="overview.creditResellableFace" label="可转卖领货额度（原值）" icon="RefreshRight" color="#FF6B35" prefix="¥" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <SfStatCard :value="overview.creditResellableEstimated" label="可转卖额度预计兑付" icon="TrendCharts" color="#E5484D" prefix="¥" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <SfStatCard :value="overview.creditRedeemableLiability" label="仅可领取的额度（履约）" icon="Present" color="#18A66A" prefix="¥" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <SfStatCard :value="overview.resellPendingPayout" label="转卖中待结算" icon="Timer" color="#F5A623" prefix="¥" />
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :xs="24" :lg="14">
          <div class="sf-card">
            <div class="sf-card-title"><el-icon><DataAnalysis /></el-icon> 资金风险拆解</div>
            <div class="risk-panel">
              <div class="risk-meter">
                <div class="meter-head">
                  <span>资金覆盖率</span>
                  <strong :class="`text-${overview.riskLevel}`">{{ coveragePercent }}%</strong>
                </div>
                <div class="meter-track">
                  <div class="meter-fill" :class="`risk-${overview.riskLevel}`" :style="{ width: meterWidth + '%' }"></div>
                  <div class="meter-threshold"></div>
                </div>
                <p>覆盖率 = 资金池余额 ÷ 资金风险敞口；100% 为收支打平线，低于 100% 说明资金池已不足以覆盖近期可能兑现的负债，存在资金缺口；建议维持在 150% 以上。</p>
              </div>

              <div class="risk-items">
                <div v-for="item in cashRiskItems" :key="item.label" class="risk-item">
                  <span>{{ item.label }}</span>
                  <b>¥{{ money(item.value) }}</b>
                </div>
              </div>
            </div>
          </div>

          <div class="sf-card fulfillment-card">
            <div class="sf-card-title"><el-icon><Box /></el-icon> 履约风险（非现金，占用库存/商品成本）</div>
            <div class="risk-items">
              <div v-for="item in fulfillmentItems" :key="item.label" class="risk-item">
                <span>{{ item.label }}</span>
                <b>¥{{ money(item.value) }}</b>
              </div>
              <div class="risk-item total">
                <span>履约风险合计</span>
                <b>¥{{ money(overview.fulfillmentExposure) }}</b>
              </div>
            </div>
            <p class="fulfillment-hint">这部分不会直接消耗资金池现金，但会消耗库存或商品采购成本，需结合库存与供应链能力单独评估，不计入上方资金缺口。</p>
          </div>
        </el-col>

        <el-col :xs="24" :lg="10">
          <div class="sf-card">
            <div class="sf-card-title"><el-icon><TrendCharts /></el-icon> 收支构成</div>
            <div class="flow-chart">
              <div class="flow-bar" v-for="item in flowBars" :key="item.label">
                <div class="flow-label">{{ item.label }}</div>
                <div class="flow-track">
                  <div class="flow-fill" :style="{ width: item.percent + '%', background: item.color }"></div>
                </div>
                <div class="flow-value" :class="item.amount < 0 ? 'text-danger' : 'text-success'">
                  {{ item.amount > 0 ? '+' : '' }}¥{{ money(Math.abs(item.amount)) }}
                </div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>

      <div class="sf-card">
        <div class="sf-card-title"><el-icon><Tickets /></el-icon> 资金流水</div>
        <el-table :data="flowList" border v-loading="flowsLoading">
          <el-table-column label="时间" prop="time" min-width="180" />
          <el-table-column label="类型" width="120">
            <template #default="{ row }">
              <el-tag :type="row.amount > 0 ? 'success' : 'danger'" size="small" effect="light">
                {{ row.type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="描述" prop="desc" min-width="220" show-overflow-tooltip />
          <el-table-column label="金额" width="130">
            <template #default="{ row }">
              <span :class="[row.amount > 0 ? 'text-success' : 'text-danger', 'price-nowrap']">
                {{ row.amount > 0 ? '+' : '' }}¥{{ money(Math.abs(row.amount)) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="余额" width="130">
            <template #default="{ row }"><span class="price-nowrap">¥{{ money(row.balance) }}</span></template>
          </el-table-column>
        </el-table>
        <div class="sf-pagination" v-if="flowTotal > pageSize">
          <el-pagination v-model:current-page="flowPage" :page-size="pageSize" :total="flowTotal"
            layout="total, prev, pager, next" background @current-change="applyFlowPage" />
        </div>
      </div>
    </SfPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Tickets, DataAnalysis, TrendCharts, Box } from '@element-plus/icons-vue'
import { apiFinance } from '@/api'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfStatCard from '@/components/SfStatCard.vue'

const loading = ref(false)
const flowsLoading = ref(false)
const overview = ref({
  totalRevenue: 0, commissionPaid: 0, commissionPending: 0, commissionAvailable: 0, commissionSettledPaid: 0,
  withdrawPaid: 0, pendingWithdraw: 0, resellServiceFee: 0, grossProfit: 0,
  orderCount: 0, memberOrderIncome: 0, memberOrderCount: 0, giftOrderIncome: 0, giftOrderCount: 0,
  pendingShipAmount: 0, pendingShipCount: 0, inTransitAmount: 0, inTransitCount: 0,
  pendingServiceFee: 0, resellPayout: 0, resellPendingPayout: 0, resellActiveCount: 0, resellCompletedCount: 0,
  walletBalance: 0, walletFrozen: 0, walletLiability: 0,
  creditResellableFace: 0, creditResellableEstimated: 0, creditRedeemableLiability: 0, resellFeeRate: 0,
  cashIn: 0, cashOut: 0, fundPoolBalance: 0,
  cashRiskExposure: 0, fulfillmentExposure: 0, riskGap: 0, coverageRatio: 0, riskLevel: 'low',
})

const flowList = ref<Array<{ time: string; type: string; desc: string; amount: number; balance: number }>>([])
const allFlows = ref<typeof flowList.value>([])
const flowPage = ref(1)
const pageSize = 10
const flowTotal = computed(() => allFlows.value.length)

const money = (value: number) => Number(value || 0).toFixed(2)
/** 资金覆盖率：资金池余额 / 资金风险敞口，越高越安全（100% 为打平线） */
const coveragePercent = computed(() => Math.round(Math.min(overview.value.coverageRatio * 100, 999)))
/** 仪表条按 0-150% 映射满格，超过部分视觉上封顶，避免极端值把条形图撑爆 */
const meterWidth = computed(() => Math.min(coveragePercent.value / 150 * 100, 100))
const riskText = computed(() => {
  if (overview.value.riskLevel === 'high') return '资金缺口，需立即关注'
  if (overview.value.riskLevel === 'medium') return '覆盖偏紧，需关注'
  return '健康'
})

const cashRiskItems = computed(() => [
  { label: '会员可提现余额', value: overview.value.walletBalance },
  { label: '会员冻结中余额', value: overview.value.walletFrozen },
  { label: '待结算佣金', value: overview.value.commissionPending },
  { label: '转卖中待结算', value: overview.value.resellPendingPayout },
  { label: `可转卖额度预计兑付（费率${overview.value.resellFeeRate}%）`, value: overview.value.creditResellableEstimated },
])

const fulfillmentItems = computed(() => [
  { label: '待发货订单金额', value: overview.value.pendingShipAmount },
  { label: '仅可领取的领货额度', value: overview.value.creditRedeemableLiability },
])

const flowBars = computed(() => {
  const o = overview.value
  const items = [
    { label: '订单实收', amount: o.totalRevenue, color: '#FF6B35' },
    { label: '转卖服务费', amount: o.resellServiceFee, color: '#18A66A' },
    { label: '佣金应付', amount: -o.commissionPaid, color: '#E85222' },
    { label: '提现打款', amount: -o.withdrawPaid, color: '#626A73' },
    { label: '转卖打款', amount: -o.resellPayout, color: '#F5A623' },
  ]
  const max = Math.max(...items.map(i => Math.abs(i.amount)), 1)
  return items.map(i => ({ ...i, percent: Math.max(Math.round(Math.abs(i.amount) / max * 100), 2) }))
})

const applyFlowPage = () => {
  const start = (flowPage.value - 1) * pageSize
  flowList.value = allFlows.value.slice(start, start + pageSize)
}

onMounted(async () => {
  loading.value = true
  flowsLoading.value = true
  try {
    overview.value = await apiFinance.getOverview()
    allFlows.value = await apiFinance.getFlows()
    applyFlowPage()
  } finally {
    loading.value = false
    flowsLoading.value = false
  }
})
</script>

<style scoped>
.stat-row {
  margin-bottom: 16px;
}
.finance-hero {
  min-height: 156px;
  margin-bottom: 16px;
  padding: 24px;
  border-radius: 18px;
  color: #fff;
  background:
    radial-gradient(circle at 10% 10%, rgba(255, 107, 53, 0.34), transparent 34%),
    linear-gradient(135deg, #171A1F 0%, #29313D 100%);
  display: flex;
  justify-content: space-between;
  gap: 24px;
  box-shadow: 0 22px 60px rgba(17, 24, 39, 0.18);
}
.hero-kicker {
  color: #FFD5C5;
  font-size: 11px;
  font-weight: 800;
}
.finance-hero h2 {
  margin: 10px 0 8px;
  font-size: 34px;
  line-height: 1.15;
}
.finance-hero p {
  margin: 0;
  color: rgba(255,255,255,.72);
  font-size: 14px;
}
.risk-badge {
  min-width: 178px;
  padding: 16px;
  border-radius: 16px;
  align-self: center;
  background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.14);
}
.risk-badge span,
.risk-badge strong {
  display: block;
}
.risk-badge span {
  font-size: 13px;
  color: rgba(255,255,255,.72);
}
.risk-badge strong {
  margin-top: 8px;
  font-size: 20px;
}
.finance-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
.metric-card {
  min-height: 116px;
  padding: 18px;
  border: 1px solid #E7E9ED;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 14px 34px rgba(17, 24, 39, 0.05);
}
.metric-card.primary {
  border-color: #FFD5C5;
  background: #FFF1EB;
}
.metric-card.warning {
  border-color: rgba(245,166,35,.34);
}
.metric-card span,
.metric-card small {
  color: #626A73;
  font-size: 12px;
}
.metric-card strong {
  display: block;
  margin: 10px 0 8px;
  color: #171A1F;
  font-size: 24px;
}
.risk-panel {
  display: grid;
  gap: 18px;
}
.meter-head {
  display: flex;
  justify-content: space-between;
  color: #171A1F;
  font-weight: 800;
}
.meter-track {
  position: relative;
  height: 14px;
  margin: 12px 0 8px;
  border-radius: 999px;
  background: #F8F9FB;
  overflow: hidden;
}
.meter-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}
.meter-threshold {
  position: absolute;
  top: 0;
  left: calc(100% / 1.5);
  width: 2px;
  height: 100%;
  background: rgba(23, 26, 31, 0.28);
}
.risk-low { background: #18A66A; }
.risk-medium { background: #F5A623; }
.risk-high { background: #E5484D; }
.text-low { color: #18A66A; }
.text-medium { color: #F5A623; }
.text-high { color: #E5484D; }
.risk-meter p {
  margin: 0;
  color: #626A73;
  font-size: 12px;
  line-height: 1.6;
}
.risk-items {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.risk-item {
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #F8F9FB;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.risk-item.total {
  grid-column: 1 / -1;
  background: #FFF1EB;
}
.risk-item.total b {
  color: #E85222;
}
.risk-item span {
  color: #626A73;
  font-size: 12px;
}
.risk-item b {
  color: #171A1F;
  font-size: 13px;
}
.fulfillment-card {
  margin-top: 16px;
}
.fulfillment-hint {
  margin: 12px 0 0;
  color: #9AA1AA;
  font-size: 12px;
  line-height: 1.6;
}
.text-success {
  color: #18A66A;
  font-weight: 500;
}
.text-danger {
  color: #FF6B35;
  font-weight: 500;
}
.flow-chart {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 8px 0;
}
.flow-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.flow-label {
  width: 90px;
  font-size: 13px;
  color: #626A73;
  text-align: right;
  flex-shrink: 0;
}
.flow-track {
  flex: 1;
  height: 14px;
  background: #F8F9FB;
  border-radius: 7px;
  overflow: hidden;
}
.flow-fill {
  height: 100%;
  border-radius: 7px;
  transition: width 0.5s ease;
}
.flow-value {
  width: 116px;
  font-size: 13px;
  flex-shrink: 0;
}
@media (max-width: 1180px) {
  .finance-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .finance-hero {
    flex-direction: column;
  }
  .finance-grid,
  .risk-items {
    grid-template-columns: 1fr;
  }
}
</style>
