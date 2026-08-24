<template>
  <div class="sf-page">
    <SfPageContainer title="资金总览" description="平台收入、佣金支出、服务费收入一览" v-loading="loading">
      <el-row :gutter="16" class="stat-row">
        <el-col :xs="12" :sm="6">
          <SfStatCard :value="overview.totalRevenue" label="订单总收入" icon="Coin" color="#e54d42" prefix="¥" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <SfStatCard :value="overview.commissionPaid" label="已提现佣金" icon="Money" color="#f37b1d" prefix="¥" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <SfStatCard :value="overview.resellServiceFee" label="转卖服务费收入" icon="RefreshRight" color="#39b54a" prefix="¥" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <SfStatCard :value="overview.grossProfit" label="平台毛利" icon="TrendCharts" color="#d4a851" prefix="¥" />
        </el-col>
      </el-row>

      <el-row :gutter="16" class="stat-row">
        <el-col :xs="12" :sm="6">
          <SfStatCard :value="overview.withdrawPaid" label="累计打款" icon="Wallet" color="#909399" prefix="¥" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <SfStatCard :value="overview.commissionPending" label="待结算佣金" icon="Timer" color="#409eff" prefix="¥" />
        </el-col>
      </el-row>

      <!-- 资金构成图（简易条形） -->
      <div class="sf-card">
        <div class="sf-card-title"><el-icon><DataAnalysis /></el-icon> 资金构成</div>
        <div class="flow-chart">
          <div class="flow-bar" v-for="item in flowBars" :key="item.label">
            <div class="flow-label">{{ item.label }}</div>
            <div class="flow-track">
              <div class="flow-fill" :style="{ width: item.percent + '%', background: item.color }"></div>
            </div>
            <div class="flow-value" :class="item.amount < 0 ? 'text-danger' : 'text-success'">
              {{ item.amount > 0 ? '+' : '' }}¥{{ Math.abs(item.amount).toFixed(2) }}
            </div>
          </div>
        </div>
      </div>

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
                {{ row.amount > 0 ? '+' : '' }}¥{{ Math.abs(row.amount).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="余额" width="130">
            <template #default="{ row }"><span class="price-nowrap">¥{{ row.balance.toFixed(2) }}</span></template>
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
import { Tickets, DataAnalysis } from '@element-plus/icons-vue'
import { apiFinance } from '@/api'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfStatCard from '@/components/SfStatCard.vue'

const loading = ref(false)
const flowsLoading = ref(false)
const overview = ref({
  totalRevenue: 0, commissionPaid: 0, commissionPending: 0,
  withdrawPaid: 0, resellServiceFee: 0, grossProfit: 0,
})

const flowList = ref<Array<{ time: string; type: string; desc: string; amount: number; balance: number }>>([])
const allFlows = ref<typeof flowList.value>([])
const flowPage = ref(1)
const pageSize = 10
const flowTotal = computed(() => allFlows.value.length)

const applyFlowPage = () => {
  const start = (flowPage.value - 1) * pageSize
  flowList.value = allFlows.value.slice(start, start + pageSize)
}

// 资金构成条形
const flowBars = computed(() => {
  const o = overview.value
  const items = [
    { label: '订单收入', amount: o.totalRevenue, color: '#e54d42' },
    { label: '服务费收入', amount: o.resellServiceFee, color: '#39b54a' },
    { label: '已提现佣金', amount: -o.commissionPaid, color: '#f37b1d' },
    { label: '累计打款', amount: -o.withdrawPaid, color: '#909399' },
  ]
  const max = Math.max(...items.map(i => Math.abs(i.amount)), 1)
  return items.map(i => ({ ...i, percent: Math.max(Math.round(Math.abs(i.amount) / max * 100), 2) }))
})

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
.text-success {
  color: #39b54a;
  font-weight: 500;
}
.text-danger {
  color: #e54d42;
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
  color: #606266;
  text-align: right;
  flex-shrink: 0;
}
.flow-track {
  flex: 1;
  height: 14px;
  background: #f2f3f5;
  border-radius: 7px;
  overflow: hidden;
}
.flow-fill {
  height: 100%;
  border-radius: 7px;
  transition: width 0.5s ease;
}
.flow-value {
  width: 110px;
  font-size: 13px;
  flex-shrink: 0;
}
</style>
