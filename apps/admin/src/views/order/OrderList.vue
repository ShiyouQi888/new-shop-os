<template>
  <div class="sf-page">
    <SfPageContainer title="订单管理" description="统一管理零售、大礼包、领货、转卖订单">
      <!-- 搜索栏 -->
      <div class="sf-card">
        <div class="sf-search-bar">
          <div class="sf-search-item">
            <span class="sf-search-label">订单号/收货人</span>
            <el-input v-model="filters.keyword" placeholder="搜索订单号/收货人/手机号" clearable style="width: 220px" @keyup.enter="search" />
          </div>
          <div class="sf-search-item">
            <span class="sf-search-label">订单类型</span>
            <el-select v-model="filters.orderType" placeholder="全部" clearable style="width: 120px">
              <el-option v-for="(label, val) in OrderTypeLabels" :key="val" :label="label" :value="Number(val)" />
            </el-select>
          </div>
          <div class="sf-search-item">
            <span class="sf-search-label">订单状态</span>
            <el-select v-model="filters.status" placeholder="全部" clearable style="width: 120px">
              <el-option v-for="(label, val) in OrderStatusLabels" :key="val" :label="label" :value="Number(val)" />
            </el-select>
          </div>
          <el-button type="primary" :icon="Search" @click="search">搜索</el-button>
          <el-button :icon="RefreshLeft" @click="resetSearch">重置</el-button>
          <div class="search-bar-right">
            <el-button :icon="Download" @click="exportOrders" :disabled="!list.length">导出</el-button>
          </div>
        </div>
      </div>

      <!-- 表格 -->
      <div class="sf-card">
        <div v-if="selectedIds.length" class="batch-bar">
          <span>已选 <b class="batch-count">{{ selectedIds.length }}</b> 笔订单</span>
          <el-button type="success" size="small" :icon="Van" @click="openBatchShip" :disabled="!selectedRows.every(r => r.status === 1)">批量发货</el-button>
          <el-button size="small" @click="clearSelection">取消选择</el-button>
        </div>
        <el-table :data="list" v-loading="loading" stripe @selection-change="onSelectionChange">
          <el-table-column type="selection" width="46" :selectable="(row: Order) => row.status === 1" />
          <el-table-column label="订单号" prop="orderNo" min-width="180" show-overflow-tooltip />
          <el-table-column label="类型" width="80">
            <template #default="{ row }">
              <el-tag :type="orderTypeTag(row.orderType)" size="small" effect="light">
                {{ OrderTypeLabels[row.orderType as OrderType] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="会员ID" prop="memberId" width="80" />
          <el-table-column label="收货人" prop="receiverName" min-width="100" />
          <el-table-column label="手机号" prop="receiverPhone" min-width="130" />
          <el-table-column label="商品金额" min-width="100">
            <template #default="{ row }"><SfPriceTag :value="row.totalAmount" /></template>
          </el-table-column>
          <el-table-column label="实付金额" min-width="120">
            <template #default="{ row }"><SfPriceTag :value="row.payAmount" size="large" /></template>
          </el-table-column>
          <el-table-column label="状态" min-width="100">
            <template #default="{ row }">
              <el-tag :type="orderStatusTag(row.status)" size="small" effect="light">
                {{ OrderStatusLabels[row.status as OrderStatus] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="下单时间" prop="createTime" min-width="160" />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="viewDetail(row as Order)">详情</el-button>
              <el-button v-if="row.status === 1" link type="success" @click="openShip(row as Order)">发货</el-button>
              <el-button v-if="row.status === 5" link type="warning" @click="openRefund(row as Order)">退款审核</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="sf-pagination">
          <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
            layout="total, prev, pager, next, jumper" background @current-change="load" />
        </div>
      </div>
    </SfPageContainer>

    <!-- 订单详情 -->
    <el-dialog v-model="detailVisible" title="订单详情" width="700px">
      <el-descriptions :column="2" border v-if="currentOrder">
        <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="订单类型">{{ OrderTypeLabels[currentOrder.orderType] }}</el-descriptions-item>
        <el-descriptions-item label="订单状态">{{ OrderStatusLabels[currentOrder.status] }}</el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ currentOrder.createTime }}</el-descriptions-item>
        <el-descriptions-item label="收货人">{{ currentOrder.receiverName }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ currentOrder.receiverPhone }}</el-descriptions-item>
        <el-descriptions-item label="收货地址" :span="2">{{ currentOrder.receiverAddress }}</el-descriptions-item>
        <el-descriptions-item label="商品总额">¥{{ currentOrder.totalAmount }}</el-descriptions-item>
        <el-descriptions-item label="会员折扣">-¥{{ currentOrder.discountAmount }}</el-descriptions-item>
        <el-descriptions-item label="运费">¥{{ currentOrder.shippingFee }}</el-descriptions-item>
        <el-descriptions-item label="实付金额">
          <span class="price-red">¥{{ currentOrder.payAmount }}</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="currentOrder.logisticsCompany" label="物流公司">{{ currentOrder.logisticsCompany }}</el-descriptions-item>
        <el-descriptions-item v-if="currentOrder.logisticsNo" label="物流单号">{{ currentOrder.logisticsNo }}</el-descriptions-item>
        <el-descriptions-item v-if="currentOrder.remark" label="备注" :span="2">{{ currentOrder.remark }}</el-descriptions-item>
      </el-descriptions>
      <el-table :data="currentOrder?.items || []" style="margin-top: 16px" border>
        <el-table-column label="商品" prop="skuName" min-width="200" />
        <el-table-column label="数量" prop="quantity" width="80" align="center" />
        <el-table-column label="原价" min-width="100">
          <template #default="{ row }"><span class="price-nowrap">¥{{ row.originalPrice }}</span></template>
        </el-table-column>
        <el-table-column label="成交价" min-width="100">
          <template #default="{ row }"><span class="price-nowrap">¥{{ row.unitPrice }}</span></template>
        </el-table-column>
        <el-table-column label="小计" min-width="100">
          <template #default="{ row }"><span class="price-nowrap">¥{{ row.totalPrice }}</span></template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 单笔发货弹窗 -->
    <el-dialog v-model="shipVisible" title="订单发货" width="460px">
      <el-form :model="shipForm" label-width="90px">
        <el-form-item label="订单号">
          <span>{{ shipForm.orderNo }}</span>
        </el-form-item>
        <el-form-item label="物流公司">
          <el-select v-model="shipForm.logisticsCompany" placeholder="选择物流公司" style="width: 100%">
            <el-option v-for="c in logisticsCompanies" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="物流单号">
          <el-input v-model="shipForm.logisticsNo" placeholder="请输入物流单号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipVisible = false">取消</el-button>
        <el-button type="primary" :loading="shipping" @click="confirmShip">确认发货</el-button>
      </template>
    </el-dialog>

    <!-- 批量发货弹窗 -->
    <el-dialog v-model="batchShipVisible" title="批量发货" width="480px">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px"
        :title="`已选 ${selectedIds.length} 笔待发货订单，将为所有订单填写同一物流信息`" />
      <el-form :model="shipForm" label-width="90px">
        <el-form-item label="物流公司">
          <el-select v-model="shipForm.logisticsCompany" placeholder="选择物流公司" style="width: 100%">
            <el-option v-for="c in logisticsCompanies" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="物流单号">
          <el-input v-model="shipForm.logisticsNo" placeholder="请输入物流单号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchShipVisible = false">取消</el-button>
        <el-button type="primary" :loading="shipping" @click="confirmBatchShip">确认批量发货</el-button>
      </template>
    </el-dialog>

    <!-- 退款审核弹窗 -->
    <el-dialog v-model="refundVisible" title="退款审核" width="460px">
      <el-form :model="refundForm" label-width="90px">
        <el-form-item label="订单号">
          <span>{{ refundForm.orderNo }}</span>
        </el-form-item>
        <el-form-item label="退款金额">
          <span class="price-red">¥{{ refundForm.amount }}</span>
        </el-form-item>
        <el-form-item label="申请原因" v-if="refundForm.reason">
          <span>{{ refundForm.reason }}</span>
        </el-form-item>
        <el-form-item label="审核备注">
          <el-input v-model="refundForm.remark" type="textarea" :rows="3" placeholder="填写审核备注（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmRefund(false)">驳回退款</el-button>
        <el-button type="success" @click="confirmRefund(true)">同意退款</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Search, RefreshLeft, Download, Van } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiOrder } from '@/api'
import {
  type Order, OrderType, OrderStatus,
  OrderTypeLabels, OrderStatusLabels,
} from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfPriceTag from '@/components/SfPriceTag.vue'

const loading = ref(false)
const shipping = ref(false)
const list = ref<Order[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', orderType: '' as OrderType | '', status: '' as OrderStatus | '' })

const logisticsCompanies = ['顺丰速运', '中通快递', '圆通速递', '韵达快递', '京东物流', '邮政EMS']

const detailVisible = ref(false)
const currentOrder = ref<Order | null>(null)
const shipVisible = ref(false)
const batchShipVisible = ref(false)
const shipForm = reactive({ orderId: 0, orderNo: '', logisticsCompany: '', logisticsNo: '' })

const refundVisible = ref(false)
const refundForm = reactive({ orderId: 0, orderNo: '', amount: 0, reason: '', remark: '' })

// 多选
const selectedRows = ref<Order[]>([])
const selectedIds = computed(() => selectedRows.value.map(r => r.id))

const orderTypeTag = (type: OrderType) => {
  const map: Record<OrderType, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    [OrderType.Retail]: 'info', [OrderType.GiftPackage]: 'danger', [OrderType.Credit]: 'warning', [OrderType.Resell]: 'success',
  }
  return map[type] || 'info'
}

const orderStatusTag = (status: OrderStatus) => {
  const map: Record<number, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = { 0: 'warning', 1: 'primary', 2: 'primary', 3: 'success', 4: 'info', 5: 'danger', 6: 'info' }
  return map[status] || 'info'
}

const load = async () => {
  loading.value = true
  try {
    const res = await apiOrder.getList({ page: page.value, pageSize: pageSize.value, ...filters })
    list.value = res.list
    total.value = res.total
    selectedRows.value = []
  } finally {
    loading.value = false
  }
}

const search = () => { page.value = 1; load() }
const resetSearch = () => { filters.keyword = ''; filters.orderType = ''; filters.status = ''; search() }

const onSelectionChange = (rows: Order[]) => { selectedRows.value = rows }
const clearSelection = () => { selectedRows.value = [] }

const viewDetail = (row: Order) => {
  currentOrder.value = row
  detailVisible.value = true
}

// ---------- 发货 ----------
const openShip = (row: Order) => {
  shipForm.orderId = row.id
  shipForm.orderNo = row.orderNo
  shipForm.logisticsCompany = ''
  shipForm.logisticsNo = ''
  shipVisible.value = true
}

const confirmShip = async () => {
  if (!shipForm.logisticsCompany || !shipForm.logisticsNo) {
    ElMessage.warning('请填写物流信息')
    return
  }
  shipping.value = true
  try {
    await apiOrder.ship(shipForm.orderId, shipForm.logisticsCompany, shipForm.logisticsNo)
    ElMessage.success('发货成功')
    shipVisible.value = false
    load()
  } finally {
    shipping.value = false
  }
}

const openBatchShip = () => {
  shipForm.logisticsCompany = ''
  shipForm.logisticsNo = ''
  batchShipVisible.value = true
}

const confirmBatchShip = async () => {
  if (!shipForm.logisticsCompany || !shipForm.logisticsNo) {
    ElMessage.warning('请填写物流信息')
    return
  }
  shipping.value = true
  try {
    await apiOrder.batchShip(selectedIds.value, shipForm.logisticsCompany, shipForm.logisticsNo)
    ElMessage.success(`已批量发货 ${selectedIds.value.length} 笔订单`)
    batchShipVisible.value = false
    load()
  } finally {
    shipping.value = false
  }
}

// ---------- 退款审核 ----------
const openRefund = (row: Order) => {
  refundForm.orderId = row.id
  refundForm.orderNo = row.orderNo
  refundForm.amount = row.payAmount
  refundForm.reason = row.remark || ''
  refundForm.remark = ''
  refundVisible.value = true
}

const confirmRefund = async (pass: boolean) => {
  if (!pass) {
    try {
      await ElMessageBox.confirm('驳回后订单将变为已取消状态，且不可恢复，确认驳回？', '驳回退款', { type: 'warning' })
    } catch { return }
  }
  await apiOrder.auditRefund(refundForm.orderId, pass, refundForm.remark)
  ElMessage.success(pass ? '已同意退款' : '已驳回退款')
  refundVisible.value = false
  load()
}

// ---------- 导出 CSV ----------
const exportOrders = () => {
  const headers = ['订单号', '类型', '会员ID', '收货人', '手机号', '收货地址', '商品金额', '折扣', '实付金额', '状态', '下单时间', '物流公司', '物流单号']
  const rows = list.value.map(o => [
    o.orderNo,
    OrderTypeLabels[o.orderType],
    o.memberId,
    o.receiverName,
    o.receiverPhone,
    o.receiverAddress,
    o.totalAmount,
    o.discountAmount,
    o.payAmount,
    OrderStatusLabels[o.status],
    o.createTime,
    o.logisticsCompany || '',
    o.logisticsNo || '',
  ])
  const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `订单列表_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('已导出当前页订单')
}

onMounted(load)
</script>

<style scoped>
.search-bar-right {
  margin-left: auto;
}
.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 12px;
  background: #ecf5ff;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;
}
.batch-count {
  color: #409eff;
  font-size: 16px;
}
.price-red {
  color: #e54d42;
  font-weight: 600;
}
</style>
