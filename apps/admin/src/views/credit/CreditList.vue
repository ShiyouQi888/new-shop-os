<template>
  <div class="sf-page">
    <SfPageContainer title="领货权益列表" description="查看代理商月度领货权益使用情况，可调整额度">
      <div class="sf-card">
        <div class="sf-search-bar">
          <div class="sf-search-item">
            <span class="sf-search-label">状态</span>
            <el-select v-model="filters.status" placeholder="全部" clearable style="width: 130px">
              <el-option v-for="(label, val) in CreditStatusLabels" :key="val" :label="label" :value="Number(val)" />
            </el-select>
          </div>
          <div class="sf-search-item">
            <span class="sf-search-label">月份</span>
            <el-date-picker v-model="filters.month" type="month" placeholder="选择月份" value-format="YYYY-MM" style="width: 140px" />
          </div>
          <div class="sf-search-item">
            <span class="sf-search-label">关键词</span>
            <el-input v-model="filters.keyword" placeholder="会员ID/昵称" clearable style="width: 180px" @keyup.enter="search" />
          </div>
          <el-button type="primary" :icon="Search" @click="search">搜索</el-button>
          <el-button :icon="RefreshLeft" @click="resetSearch">重置</el-button>
        </div>
      </div>

      <div class="sf-card">
        <el-table :data="list" v-loading="loading" stripe>
          <el-table-column label="会员" min-width="160">
            <template #default="{ row }">
              <div class="member-cell">
                <el-avatar :size="30" :src="memberAvatar(row.memberId)" />
                <div>
                  <div class="member-name">{{ memberName(row.memberId) }}</div>
                  <div class="member-id">ID: {{ row.memberId }}</div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="代理商等级" min-width="110">
            <template #default="{ row }"><SfLevelTag :level="row.memberLevel" /></template>
          </el-table-column>
          <el-table-column label="月份" prop="month" min-width="90" />
          <el-table-column label="本月额度" min-width="100">
            <template #default="{ row }"><SfPriceTag :value="row.creditAmount" /></template>
          </el-table-column>
          <el-table-column label="已用" min-width="90">
            <template #default="{ row }"><SfPriceTag :value="row.usedAmount" /></template>
          </el-table-column>
          <el-table-column label="剩余" min-width="90">
            <template #default="{ row }"><SfPriceTag :value="row.remainAmount" /></template>
          </el-table-column>
          <el-table-column label="使用进度" min-width="150">
            <template #default="{ row }">
              <el-progress :percentage="row.creditAmount > 0 ? Math.round(row.usedAmount / row.creditAmount * 100) : 0"
                :color="progressColor(row as MonthlyCredit)" :stroke-width="8" />
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="creditStatusTag(row.status)" size="small" effect="light">
                {{ CreditStatusLabels[row.status as CreditStatus] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="到期时间" prop="expireTime" min-width="160" />
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openAdjust(row as MonthlyCredit)">调整额度</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="sf-pagination">
          <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
            layout="total, prev, pager, next, jumper" background @current-change="load" />
        </div>
      </div>
    </SfPageContainer>

    <!-- 调整额度弹窗 -->
    <el-dialog v-model="adjustVisible" title="调整领货额度" width="440px">
      <el-form label-width="90px">
        <el-form-item label="会员">
          <span>{{ memberName(current?.memberId ?? 0) }}（ID: {{ current?.memberId }}）</span>
        </el-form-item>
        <el-form-item label="当前额度">
          <span>¥{{ current?.creditAmount }}</span>
        </el-form-item>
        <el-form-item label="调整方式">
          <el-radio-group v-model="adjustForm.mode">
            <el-radio value="add">增加额度</el-radio>
            <el-radio value="reduce">扣减额度</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="调整金额" required>
          <el-input-number v-model="adjustForm.amount" :min="1" :precision="0" style="width: 180px" />
          <span class="unit">元</span>
        </el-form-item>
        <el-form-item label="调整原因">
          <el-input v-model="adjustForm.reason" type="textarea" :rows="3" placeholder="请输入调整原因（留档审计）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="primary" :loading="acting" @click="confirmAdjust">确认调整</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { apiCredit, apiMember } from '@/api'
import { type MonthlyCredit, type CreditStatus, type Member, CreditStatusLabels } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfLevelTag from '@/components/SfLevelTag.vue'
import SfPriceTag from '@/components/SfPriceTag.vue'

const loading = ref(false)
const acting = ref(false)
const list = ref<MonthlyCredit[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ status: '' as CreditStatus | '', month: '', keyword: '' })
const members = ref<Member[]>([])

const adjustVisible = ref(false)
const current = ref<MonthlyCredit | null>(null)
const adjustForm = reactive({ mode: 'add', amount: 100, reason: '' })

const creditStatusTag = (status: number) => {
  const map: Record<number, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = { 0: 'warning', 1: 'info', 2: 'success', 3: 'info', 4: 'danger' }
  return map[status] || 'info'
}
const progressColor = (row: MonthlyCredit) => {
  if (row.status === 3) return '#909399'
  if (row.status === 2) return '#39b54a'
  const pct = row.creditAmount > 0 ? row.usedAmount / row.creditAmount : 0
  return pct > 0.8 ? '#e54d42' : '#409eff'
}

const memberName = (id: number) => members.value.find(m => m.id === id)?.nickname || `会员${id}`
const memberAvatar = (id: number) => members.value.find(m => m.id === id)?.avatar || ''

const load = async () => {
  loading.value = true
  try {
    const res = await apiCredit.getList({ page: page.value, pageSize: pageSize.value, ...filters })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const search = () => { page.value = 1; load() }
const resetSearch = () => { filters.status = ''; filters.month = ''; filters.keyword = ''; search() }

const openAdjust = (row: MonthlyCredit) => {
  current.value = row
  adjustForm.mode = 'add'
  adjustForm.amount = 100
  adjustForm.reason = ''
  adjustVisible.value = true
}

const confirmAdjust = async () => {
  const delta = adjustForm.mode === 'add' ? adjustForm.amount : -adjustForm.amount
  if (!adjustForm.reason) {
    ElMessage.warning('请输入调整原因')
    return
  }
  acting.value = true
  try {
    await apiCredit.adjust(current.value!.id, delta, adjustForm.reason)
    ElMessage.success(`已${adjustForm.mode === 'add' ? '增加' : '扣减'}额度 ¥${adjustForm.amount}`)
    adjustVisible.value = false
    load()
  } finally {
    acting.value = false
  }
}

onMounted(async () => {
  const res = await apiMember.getList({ page: 1, pageSize: 100 })
  members.value = res.list
  load()
})
</script>

<style scoped>
.member-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.member-name {
  font-size: 13px;
  font-weight: 500;
}
.member-id {
  font-size: 12px;
  color: #909399;
}
.unit {
  margin-left: 6px;
  color: #606266;
  font-size: 13px;
}
</style>
