<template>
  <div class="sf-page">
    <SfPageContainer title="客服工单" description="统一处理前台会员提交的订单、售后、佣金与提现问题">
      <div class="sf-card">
        <div class="sf-search-bar">
          <div class="sf-search-item">
            <span class="sf-search-label">状态</span>
            <el-select v-model="filters.status" placeholder="全部" clearable style="width: 130px">
              <el-option v-for="(label, val) in statusLabels" :key="val" :label="label" :value="Number(val)" />
            </el-select>
          </div>
          <div class="sf-search-item">
            <span class="sf-search-label">类型</span>
            <el-select v-model="filters.type" placeholder="全部" clearable style="width: 140px">
              <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
          <div class="sf-search-item">
            <span class="sf-search-label">关键词</span>
            <el-input v-model="filters.keyword" placeholder="工单号/会员/标题/手机号" clearable style="width: 220px" @keyup.enter="search" />
          </div>
          <el-button type="primary" :icon="Search" @click="search">搜索</el-button>
          <el-button :icon="RefreshLeft" @click="resetSearch">重置</el-button>
        </div>
      </div>

      <div class="sf-card">
        <el-table :data="list" v-loading="loading" stripe>
          <el-table-column label="工单号" prop="ticketNo" min-width="180" show-overflow-tooltip />
          <el-table-column label="会员" min-width="140">
            <template #default="{ row }">
              <div class="member-cell">
                <strong>{{ row.memberName || `会员${row.memberId}` }}</strong>
                <span>{{ row.phone || '-' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="100">
            <template #default="{ row }">{{ typeLabel(row.type) }}</template>
          </el-table-column>
          <el-table-column label="标题" prop="title" min-width="200" show-overflow-tooltip />
          <el-table-column label="紧急度" width="100">
            <template #default="{ row }">
              <el-rate :model-value="row.priority" :max="3" disabled size="small" />
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)" effect="light">{{ statusLabels[row.status] }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="处理人" prop="handler" width="100" />
          <el-table-column label="提交时间" prop="createTime" min-width="160" />
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row as WorkOrder)">详情</el-button>
              <el-button v-if="row.status === 0" link type="warning" @click="markProcessing(row as WorkOrder)">处理中</el-button>
              <el-button v-if="row.status !== 3" link type="success" @click="openReply(row as WorkOrder)">回复</el-button>
              <el-button v-if="row.status !== 3" link type="info" @click="closeTicket(row as WorkOrder)">关闭</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="sf-pagination">
          <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
            layout="total, prev, pager, next, jumper" background @current-change="load" />
        </div>
      </div>
    </SfPageContainer>

    <el-dialog v-model="detailVisible" title="工单详情" width="620px">
      <el-descriptions :column="2" border v-if="current">
        <el-descriptions-item label="工单号" :span="2">{{ current.ticketNo }}</el-descriptions-item>
        <el-descriptions-item label="会员">{{ current.memberName || `会员${current.memberId}` }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ current.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ typeLabel(current.type) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTag(current.status)" size="small">{{ statusLabels[current.status] }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="标题" :span="2">{{ current.title }}</el-descriptions-item>
        <el-descriptions-item label="问题描述" :span="2">
          <div class="pre-text">{{ current.content }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="客服回复" :span="2">
          <div class="pre-text">{{ current.replyContent || '-' }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="处理人">{{ current.handler || '-' }}</el-descriptions-item>
        <el-descriptions-item label="处理时间">{{ current.handleTime || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <el-dialog v-model="replyVisible" title="回复工单" width="560px">
      <el-form label-width="84px">
        <el-form-item label="工单标题">
          <span>{{ current?.title }}</span>
        </el-form-item>
        <el-form-item label="回复内容" required>
          <el-input v-model="replyForm.replyContent" type="textarea" :rows="5" maxlength="1000" show-word-limit placeholder="输入给会员的处理结果或补充说明" />
        </el-form-item>
        <el-form-item label="处理状态">
          <el-radio-group v-model="replyForm.status">
            <el-radio :value="2">已回复</el-radio>
            <el-radio :value="3">回复并关闭</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="replyVisible = false">取消</el-button>
        <el-button type="primary" :loading="acting" @click="submitReply">提交回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { Search, RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiWorkOrder, type WorkOrder } from '@/api'
import SfPageContainer from '@/components/SfPageContainer.vue'

const statusLabels: Record<number, string> = { 0: '待处理', 1: '处理中', 2: '已回复', 3: '已关闭' }
const typeOptions = [
  { label: '咨询', value: 'consult' },
  { label: '订单', value: 'order' },
  { label: '售后', value: 'after_sale' },
  { label: '佣金', value: 'commission' },
  { label: '提现', value: 'withdraw' },
  { label: '其他', value: 'other' },
]

const loading = ref(false)
const acting = ref(false)
const list = ref<WorkOrder[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const detailVisible = ref(false)
const replyVisible = ref(false)
const current = ref<WorkOrder | null>(null)
const filters = reactive({ status: '' as number | '', type: '', keyword: '' })
const replyForm = reactive({ replyContent: '', status: 2 })

const typeLabel = (type: string) => typeOptions.find(item => item.value === type)?.label || '其他'
const statusTag = (status: number) => {
  const map: Record<number, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = { 0: 'warning', 1: 'primary', 2: 'success', 3: 'info' }
  return map[status] || 'info'
}

const load = async () => {
  loading.value = true
  try {
    const res = await apiWorkOrder.getList({ page: page.value, pageSize: pageSize.value, ...filters })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const search = () => { page.value = 1; load() }
const resetSearch = () => { filters.status = ''; filters.type = ''; filters.keyword = ''; search() }
const openDetail = (row: WorkOrder) => { current.value = row; detailVisible.value = true }
const openReply = (row: WorkOrder) => {
  current.value = row
  replyForm.replyContent = row.replyContent || ''
  replyForm.status = 2
  replyVisible.value = true
}

const markProcessing = async (row: WorkOrder) => {
  await apiWorkOrder.updateStatus(row.id, 1)
  ElMessage.success('已标记为处理中')
  load()
}

const closeTicket = async (row: WorkOrder) => {
  try {
    await ElMessageBox.confirm(`确认关闭工单「${row.ticketNo}」？`, '关闭工单', { type: 'warning' })
  } catch { return }
  await apiWorkOrder.updateStatus(row.id, 3)
  ElMessage.success('工单已关闭')
  load()
}

const submitReply = async () => {
  if (!current.value) return
  if (!replyForm.replyContent.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  acting.value = true
  try {
    await apiWorkOrder.reply(current.value.id, replyForm.replyContent.trim(), replyForm.status)
    ElMessage.success('回复已提交')
    replyVisible.value = false
    load()
  } finally {
    acting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.member-cell { display: flex; flex-direction: column; line-height: 1.5; }
.member-cell strong { color: #171A1F; font-size: 13px; }
.member-cell span { color: #626A73; font-size: 12px; }
.pre-text { white-space: pre-wrap; line-height: 1.75; color: #626A73; }
</style>
