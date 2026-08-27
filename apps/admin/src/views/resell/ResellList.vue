<template>
  <div class="sf-page">
    <SfPageContainer title="转卖单列表" description="管理所有转卖订单，手动匹配与取消">
      <div class="sf-card">
        <div class="sf-search-bar">
          <div class="sf-search-item">
            <span class="sf-search-label">状态</span>
            <el-select v-model="filters.status" placeholder="全部" clearable style="width: 140px">
              <el-option v-for="(label, val) in ResellStatusLabels" :key="val" :label="label" :value="Number(val)" />
            </el-select>
          </div>
          <div class="sf-search-item">
            <span class="sf-search-label">关键词</span>
            <el-input v-model="filters.keyword" placeholder="转卖单号/商品" clearable style="width: 200px" @keyup.enter="search" />
          </div>
          <el-button type="primary" :icon="Search" @click="search">搜索</el-button>
          <el-button :icon="RefreshLeft" @click="resetSearch">重置</el-button>
        </div>
      </div>

      <div class="sf-card">
        <el-table :data="list" v-loading="loading" stripe>
          <el-table-column label="转卖单号" prop="resellNo" min-width="180" show-overflow-tooltip />
          <el-table-column label="会员ID" prop="memberId" width="90" />
          <el-table-column label="商品" prop="skuName" min-width="160" show-overflow-tooltip />
          <el-table-column label="数量" prop="quantity" width="60" align="center" />
          <el-table-column label="商品价值" min-width="100">
            <template #default="{ row }"><SfPriceTag :value="row.goodsValue" /></template>
          </el-table-column>
          <el-table-column label="服务费" min-width="90">
            <template #default="{ row }"><span class="text-danger price-nowrap">-¥{{ row.serviceFee }}</span></template>
          </el-table-column>
          <el-table-column label="结算金额" width="110">
            <template #default="{ row }"><SfPriceTag :value="row.settleAmount" size="large" /></template>
          </el-table-column>
          <el-table-column label="状态" width="130">
            <template #default="{ row }">
              <el-tag :type="resellStatusTag(row.status)" size="small" effect="light">
                {{ ResellStatusLabels[row.status as ResellStatus] }}
              </el-tag>
              <el-tag v-if="row.status >= 2 && row.autoMatched" type="success" size="small" effect="plain" style="margin-left: 4px">自动</el-tag>
              <el-tag v-else-if="row.status >= 2" type="info" size="small" effect="plain" style="margin-left: 4px">人工</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" prop="createTime" min-width="160" />
          <el-table-column label="操作" width="170" fixed="right">
            <template #default="{ row }">
              <template v-if="row.status === 0 || row.status === 1">
                <el-button v-if="row.status === 0" link type="primary" @click="openMatch(row as ResellOrder)">手动匹配</el-button>
                <el-button link type="danger" @click="cancelResell(row as ResellOrder)">取消</el-button>
              </template>
              <template v-else-if="row.status === 2">
                <el-button link type="success" @click="completeResell(row as ResellOrder)">确认结算</el-button>
                <el-button link type="danger" @click="cancelResell(row as ResellOrder)">取消</el-button>
              </template>
              <el-button v-else link type="primary" @click="openDetail(row as ResellOrder)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="sf-pagination">
          <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
            layout="total, prev, pager, next, jumper" background @current-change="load" />
        </div>
      </div>
    </SfPageContainer>

    <!-- 手动匹配弹窗 -->
    <el-dialog v-model="matchVisible" title="手动匹配转卖单" width="560px">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px"
        title="将转卖单匹配到一笔零售订单，匹配后该转卖单进入「已匹配」状态" />
      <el-form label-width="90px">
        <el-form-item label="转卖单号">
          <span>{{ current?.resellNo }}</span>
        </el-form-item>
        <el-form-item label="转卖商品">
          <span>{{ current?.skuName }} × {{ current?.quantity }}</span>
        </el-form-item>
        <el-form-item label="目标订单" required>
          <el-select v-model="matchOrderId" placeholder="选择一笔待发货的零售订单" style="width: 100%" filterable>
            <el-option v-for="o in matchableOrders" :key="o.id" :label="`${o.orderNo}（${o.receiverName} · ¥${o.payAmount}）`" :value="o.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="matchVisible = false">取消</el-button>
        <el-button type="primary" :loading="acting" @click="confirmMatch">确认匹配</el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="转卖单详情" width="480px">
      <el-descriptions :column="1" border v-if="current">
        <el-descriptions-item label="转卖单号">{{ current.resellNo }}</el-descriptions-item>
        <el-descriptions-item label="会员ID">{{ current.memberId }}</el-descriptions-item>
        <el-descriptions-item label="商品">{{ current.skuName }} × {{ current.quantity }}</el-descriptions-item>
        <el-descriptions-item label="商品价值">¥{{ current.goodsValue.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="服务费">-¥{{ current.serviceFee.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="快递费">¥{{ current.shippingFee.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="结算金额">¥{{ current.settleAmount.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="匹配订单">{{ current.matchOrderId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="匹配方式">{{ current.matchOrderId ? (current.autoMatched ? '系统自动匹配' : '后台人工匹配') : '-' }}</el-descriptions-item>
        <el-descriptions-item label="匹配时间">{{ current.matchTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="结算时间">{{ current.settleTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="取消时间">{{ current.cancelTime || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiResell, apiOrder } from '@/api'
import { type ResellOrder, type ResellStatus, type Order, ResellStatusLabels, OrderStatus } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfPriceTag from '@/components/SfPriceTag.vue'

const loading = ref(false)
const acting = ref(false)
const list = ref<ResellOrder[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ status: '' as ResellStatus | '', keyword: '' })

const matchVisible = ref(false)
const detailVisible = ref(false)
const current = ref<ResellOrder | null>(null)
const matchOrderId = ref<number | undefined>(undefined)
const matchableOrders = ref<Order[]>([])

const resellStatusTag = (status: number) => {
  const map: Record<number, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = { 0: 'warning', 1: 'primary', 2: 'warning', 3: 'success', 4: 'info', 5: 'danger' }
  return map[status] || 'info'
}

const load = async () => {
  loading.value = true
  try {
    const res = await apiResell.getList({ page: page.value, pageSize: pageSize.value, ...filters })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const search = () => { page.value = 1; load() }
const resetSearch = () => { filters.status = ''; filters.keyword = ''; search() }

const openMatch = async (row: ResellOrder) => {
  current.value = row
  matchOrderId.value = undefined
  // 加载可匹配的零售订单（待发货）
  const res = await apiOrder.getList({ page: 1, pageSize: 50, orderType: 1, status: OrderStatus.PaidPendingShip })
  matchableOrders.value = res.list
  matchVisible.value = true
}

const confirmMatch = async () => {
  if (!matchOrderId.value) {
    ElMessage.warning('请选择目标订单')
    return
  }
  acting.value = true
  try {
    await apiResell.manualMatch(current.value!.id, matchOrderId.value)
    ElMessage.success('匹配成功')
    matchVisible.value = false
    load()
  } finally {
    acting.value = false
  }
}

const cancelResell = async (row: ResellOrder) => {
  try {
    await ElMessageBox.confirm(`确认取消转卖单「${row.resellNo}」？取消后转卖权益将退回会员。`, '取消转卖', { type: 'warning' })
  } catch { return }
  acting.value = true
  try {
    await apiResell.cancel(row.id)
    ElMessage.success('已取消')
    load()
  } finally {
    acting.value = false
  }
}

const completeResell = async (row: ResellOrder) => {
  try {
    await ElMessageBox.confirm(`确认结算转卖单「${row.resellNo}」？结算金额将进入会员钱包。`, '确认结算', { type: 'warning' })
  } catch { return }
  acting.value = true
  try {
    await apiResell.complete(row.id)
    ElMessage.success('转卖已完成结算')
    load()
  } finally {
    acting.value = false
  }
}

const openDetail = (row: ResellOrder) => {
  current.value = row
  detailVisible.value = true
}

onMounted(load)
</script>

<style scoped>
.text-danger {
  color: #FF6B35;
}
</style>
