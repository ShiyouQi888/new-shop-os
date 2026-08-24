<template>
  <div class="sf-page">
    <SfPageContainer title="分销关系" description="查看会员三级推荐关系链">
      <div class="sf-card">
        <div class="sf-search-bar">
          <div class="sf-search-item">
            <span class="sf-search-label">会员ID/手机号</span>
            <el-input v-model="keyword" placeholder="输入会员ID或手机号查询" clearable style="width: 240px" />
          </div>
          <el-button type="primary" :icon="Search" @click="search">查询</el-button>
        </div>
      </div>

      <div class="sf-card" v-if="currentMember">
        <div class="sf-card-title"><el-icon><Share /></el-icon> 关系链</div>
        <div class="relation-chain">
          <div class="relation-level" v-for="level in [1, 2, 3] as const" :key="level">
            <div class="level-badge" :class="`level-${level}`">{{ level === 1 ? '一级' : level === 2 ? '二级' : '三级' }}推荐人</div>
            <div class="level-content" v-if="getInviter(level)">
              <el-avatar :size="40" :src="getInviter(level)!.avatar" />
              <div class="level-info">
                <div class="level-name">{{ getInviter(level)!.nickname }}</div>
                <div class="level-meta">ID: {{ getInviter(level)!.id }} · {{ getInviter(level)!.phone }}</div>
                <SfLevelTag :level="getInviter(level)!.level" />
              </div>
            </div>
            <div v-else class="level-empty">无</div>
          </div>
        </div>
      </div>

      <div class="sf-card" v-if="currentMember">
        <div class="sf-card-title"><el-icon><User /></el-icon> 下级团队</div>
        <el-tabs v-model="activeTab">
          <el-tab-pane label="一级团队" name="1">
            <el-table :data="teamData" border>
              <el-table-column label="会员" min-width="160">
                <template #default="{ row }">
                  <div class="team-cell">
                    <el-avatar :size="32" :src="row.avatar" />
                    <span>{{ row.nickname }} ({{ row.phone }})</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="等级" min-width="120">
                <template #default="{ row }"><SfLevelTag :level="row.level" /></template>
              </el-table-column>
              <el-table-column label="注册时间" prop="registerTime" min-width="160" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="二级团队" name="2">
            <el-empty description="点击一级会员查看其下级" />
          </el-tab-pane>
          <el-tab-pane label="三级团队" name="3">
            <el-empty description="点击二级会员查看其下级" />
          </el-tab-pane>
        </el-tabs>
      </div>

      <div v-if="!currentMember" class="sf-card empty-hint">
        <el-empty description="输入会员ID或手机号查询分销关系" />
      </div>
    </SfPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Search, Share, User } from '@element-plus/icons-vue'
import { mockMembers, type Member, MemberLevel } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfLevelTag from '@/components/SfLevelTag.vue'

const keyword = ref('')
const currentMember = ref<Member | null>(null)
const activeTab = ref('1')

const search = () => {
  const kw = keyword.value.trim()
  if (!kw) return
  const found = mockMembers.find(m => m.id.toString() === kw || m.phone.includes(kw))
  currentMember.value = found || null
}

const getInviter = (level: 1 | 2 | 3): Member | null => {
  if (!currentMember.value) return null
  const id = level === 1 ? currentMember.value.inviterId : level === 2 ? currentMember.value.secondInviterId : currentMember.value.thirdInviterId
  if (!id) return null
  return mockMembers.find(m => m.id === id) || null
}

const teamData = computed(() => {
  if (!currentMember.value) return []
  return mockMembers.filter(m => m.inviterId === currentMember.value!.id)
})

onMounted(() => {
  keyword.value = '1'
  search()
})
</script>

<style scoped>
.relation-chain {
  display: flex;
  gap: 16px;
  align-items: stretch;
}
.relation-level {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.level-badge {
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  width: fit-content;
}
.level-1 { background: #fef0ef; color: #e54d42; }
.level-2 { background: #fdf6ec; color: #f37b1d; }
.level-3 { background: #f4f4f5; color: #909399; }
.level-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9fafc;
  border-radius: 8px;
}
.level-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.level-name {
  font-weight: 600;
}
.level-meta {
  font-size: 12px;
  color: #909399;
}
.level-empty {
  padding: 24px;
  text-align: center;
  color: #c0c4cc;
  background: #f9fafc;
  border-radius: 8px;
}
.team-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.empty-hint {
  padding: 60px 0;
}
</style>
