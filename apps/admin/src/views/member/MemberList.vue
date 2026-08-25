<template>
  <div class="sf-page">
    <SfPageContainer title="会员列表" description="管理所有注册会员，按等级、状态筛选">
      <template #header>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增会员</el-button>
      </template>
      <div class="sf-card">
        <div class="sf-search-bar">
          <div class="sf-search-item">
            <span class="sf-search-label">关键词</span>
            <el-input v-model="filters.keyword" placeholder="昵称/手机号/邀请码" clearable style="width: 200px" @keyup.enter="search" />
          </div>
          <div class="sf-search-item">
            <span class="sf-search-label">会员等级</span>
            <el-select v-model="filters.level" placeholder="全部" clearable style="width: 140px">
              <el-option label="普通会员" :value="0" />
              <el-option label="银卡代理商" :value="1" />
              <el-option label="金卡代理商" :value="2" />
            </el-select>
          </div>
          <el-button type="primary" :icon="Search" @click="search">搜索</el-button>
          <el-button :icon="RefreshLeft" @click="resetSearch">重置</el-button>
        </div>
      </div>

      <div class="sf-card">
        <el-table :data="list" v-loading="loading" stripe>
          <el-table-column label="头像" width="70">
            <template #default="{ row }">
              <el-avatar :size="36" :src="row.avatar" />
            </template>
          </el-table-column>
          <el-table-column label="昵称" prop="nickname" min-width="120" />
          <el-table-column label="手机号" prop="phone" min-width="130" />
          <el-table-column label="会员等级" min-width="120">
            <template #default="{ row }">
              <SfLevelTag :level="row.level" />
            </template>
          </el-table-column>
          <el-table-column label="邀请码" prop="inviteCode" min-width="100" />
          <el-table-column label="推荐人ID" prop="inviterId" min-width="100">
            <template #default="{ row }">{{ row.inviterId || '-' }}</template>
          </el-table-column>
          <el-table-column label="注册时间" prop="registerTime" min-width="160" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : row.status === 2 ? 'danger' : 'info'" size="small" effect="light">
                {{ row.status === 1 ? '正常' : row.status === 2 ? '冻结' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="viewDetail(row as Member)">详情</el-button>
              <el-button v-if="row.status === 1" link type="danger" @click="toggleStatus(row as Member, 2)">冻结</el-button>
              <el-button v-else link type="success" @click="toggleStatus(row as Member, 1)">解冻</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="sf-pagination">
          <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
            layout="total, prev, pager, next, jumper" background @current-change="load" />
        </div>
      </div>
    </SfPageContainer>

    <!-- 新增会员弹窗 -->
    <el-dialog v-model="createVisible" title="新增会员" width="480px" destroy-on-close>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="90px">
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="createForm.nickname" placeholder="会员昵称" maxlength="20" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="createForm.phone" placeholder="用于登录与联系" maxlength="20" />
        </el-form-item>
        <el-form-item label="会员等级" prop="level">
          <el-select v-model="createForm.level" style="width: 100%">
            <el-option label="普通会员" :value="0" />
            <el-option v-for="lv in levelOptions" :key="lv.level" :label="lv.levelName" :value="lv.level" />
          </el-select>
          <div class="create-tip">选择代理商等级将自动发放当月领货额度</div>
        </el-form-item>
        <el-form-item label="真实姓名">
          <el-input v-model="createForm.realName" placeholder="选填" maxlength="20" />
        </el-form-item>
        <el-form-item label="登录密码">
          <el-input v-model="createForm.password" type="password" show-password placeholder="留空默认 123456" maxlength="50" />
          <div class="create-tip">设置后会员可用「手机号 + 密码」登录商城；留空则默认 123456</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createMember">创建</el-button>
      </template>
    </el-dialog>

    <!-- 会员详情抽屉 -->
    <el-drawer v-model="detailVisible" title="会员详情" size="640px">
      <template v-if="currentMember">
        <div class="member-header">
          <el-avatar :size="64" :src="currentMember.avatar" />
          <div class="member-info">
            <div class="member-name">{{ currentMember.nickname }}</div>
            <div class="member-tags">
              <SfLevelTag :level="currentMember.level" />
              <el-tag :type="currentMember.status === 1 ? 'success' : 'danger'" size="small" effect="light">
                {{ currentMember.status === 1 ? '正常' : currentMember.status === 2 ? '冻结' : '禁用' }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 聚合统计 -->
        <div class="stat-grid" v-loading="statsLoading">
          <div class="stat-cell">
            <div class="stat-num">{{ stats.orderCount }}</div>
            <div class="stat-label">累计订单</div>
          </div>
          <div class="stat-cell">
            <div class="stat-num">¥{{ stats.orderTotal.toFixed(2) }}</div>
            <div class="stat-label">消费总额</div>
          </div>
          <div class="stat-cell">
            <div class="stat-num">¥{{ stats.commissionTotal.toFixed(2) }}</div>
            <div class="stat-label">佣金累计</div>
          </div>
          <div class="stat-cell">
            <div class="stat-num">¥{{ stats.wallet?.balance.toFixed(2) || '0.00' }}</div>
            <div class="stat-label">钱包余额</div>
          </div>
        </div>

        <el-tabs v-model="detailTab" style="margin-top: 16px">
          <!-- 基本信息 -->
          <el-tab-pane label="基本信息" name="info">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="会员ID">{{ currentMember.id }}</el-descriptions-item>
              <el-descriptions-item label="手机号">{{ currentMember.phone }}</el-descriptions-item>
              <el-descriptions-item label="真实姓名">{{ currentMember.realName || '-' }}</el-descriptions-item>
              <el-descriptions-item label="邀请码">{{ currentMember.inviteCode }}</el-descriptions-item>
              <el-descriptions-item label="一级推荐人">{{ currentMember.inviterId || '无' }}</el-descriptions-item>
              <el-descriptions-item label="二级推荐人">{{ currentMember.secondInviterId || '无' }}</el-descriptions-item>
              <el-descriptions-item label="三级推荐人">{{ currentMember.thirdInviterId || '无' }}</el-descriptions-item>
              <el-descriptions-item label="注册时间">{{ currentMember.registerTime }}</el-descriptions-item>
              <el-descriptions-item label="成为代理商">{{ currentMember.becomeAgentTime || '未入会' }}</el-descriptions-item>
              <el-descriptions-item label="等级到期">{{ currentMember.levelExpireTime || '-' }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- 订单记录 -->
          <el-tab-pane label="订单记录" name="orders">
            <el-table :data="memberOrders" size="small" max-height="420" border>
              <el-table-column label="订单号" prop="orderNo" min-width="170" show-overflow-tooltip />
              <el-table-column label="类型" width="80">
                <template #default="{ row }">{{ OrderTypeLabels[row.orderType as OrderType] }}</template>
              </el-table-column>
              <el-table-column label="实付" width="100">
                <template #default="{ row }"><SfPriceTag :value="row.payAmount" /></template>
              </el-table-column>
              <el-table-column label="状态" width="90">
                <template #default="{ row }">
                  <el-tag :type="row.status === 3 ? 'success' : row.status === 5 ? 'danger' : 'info'" size="small">
                    {{ OrderStatusLabels[row.status as OrderStatus] }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="下单时间" prop="createTime" min-width="150" />
            </el-table>
          </el-tab-pane>

          <!-- 佣金记录 -->
          <el-tab-pane label="佣金记录" name="commissions">
            <el-table :data="memberCommissions" size="small" max-height="420" border>
              <el-table-column label="佣金单号" prop="commissionNo" min-width="170" show-overflow-tooltip />
              <el-table-column label="来源会员" prop="sourceMemberId" width="90" />
              <el-table-column label="层级" width="80">
                <template #default="{ row }">{{ ['一级', '二级', '三级'][row.distributionLevel - 1] }}</template>
              </el-table-column>
              <el-table-column label="金额" width="100">
                <template #default="{ row }"><SfPriceTag :value="row.amount" size="large" /></template>
              </el-table-column>
              <el-table-column label="状态" width="90">
                <template #default="{ row }">
                  <el-tag :type="row.status === 1 ? 'success' : row.status === 0 ? 'warning' : 'info'" size="small">
                    {{ CommissionStatusLabels[row.status as CommissionStatus] }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="创建时间" prop="createTime" min-width="150" />
            </el-table>
          </el-tab-pane>

          <!-- 钱包 -->
          <el-tab-pane label="钱包" name="wallet">
            <el-descriptions :column="1" border v-if="wallet">
              <el-descriptions-item label="可用余额">¥{{ wallet.balance.toFixed(2) }}</el-descriptions-item>
              <el-descriptions-item label="冻结金额">¥{{ wallet.frozen.toFixed(2) }}</el-descriptions-item>
              <el-descriptions-item label="累计收入">¥{{ wallet.totalIncome.toFixed(2) }}</el-descriptions-item>
              <el-descriptions-item label="累计提现">¥{{ wallet.totalWithdraw.toFixed(2) }}</el-descriptions-item>
              <el-descriptions-item label="更新时间">{{ wallet.updateTime }}</el-descriptions-item>
            </el-descriptions>
            <el-empty v-else description="该会员暂无钱包数据" :image-size="80" />
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, RefreshLeft, Plus } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { apiMember, apiWallet, apiConfig } from '@/api'
import {
  type Member, type MemberWallet, type Order, type Commission,
  type LevelBenefitConfig,
  MemberLevel, OrderType, OrderStatus, CommissionStatus,
  OrderTypeLabels, OrderStatusLabels, CommissionStatusLabels,
} from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfLevelTag from '@/components/SfLevelTag.vue'
import SfPriceTag from '@/components/SfPriceTag.vue'
import { loadLevelMap } from '@/utils/level'

const loading = ref(false)
const list = ref<Member[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', level: '' as MemberLevel | '' })

// ===== 新增会员 =====
const createVisible = ref(false)
const creating = ref(false)
const createFormRef = ref<FormInstance>()
const levelOptions = ref<LevelBenefitConfig[]>([])
const createForm = reactive({ nickname: '', phone: '', level: 0, realName: '', password: '' })
const createRules: FormRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  level: [{ required: true, message: '请选择等级', trigger: 'change' }],
}

const openCreate = async () => {
  Object.assign(createForm, { nickname: '', phone: '', level: 0, realName: '', password: '' })
  if (!levelOptions.value.length) {
    levelOptions.value = await apiConfig.getLevelConfigs()
  }
  createVisible.value = true
}
const createMember = async () => {
  await createFormRef.value?.validate()
  creating.value = true
  try {
    await apiMember.create({
      nickname: createForm.nickname.trim(),
      phone: createForm.phone.trim(),
      level: createForm.level,
      realName: createForm.realName.trim(),
      password: createForm.password || undefined,
    })
    ElMessage.success('会员创建成功')
    createVisible.value = false
    load()
  } finally {
    creating.value = false
  }
}

const detailVisible = ref(false)
const detailTab = ref('info')
const currentMember = ref<Member | null>(null)
const statsLoading = ref(false)
const stats = reactive({ orderCount: 0, orderTotal: 0, commissionCount: 0, commissionTotal: 0, wallet: null as MemberWallet | null })
const memberOrders = ref<Order[]>([])
const memberCommissions = ref<Commission[]>([])
const wallet = ref<MemberWallet | null>(null)

const load = async () => {
  loading.value = true
  try {
    const res = await apiMember.getList({ page: page.value, pageSize: pageSize.value, ...filters })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const search = () => { page.value = 1; load() }
const resetSearch = () => { filters.keyword = ''; filters.level = ''; search() }

const viewDetail = async (row: Member) => {
  currentMember.value = row
  detailTab.value = 'info'
  detailVisible.value = true
  // 并行加载聚合数据
  statsLoading.value = true
  try {
    const [s, orders, commissions, w] = await Promise.all([
      apiMember.getMemberStats(row.id),
      apiMember.getMemberOrders(row.id),
      apiMember.getMemberCommissions(row.id),
      apiWallet.getByMemberId(row.id),
    ])
    Object.assign(stats, s)
    memberOrders.value = orders
    memberCommissions.value = commissions
    wallet.value = w
  } finally {
    statsLoading.value = false
  }
}

const toggleStatus = async (row: Member, status: number) => {
  await apiMember.toggleStatus(row.id, status)
  ElMessage.success(status === 1 ? '已解冻' : '已冻结')
  load()
}

onMounted(() => {
  loadLevelMap()
  load()
})
</script>

<style scoped>
.member-header {
  display: flex;
  align-items: center;
  gap: 16px;
}
.member-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.member-name {
  font-size: 18px;
  font-weight: 600;
}
.member-tags {
  display: flex;
  gap: 6px;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 20px;
}
.stat-cell {
  background: #F8F9FB;
  border-radius: 8px;
  padding: 14px 8px;
  text-align: center;
  border: 1px solid #E7E9ED;
}
.stat-num {
  font-size: 18px;
  font-weight: 700;
  color: #171A1F;
}
.stat-label {
  font-size: 12px;
  color: #626A73;
  margin-top: 4px;
}
.create-tip {
  font-size: 12px;
  color: #626A73;
  line-height: 1.6;
  width: 100%;
}
</style>
