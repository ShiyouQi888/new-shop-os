<template>
  <div class="team-page page-shell">
    <van-nav-bar title="我的团队" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <!-- 团队概览 -->
    <div class="team-overview premium-card">
      <div class="ov-item" v-for="item in overview" :key="item.label">
        <div class="ov-val">{{ item.value }}</div>
        <div class="ov-label">{{ item.label }}</div>
      </div>
    </div>

    <!-- 层级 Tab（按分销开关动态渲染） -->
    <van-tabs v-model:active="activeTab" sticky offset-top="46px" @change="loadTeam">
      <van-tab v-for="l in activeLevels" :key="l" :title="l === 1 ? '一级（直接推荐）' : l === 2 ? '二级（间推）' : '三级'" />
    </van-tabs>

    <div v-if="!enabled" class="team-disabled premium-card">
      <van-icon name="closed-eye" />
      <span>分享推广功能已暂停，团队数据暂不展示</span>
    </div>

    <div class="team-list" v-else>
        <div class="team-item premium-card" v-for="m in teamMembers" :key="m.id">
        <van-image round width="40" height="40" :src="m.avatar" />
        <div class="ti-info">
          <div class="ti-name">{{ maskName(m.nickname) }}</div>
          <div class="ti-meta">
            <LevelBadge :level="m.level" />
            <span>注册于 {{ formatDate(m.registerTime) }}</span>
          </div>
        </div>
        <div class="ti-contribution">
          <div class="ti-amount price">¥{{ getContribution(m.id) }}</div>
          <div class="ti-label">贡献佣金</div>
        </div>
      </div>
      <van-empty v-if="!teamMembers.length" description="暂无成员" />
    </div>

    <div class="privacy-note">
      <van-icon name="shield-o" />
      <span>为保护隐私，不展示联系方式，仅显示数据统计</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import { maskName, formatDate, type Member } from '@shop-os/shared'
import { useUserStore } from '@/stores/user'
import LevelBadge from '@/components/LevelBadge.vue'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref(0)
/** 分销开关：总开关 + 生效层级 */
const enabled = ref(true)
const activeLevels = ref<number[]>([1, 2, 3])
/** 团队成员（含 contributedAmount 贡献佣金，来自后端） */
const teamMembers = ref<Array<Member & { contributedAmount?: number }>>([])

const overview = ref([
  { label: '一级人数', value: 0 },
  { label: '二级人数', value: 0 },
  { label: '三级人数', value: 0 },
  { label: '团队总人数', value: 0 },
])

const getContribution = (memberId: number) => {
  const m = teamMembers.value.find(t => t.id === memberId)
  return m?.contributedAmount ?? 0
}

const loadTeam = async () => {
  if (!enabled.value || !activeLevels.value.length) return
  const level = activeLevels.value[activeTab.value] as 1 | 2 | 3
  if (!level) return
  teamMembers.value = await api.getTeam(userStore.member.id, level)
}

/** 开关变化后修正越界 tab */
const clampTab = () => {
  if (activeTab.value >= activeLevels.value.length) {
    activeTab.value = 0
  }
}

onMounted(async () => {
  const [stats, dist] = await Promise.all([
    api.getAgentStats(userStore.member),
    api.getDistributionConfig().catch(() => ({ enabled: true, level1: true, level2: true, level3: true, activeLevels: [1, 2, 3] })),
  ])
  enabled.value = dist.enabled
  activeLevels.value = dist.activeLevels.length ? dist.activeLevels : [1, 2, 3]
  clampTab()
  overview.value = [
    { label: '一级人数', value: stats.team.level1 },
    { label: '二级人数', value: stats.team.level2 },
    { label: '三级人数', value: stats.team.level3 },
    { label: '团队总人数', value: stats.team.total },
  ]
  loadTeam()
})
</script>

<style scoped>
.team-page { padding-top: 46px; min-height: 100vh; }
.team-overview { display: grid; grid-template-columns: repeat(4, 1fr); padding: 16px 0; margin: 12px 14px; }
.ov-item { text-align: center; }
.ov-val { font-size: 20px; font-weight: 800; color: #171A1F; }
.ov-label { font-size: 11px; color: #626A73; margin-top: 4px; }
.team-list { padding: 0 14px 12px; }
.team-item { display: flex; align-items: center; gap: 10px; padding: 12px; margin-bottom: 8px; }
.ti-info { flex: 1; }
.ti-name { color: #171A1F; font-size: 14px; font-weight: 700; }
.ti-meta { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 11px; color: #626A73; }
.ti-contribution { text-align: right; }
.ti-amount { font-size: 15px; }
.ti-label { font-size: 11px; color: #626A73; }
.privacy-note { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 16px; font-size: 12px; color: #9AA1AA; }
.team-disabled { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 12px 14px; padding: 24px; color: #626A73; font-size: 13px; }
.team-disabled .van-icon { color: #FF6B35; }
</style>
