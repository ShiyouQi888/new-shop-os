<template>
  <div class="sf-page">
    <SfPageContainer title="佣金记录" description="查看所有分销佣金记录，支持详情追溯">
      <div class="sf-card">
        <div class="sf-search-bar">
          <div class="sf-search-item">
            <span class="sf-search-label">分销层级</span>
            <el-select v-model="filters.distributionLevel" placeholder="全部" clearable style="width: 150px">
              <el-option label="一级（直接推荐）" :value="1" />
              <el-option label="二级（间推）" :value="2" />
              <el-option label="三级" :value="3" />
            </el-select>
          </div>
          <div class="sf-search-item">
            <span class="sf-search-label">状态</span>
            <el-select v-model="filters.status" placeholder="全部" clearable style="width: 130px">
              <el-option v-for="(label, val) in CommissionStatusLabels" :key="val" :label="label" :value="Number(val)" />
            </el-select>
          </div>
          <el-button type="primary" :icon="Search" @click="search">筛选</el-button>
          <el-button :icon="RefreshLeft" @click="resetSearch">重置</el-button>
        </div>
      </div>
      <div class="sf-card">
        <el-table :data="list" v-loading="loading" stripe>
          <el-table-column label="佣金单号" prop="commissionNo" min-width="200" show-overflow-tooltip />
          <el-table-column label="获得者" min-width="140">
            <template #default="{ row }">
              <div class="member-cell">
                <el-avatar :size="28" :src="memberAvatar(row.memberId)" />
                <div>
                  <div class="member-name">{{ memberName(row.memberId) }}</div>
                  <div class="member-id">ID: {{ row.memberId }}</div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="来源会员" min-width="120">
            <template #default="{ row }">{{ memberName(row.sourceMemberId) }}（ID: {{ row.sourceMemberId }}）</template>
          </el-table-column>
          <el-table-column label="礼包等级" min-width="110">
            <template #default="{ row }"><SfLevelTag :level="row.packageLevel" /></template>
          </el-table-column>
          <el-table-column label="分销层级" min-width="100">
            <template #default="{ row }">
              <el-tag :type="distLevelTag(row.distributionLevel)" size="small" effect="light">
                {{ ['一级', '二级', '三级'][row.distributionLevel - 1] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="订单金额" width="100">
            <template #default="{ row }"><SfPriceTag :value="row.orderAmount" /></template>
          </el-table-column>
          <el-table-column label="比例" width="70">
            <template #default="{ row }">{{ row.rate }}%</template>
          </el-table-column>
          <el-table-column label="佣金金额" width="110">
            <template #default="{ row }"><SfPriceTag :value="row.amount" size="large" /></template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="commissionStatusTag(row.status)" size="small" effect="light">
                {{ CommissionStatusLabels[row.status as CommissionStatus] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" prop="createTime" min-width="160" />
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row as Commission)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="sf-pagination">
          <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
            layout="total, prev, pager, next, jumper" background @current-change="load" />
        </div>
      </div>
    </SfPageContainer>

    <!-- 佣金详情弹窗 -->
    <el-dialog v-model="detailVisible" title="佣金详情" width="520px">
      <template v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="佣金单号" :span="2">{{ current.commissionNo }}</el-descriptions-item>
          <el-descriptions-item label="获得者">{{ memberName(current.memberId) }}（ID: {{ current.memberId }}）</el-descriptions-item>
          <el-descriptions-item label="来源会员">{{ memberName(current.sourceMemberId) }}（ID: {{ current.sourceMemberId }}）</el-descriptions-item>
          <el-descriptions-item label="礼包等级"><SfLevelTag :level="current.packageLevel" /></el-descriptions-item>
          <el-descriptions-item label="分销层级">{{ ['一级', '二级', '三级'][current.distributionLevel - 1] }}</el-descriptions-item>
          <el-descriptions-item label="订单金额">¥{{ current.orderAmount.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="佣金比例">{{ current.rate }}%</el-descriptions-item>
          <el-descriptions-item label="佣金金额">
            <span class="price-red">¥{{ current.amount.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="commissionStatusTag(current.status)" size="small">{{ CommissionStatusLabels[current.status] }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ current.createTime }}</el-descriptions-item>
          <el-descriptions-item label="结算时间">{{ current.settleTime || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="current.rollbackReason" label="回滚原因" :span="2">{{ current.rollbackReason }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, RefreshLeft } from '@element-plus/icons-vue'
import { apiCommission, apiMember } from '@/api'
import { type Commission, type CommissionStatus, type Member, CommissionStatusLabels } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import { loadLevelMap } from '@/utils/level'
import SfLevelTag from '@/components/SfLevelTag.vue'
import SfPriceTag from '@/components/SfPriceTag.vue'

const loading = ref(false)
const list = ref<Commission[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ distributionLevel: '' as number | '', status: '' as CommissionStatus | '' })
const members = ref<Member[]>([])

const detailVisible = ref(false)
const current = ref<Commission | null>(null)

const distLevelTag = (level: number) => {
  const map: Record<number, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = { 1: 'danger', 2: 'warning', 3: 'info' }
  return map[level] || 'info'
}
const commissionStatusTag = (status: number) => {
  const map: Record<number, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = { 0: 'warning', 1: 'success', 2: 'info', 3: 'danger', 4: 'info' }
  return map[status] || 'info'
}

const memberName = (id: number) => members.value.find(m => m.id === id)?.nickname || `会员${id}`
const memberAvatar = (id: number) => members.value.find(m => m.id === id)?.avatar || ''

const load = async () => {
  loading.value = true
  try {
    const res = await apiCommission.getList({ page: page.value, pageSize: pageSize.value, ...filters })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}
const search = () => { page.value = 1; load() }
const resetSearch = () => { filters.distributionLevel = ''; filters.status = ''; search() }

const openDetail = (row: Commission) => {
  current.value = row
  detailVisible.value = true
}

onMounted(async () => {
  loadLevelMap()
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
  color: #626A73;
}
.price-red {
  color: #FF6B35;
  font-weight: 600;
}
</style>
