<template>
  <div class="sf-page">
    <SfPageContainer title="代理商管理" description="管理银卡/金卡代理商，查看业绩与佣金">
      <div class="sf-card">
        <div class="sf-search-bar">
          <div class="sf-search-item">
            <span class="sf-search-label">代理商等级</span>
            <el-select v-model="filters.level" placeholder="全部" clearable style="width: 140px">
              <el-option label="银卡代理商" :value="1" />
              <el-option label="金卡代理商" :value="2" />
            </el-select>
          </div>
          <div class="sf-search-item">
            <span class="sf-search-label">关键词</span>
            <el-input v-model="filters.keyword" placeholder="昵称/手机号/邀请码" clearable style="width: 200px" @keyup.enter="search" />
          </div>
          <el-button type="primary" :icon="Search" @click="search">搜索</el-button>
          <el-button :icon="RefreshLeft" @click="resetSearch">重置</el-button>
        </div>
      </div>
      <div class="sf-card">
        <el-table :data="list" v-loading="loading" stripe>
          <el-table-column label="代理商" min-width="160">
            <template #default="{ row }">
              <div class="agent-cell">
                <el-avatar :size="36" :src="row.avatar" />
                <div>
                  <div class="agent-name">{{ row.nickname }}</div>
                  <div class="agent-phone">{{ row.phone }}</div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="等级" min-width="110">
            <template #default="{ row }"><SfLevelTag :level="row.level" /></template>
          </el-table-column>
          <el-table-column label="入会时间" min-width="160">
            <template #default="{ row }">
              <span v-if="row.becomeAgentTime">{{ row.becomeAgentTime }}</span>
              <span v-else class="agent-empty">-</span>
            </template>
          </el-table-column>
          <el-table-column label="提现账号" min-width="180">
            <template #default="{ row }">
              <div v-if="(row as AgentRow).bankCard || (row as AgentRow).alipayAccount" class="payout-cell">
                <div v-if="(row as AgentRow).bankCard" class="payout-line">
                  <span>{{ (row as AgentRow).bankName || '银行卡' }} {{ maskCard((row as AgentRow).bankCard || '') }}</span>
                </div>
                <div v-if="(row as AgentRow).alipayAccount" class="payout-line payout-alipay">
                  <span>支付宝 {{ maskPhone((row as AgentRow).alipayAccount || '') }}</span>
                </div>
              </div>
              <span v-else class="agent-empty">未绑定</span>
            </template>
          </el-table-column>
          <el-table-column label="邀请码" prop="inviteCode" min-width="100" />
          <el-table-column label="直推会员" min-width="90" align="center">
            <template #default="{ row }">{{ directCount(row.id) }}</template>
          </el-table-column>
          <el-table-column label="团队规模" min-width="90" align="center">
            <template #default="{ row }">{{ teamCount(row.id) }}</template>
          </el-table-column>
          <el-table-column label="推荐人" min-width="90">
            <template #default="{ row }">{{ row.inviterId || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openPerformance(row as Member)">业绩详情</el-button>
              <el-button link type="primary" @click="openCommission(row as Member)">佣金记录</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </SfPageContainer>

    <!-- 业绩详情抽屉 -->
    <el-drawer v-model="performanceVisible" title="代理商业绩详情" size="560px">
      <template v-if="currentAgent">
        <div class="agent-header">
          <el-avatar :size="56" :src="currentAgent.avatar" />
          <div>
            <div class="agent-title">{{ currentAgent.nickname }}（{{ currentAgent.inviteCode }}）</div>
            <div class="agent-sub">{{ currentAgent.phone }} · 入会 {{ currentAgent.becomeAgentTime || '-' }}</div>
          </div>
        </div>

        <div class="detail-block" v-if="currentAgent?.bankCard || currentAgent?.alipayAccount">
          <div class="section-title">提现账号</div>
          <div class="detail-row" v-if="currentAgent?.bankCard">
            <span class="detail-label">银行卡</span>
            <span class="detail-value">{{ currentAgent.bankHolder || '-' }} · {{ currentAgent.bankName || '' }} {{ maskCard(currentAgent.bankCard) }}</span>
          </div>
          <div class="detail-row" v-if="currentAgent?.alipayAccount">
            <span class="detail-label">支付宝</span>
            <span class="detail-value">{{ currentAgent.alipayName || '-' }} · {{ maskPhone(currentAgent.alipayAccount) }}</span>
          </div>
        </div>
        <div class="detail-block" v-else>
          <div class="section-title">提现账号</div>
          <div class="detail-row"><span class="detail-value agent-empty">该代理商尚未绑定提现账号</span></div>
        </div>

        <div class="stat-grid">
          <div class="stat-cell">
            <div class="stat-num">{{ teamStats.direct }}</div>
            <div class="stat-label">直推会员</div>
          </div>
          <div class="stat-cell">
            <div class="stat-num">{{ teamStats.team }}</div>
            <div class="stat-label">团队规模</div>
          </div>
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
            <div class="stat-num">¥{{ wallet?.balance.toFixed(2) || '0.00' }}</div>
            <div class="stat-label">钱包余额</div>
          </div>
        </div>

        <div class="section-title">近期订单</div>
        <el-table :data="memberOrders.slice(0, 5)" size="small" border max-height="240">
          <el-table-column label="订单号" prop="orderNo" min-width="170" show-overflow-tooltip />
          <el-table-column label="实付" width="100">
            <template #default="{ row }"><SfPriceTag :value="row.payAmount" /></template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 3 ? 'success' : 'info'" size="small">{{ OrderStatusLabels[row.status as OrderStatus] }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="时间" prop="createTime" min-width="150" />
        </el-table>
      </template>
    </el-drawer>

    <!-- 佣金记录弹窗 -->
    <el-dialog v-model="commissionVisible" :title="`佣金记录 - ${currentAgent?.nickname || ''}`" width="680px">
      <el-table :data="memberCommissions" v-loading="commissionLoading" border size="small" max-height="420">
        <el-table-column label="佣金单号" prop="commissionNo" min-width="170" show-overflow-tooltip />
        <el-table-column label="来源会员" prop="sourceMemberId" width="90" />
        <el-table-column label="层级" width="80">
          <template #default="{ row }">{{ ['一级', '二级', '三级'][row.distributionLevel - 1] }}</template>
        </el-table-column>
        <el-table-column label="订单金额" width="100">
          <template #default="{ row }"><SfPriceTag :value="row.orderAmount" /></template>
        </el-table-column>
        <el-table-column label="比例" width="70">
          <template #default="{ row }">{{ row.rate }}%</template>
        </el-table-column>
        <el-table-column label="佣金" width="100">
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
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, RefreshLeft } from '@element-plus/icons-vue'
import { apiMember, apiWallet } from '@/api'
import {
  type Member, type MemberWallet, type Order, type Commission,
  MemberLevel, OrderStatus, CommissionStatus, OrderStatusLabels, CommissionStatusLabels,
} from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfLevelTag from '@/components/SfLevelTag.vue'
import SfPriceTag from '@/components/SfPriceTag.vue'

const loading = ref(false)
const filters = reactive({ level: '' as MemberLevel | '', keyword: '' })
/** 代理商行（含后端联查的提现账号字段） */
type AgentRow = Member & {
  bankName?: string
  bankCard?: string
  bankHolder?: string
  alipayName?: string
  alipayAccount?: string
}
const list = ref<AgentRow[]>([])
const allMembers = ref<Member[]>([])

const performanceVisible = ref(false)
const commissionVisible = ref(false)
const commissionLoading = ref(false)
const currentAgent = ref<AgentRow | null>(null)
const stats = reactive({ orderCount: 0, orderTotal: 0, commissionCount: 0, commissionTotal: 0, wallet: null as MemberWallet | null })
const teamStats = reactive({ direct: 0, team: 0 })
const wallet = ref<MemberWallet | null>(null)
const memberOrders = ref<Order[]>([])
const memberCommissions = ref<Commission[]>([])

const directCount = (memberId: number) => allMembers.value.filter(m => m.inviterId === memberId).length

/** 银行卡号脱敏：6225881234567890 → 6225 **** **** 7890 */
const maskCard = (card: string) => {
  const digits = card.replace(/\s/g, '')
  if (digits.length <= 8) return digits
  return `${digits.slice(0, 4)} **** **** ${digits.slice(-4)}`
}

/** 手机号/支付宝账号脱敏：138****1234 */
const maskPhone = (account: string) => {
  if (account.includes('@')) {
    const [name, domain] = account.split('@')
    return `${name.slice(0, 1)}***@${domain}`
  }
  if (account.length <= 7) return account
  return `${account.slice(0, 3)}****${account.slice(-4)}`
}

const teamCount = (memberId: number) => {
  const direct = allMembers.value.filter(m => m.inviterId === memberId)
  const second = allMembers.value.filter(m => m.secondInviterId === memberId)
  const third = allMembers.value.filter(m => m.thirdInviterId === memberId)
  return direct.length + second.length + third.length
}

const load = async () => {
  loading.value = true
  try {
    const res = await apiMember.getList({ page: 1, pageSize: 100, level: filters.level || '' })
    const kw = filters.keyword.toLowerCase()
    let agents = res.list.filter(m => m.level !== MemberLevel.Normal)
    if (kw) {
      agents = agents.filter(m => m.nickname.toLowerCase().includes(kw) || m.phone.includes(kw) || m.inviteCode.toLowerCase().includes(kw))
    }
    list.value = agents
    const all = await apiMember.getList({ page: 1, pageSize: 100 })
    allMembers.value = all.list
  } finally {
    loading.value = false
  }
}

const search = () => load()
const resetSearch = () => { filters.level = ''; filters.keyword = ''; load() }

const openPerformance = async (row: AgentRow) => {
  currentAgent.value = row
  performanceVisible.value = true
  teamStats.direct = directCount(row.id)
  teamStats.team = teamCount(row.id)
  const [s, orders, w] = await Promise.all([
    apiMember.getMemberStats(row.id),
    apiMember.getMemberOrders(row.id),
    apiWallet.getByMemberId(row.id),
  ])
  Object.assign(stats, s)
  memberOrders.value = orders
  wallet.value = w
}

const openCommission = async (row: Member) => {
  currentAgent.value = row
  commissionVisible.value = true
  commissionLoading.value = true
  try {
    memberCommissions.value = await apiMember.getMemberCommissions(row.id)
  } finally {
    commissionLoading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.agent-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.agent-name {
  font-size: 14px;
  font-weight: 500;
}
.agent-phone {
  font-size: 12px;
  color: #626A73;
}
.agent-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}
.agent-title {
  font-size: 17px;
  font-weight: 600;
}
.agent-sub {
  font-size: 13px;
  color: #626A73;
  margin-top: 4px;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
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
.agent-empty {
  color: #9AA1AA;
  font-size: 12px;
}
.payout-cell {
  line-height: 1.7;
}
.payout-line {
  font-size: 12px;
  color: #626A73;
}
.payout-alipay {
  color: #FF6B35;
}
.detail-block {
  margin-bottom: 4px;
}
.detail-row {
  display: flex;
  gap: 10px;
  padding: 6px 0;
  font-size: 13px;
}
.detail-label {
  color: #626A73;
  width: 56px;
  flex-shrink: 0;
}
.detail-value {
  color: #171A1F;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #171A1F;
  margin: 20px 0 12px;
}
</style>
