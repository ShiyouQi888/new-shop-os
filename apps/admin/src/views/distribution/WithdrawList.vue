<template>
  <div class="sf-page">
    <SfPageContainer title="提现管理" description="审核提现申请，批量打款">
      <div class="sf-card">
        <div class="sf-search-bar">
          <div class="sf-search-item">
            <span class="sf-search-label">状态</span>
            <el-select v-model="filters.status" placeholder="全部" clearable style="width: 140px">
              <el-option v-for="(label, val) in WithdrawStatusLabels" :key="val" :label="label" :value="Number(val)" />
            </el-select>
          </div>
          <div class="sf-search-item">
            <span class="sf-search-label">关键词</span>
            <el-input v-model="filters.keyword" placeholder="提现单号/会员ID" clearable style="width: 200px" @keyup.enter="search" />
          </div>
          <el-button type="primary" :icon="Search" @click="search">搜索</el-button>
          <el-button :icon="RefreshLeft" @click="resetSearch">重置</el-button>
        </div>
      </div>

      <div class="sf-card">
        <el-table :data="list" v-loading="loading" stripe>
          <el-table-column label="提现单号" prop="withdrawNo" min-width="200" show-overflow-tooltip />
          <el-table-column label="会员ID" prop="memberId" width="90" />
          <el-table-column label="提现金额" width="110">
            <template #default="{ row }"><SfPriceTag :value="row.amount" size="large" /></template>
          </el-table-column>
          <el-table-column label="到账金额" width="110">
            <template #default="{ row }"><SfPriceTag :value="row.actualAmount" /></template>
          </el-table-column>
          <el-table-column label="收款方式" width="100">
            <template #default="{ row }">
              <el-tag size="small" effect="light">{{ row.payType === 1 ? '银行卡' : '微信' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="收款账户" min-width="160">
            <template #default="{ row }">{{ row.bankName }} {{ row.bankCard }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="withdrawStatusTag(row.status)" size="small" effect="light">
                {{ WithdrawStatusLabels[row.status as WithdrawStatus] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="申请时间" prop="createTime" min-width="160" />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <template v-if="row.status === 0">
                <el-button link type="success" @click="audit(row as Withdraw, true)">通过</el-button>
                <el-button link type="danger" @click="openReject(row as Withdraw)">驳回</el-button>
              </template>
              <template v-else-if="row.status === 1">
                <el-button link type="primary" @click="openPay(row as Withdraw)">打款</el-button>
              </template>
              <template v-else>
                <el-button link type="primary" @click="openDetail(row as Withdraw)">详情</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
        <div class="sf-pagination">
          <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
            layout="total, prev, pager, next, jumper" background @current-change="load" />
        </div>
      </div>
    </SfPageContainer>

    <!-- 驳回弹窗 -->
    <el-dialog v-model="rejectVisible" title="驳回提现申请" width="420px">
      <el-form label-width="90px">
        <el-form-item label="提现单号">
          <span>{{ current?.withdrawNo }}</span>
        </el-form-item>
        <el-form-item label="驳回原因">
          <el-input v-model="rejectRemark" type="textarea" :rows="3" placeholder="请输入驳回原因（将展示给会员）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="acting" @click="confirmReject">确认驳回</el-button>
      </template>
    </el-dialog>

    <!-- 打款弹窗 -->
    <el-dialog v-model="payVisible" title="确认打款" width="440px">
      <el-form label-width="90px">
        <el-form-item label="提现单号">
          <span>{{ current?.withdrawNo }}</span>
        </el-form-item>
        <el-form-item label="打款金额">
          <span class="price-red">¥{{ current?.actualAmount }}</span>
        </el-form-item>
        <el-form-item label="收款账户">
          <span>{{ current?.bankName }} {{ current?.bankCard }}</span>
        </el-form-item>
        <el-form-item label="交易流水号">
          <el-input v-model="payTransactionNo" placeholder="留空自动生成" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="payVisible = false">取消</el-button>
        <el-button type="primary" :loading="acting" @click="confirmPay">确认打款</el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="提现详情" width="480px">
      <el-descriptions :column="1" border v-if="current">
        <el-descriptions-item label="提现单号">{{ current.withdrawNo }}</el-descriptions-item>
        <el-descriptions-item label="会员ID">{{ current.memberId }}</el-descriptions-item>
        <el-descriptions-item label="提现金额">¥{{ current.amount.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="手续费">¥{{ current.fee.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="到账金额">¥{{ current.actualAmount.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="收款账户">{{ current.bankName }} {{ current.bankCard }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ current.createTime }}</el-descriptions-item>
        <el-descriptions-item label="审核时间">{{ current.auditTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="审核操作人">{{ current.auditOperator || '-' }}</el-descriptions-item>
        <el-descriptions-item label="审核备注">{{ current.auditRemark || '-' }}</el-descriptions-item>
        <el-descriptions-item label="打款时间">{{ current.payTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="流水号">{{ current.payTransactionNo || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiWithdraw } from '@/api'
import { type Withdraw, type WithdrawStatus, WithdrawStatusLabels } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfPriceTag from '@/components/SfPriceTag.vue'

const loading = ref(false)
const acting = ref(false)
const list = ref<Withdraw[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ status: '' as WithdrawStatus | '', keyword: '' })

const rejectVisible = ref(false)
const payVisible = ref(false)
const detailVisible = ref(false)
const current = ref<Withdraw | null>(null)
const rejectRemark = ref('')
const payTransactionNo = ref('')

const withdrawStatusTag = (status: number) => {
  const map: Record<number, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = { 0: 'warning', 1: 'primary', 2: 'success', 3: 'danger' }
  return map[status] || 'info'
}

const load = async () => {
  loading.value = true
  try {
    const res = await apiWithdraw.getList({ page: page.value, pageSize: pageSize.value, ...filters })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const search = () => { page.value = 1; load() }
const resetSearch = () => { filters.status = ''; filters.keyword = ''; search() }

const audit = async (row: Withdraw, pass: boolean) => {
  if (!pass) { openReject(row); return }
  try {
    await ElMessageBox.confirm(`确认通过提现申请「${row.withdrawNo}」，将转入待打款状态？`, '审核通过', { type: 'warning' })
  } catch { return }
  acting.value = true
  try {
    await apiWithdraw.audit(row.id, true)
    ElMessage.success('已通过审核，待打款')
    load()
  } finally {
    acting.value = false
  }
}

const openReject = (row: Withdraw) => {
  current.value = row
  rejectRemark.value = ''
  rejectVisible.value = true
}

const confirmReject = async () => {
  acting.value = true
  try {
    await apiWithdraw.audit(current.value!.id, false, rejectRemark.value)
    ElMessage.success('已驳回')
    rejectVisible.value = false
    load()
  } finally {
    acting.value = false
  }
}

const openPay = (row: Withdraw) => {
  current.value = row
  payTransactionNo.value = ''
  payVisible.value = true
}

const confirmPay = async () => {
  acting.value = true
  try {
    await apiWithdraw.pay(current.value!.id, payTransactionNo.value)
    ElMessage.success('打款完成')
    payVisible.value = false
    load()
  } finally {
    acting.value = false
  }
}

const openDetail = (row: Withdraw) => {
  current.value = row
  detailVisible.value = true
}

onMounted(load)
</script>

<style scoped>
.price-red {
  color: #e54d42;
  font-weight: 600;
}
</style>
