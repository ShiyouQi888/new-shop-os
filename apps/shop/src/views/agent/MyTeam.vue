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

    <!-- 层级 Tab -->
    <van-tabs v-model:active="activeTab" sticky offset-top="46px" @change="loadTeam">
      <van-tab title="一级（直接推荐）" />
      <van-tab title="二级（间推）" />
      <van-tab title="三级" />
    </van-tabs>

    <div class="team-list">
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
import { maskName, formatDate, mockCommissions, type Member } from '@shop-os/shared'
import { useUserStore } from '@/stores/user'
import LevelBadge from '@/components/LevelBadge.vue'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref(0)
const teamMembers = ref<Member[]>([])

const overview = ref([
  { label: '一级人数', value: 0 },
  { label: '二级人数', value: 0 },
  { label: '三级人数', value: 0 },
  { label: '团队总人数', value: 0 },
])

const getContribution = (memberId: number) => {
  return mockCommissions.filter(c => c.sourceMemberId === memberId)
    .reduce((sum, c) => sum + c.amount, 0)
}

const loadTeam = async () => {
  const level = (activeTab.value + 1) as 1 | 2 | 3
  teamMembers.value = await api.getTeam(userStore.member.id, level)
}

onMounted(async () => {
  const stats = await api.getAgentStats(userStore.member)
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
.ov-val { font-size: 20px; font-weight: 800; color: #17202a; }
.ov-label { font-size: 11px; color: #7b8794; margin-top: 4px; }
.team-list { padding: 0 14px 12px; }
.team-item { display: flex; align-items: center; gap: 10px; padding: 12px; margin-bottom: 8px; }
.ti-info { flex: 1; }
.ti-name { color: #17202a; font-size: 14px; font-weight: 700; }
.ti-meta { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 11px; color: #7b8794; }
.ti-contribution { text-align: right; }
.ti-amount { font-size: 15px; }
.ti-label { font-size: 11px; color: #7b8794; }
.privacy-note { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 16px; font-size: 12px; color: #a8b1bc; }
</style>
