<template>
  <div class="work-page page-shell">
    <van-nav-bar title="我的工单" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <main class="work-body">
      <section class="work-hero">
        <span>SUPPORT TICKET</span>
        <h1>提交问题，跟进处理进度</h1>
        <p>订单、售后、佣金、提现等问题都会进入后台客服队列。</p>
      </section>

      <section class="submit-card premium-card">
        <div class="card-title">新建工单</div>
        <van-field v-model="form.title" label="标题" placeholder="例如：提现迟迟未到账" maxlength="60" />
        <van-field label="类型">
          <template #input>
            <van-radio-group v-model="form.type" direction="horizontal" class="type-group">
              <van-radio v-for="item in typeOptions" :key="item.value" :name="item.value">{{ item.label }}</van-radio>
            </van-radio-group>
          </template>
        </van-field>
        <van-field label="紧急度">
          <template #input>
            <van-rate v-model="form.priority" :count="3" :color="currentTheme.primary" void-icon="star" />
          </template>
        </van-field>
        <van-field
          v-model="form.content"
          rows="5"
          autosize
          type="textarea"
          label="描述"
          placeholder="请写清订单号、提现单号或遇到的问题，便于客服快速定位。"
          maxlength="1000"
          show-word-limit
        />
        <van-button block round :color="currentTheme.primary" :loading="submitting" loading-text="提交中..." @click="submitOrder">
          提交工单
        </van-button>
      </section>

      <section class="list-card premium-card">
        <div class="list-head">
          <div class="card-title">处理记录</div>
          <button type="button" @click="loadOrders">刷新</button>
        </div>
        <div v-for="item in list" :key="item.id" class="ticket-item" @click="openDetail(item)">
          <div class="ticket-main">
            <div class="ticket-title">{{ item.title }}</div>
            <div class="ticket-meta">{{ item.ticketNo }} · {{ typeLabel(item.type) }}</div>
          </div>
          <div class="ticket-side">
            <span :class="['status-pill', `st-${item.status}`]">{{ statusLabel(item.status) }}</span>
            <small>{{ item.createTime }}</small>
          </div>
        </div>
        <van-empty v-if="!list.length" description="暂无工单记录" />
      </section>
    </main>

    <van-popup v-model:show="detailVisible" round position="bottom" :style="{ maxHeight: '78%' }">
      <div class="detail-panel" v-if="current">
        <div class="detail-title">{{ current.title }}</div>
        <div class="detail-meta">{{ current.ticketNo }} · {{ statusLabel(current.status) }}</div>
        <div class="detail-block">
          <span>问题描述</span>
          <p>{{ current.content }}</p>
        </div>
        <div class="detail-block">
          <span>客服回复</span>
          <p>{{ current.replyContent || '客服正在处理中，请稍后查看。' }}</p>
        </div>
        <van-button
          v-if="current.status !== 3"
          block
          round
          plain
          :color="'var(--text-secondary)'"
          :loading="closing"
          @click="closeCurrent"
        >
          关闭工单
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast, showToast } from 'vant'
import { api } from '@/api'
import { currentTheme } from '@/utils/site'

interface WorkOrder {
  id: number
  ticketNo: string
  type: string
  title: string
  content: string
  priority: number
  status: number
  replyContent: string
  createTime: string
}

const router = useRouter()
const submitting = ref(false)
const closing = ref(false)
const detailVisible = ref(false)
const list = ref<WorkOrder[]>([])
const current = ref<WorkOrder | null>(null)
const form = reactive({
  type: 'consult',
  title: '',
  content: '',
  priority: 1,
})

const typeOptions = [
  { label: '咨询', value: 'consult' },
  { label: '订单', value: 'order' },
  { label: '售后', value: 'after_sale' },
  { label: '佣金', value: 'commission' },
  { label: '提现', value: 'withdraw' },
]

const typeLabel = (type: string) => typeOptions.find(item => item.value === type)?.label || '其他'
const statusLabel = (status: number) => ['待处理', '处理中', '已回复', '已关闭'][status] || '未知'

const loadOrders = async () => {
  list.value = await api.getWorkOrders()
}

const submitOrder = async () => {
  if (form.title.trim().length < 2) {
    showToast('请填写工单标题')
    return
  }
  if (form.content.trim().length < 5) {
    showToast('请补充问题描述')
    return
  }
  submitting.value = true
  try {
    await api.createWorkOrder({
      type: form.type,
      title: form.title.trim(),
      content: form.content.trim(),
      priority: form.priority,
    })
    form.title = ''
    form.content = ''
    form.priority = 1
    await loadOrders()
    showSuccessToast('工单已提交')
  } finally {
    submitting.value = false
  }
}

const openDetail = (item: WorkOrder) => {
  current.value = item
  detailVisible.value = true
}

const closeCurrent = async () => {
  if (!current.value) return
  closing.value = true
  try {
    await api.closeWorkOrder(current.value.id)
    await loadOrders()
    current.value.status = 3
    showSuccessToast('工单已关闭')
  } finally {
    closing.value = false
  }
}

onMounted(loadOrders)
</script>

<style scoped>
.work-page { min-height: 100vh; padding-top: 46px; }
.work-body { padding: 12px 14px 28px; }
.work-hero { padding: 22px 18px; border-radius: 20px; color: #fff; background: #171A1F; box-shadow: 0 18px 44px rgba(23, 32, 42, .16); }
.work-hero span { color: var(--color-primary); font-size: 11px; font-weight: 800; }
.work-hero h1 { margin-top: 8px; font-size: 24px; line-height: 1.18; }
.work-hero p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.submit-card, .list-card { padding: 14px; margin-top: 12px; }
.card-title { color: var(--text-primary); font-size: 16px; font-weight: 800; }
.type-group { display: flex; flex-wrap: wrap; gap: 8px 12px; }
.list-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.list-head button { border: 0; background: transparent; color: var(--color-primary); font-weight: 700; }
.ticket-item { display: flex; justify-content: space-between; gap: 10px; padding: 13px 0; border-bottom: 1px solid var(--border-color); }
.ticket-item:last-child { border-bottom: 0; }
.ticket-title { color: var(--text-primary); font-size: 14px; font-weight: 800; }
.ticket-meta { margin-top: 4px; color: var(--text-secondary); font-size: 12px; }
.ticket-side { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; min-width: 86px; }
.ticket-side small { color: var(--text-placeholder); font-size: 10px; }
.status-pill { padding: 4px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; background: var(--color-primary-light); color: var(--color-primary-dark); }
.st-1 { background: #EDF6FF; color: #2563EB; }
.st-2 { background: #ECFDF5; color: #18A66A; }
.st-3 { background: #F2F4F7; color: #626A73; }
.detail-panel { padding: 22px 18px calc(18px + env(safe-area-inset-bottom)); }
.detail-title { color: var(--text-primary); font-size: 18px; font-weight: 800; }
.detail-meta { margin-top: 6px; color: var(--text-placeholder); font-size: 12px; }
.detail-block { margin: 16px 0; padding: 14px; border-radius: 14px; background: var(--bg-muted); }
.detail-block span { color: var(--text-placeholder); font-size: 12px; font-weight: 800; }
.detail-block p { margin-top: 8px; color: var(--text-secondary); line-height: 1.75; white-space: pre-wrap; }
</style>
