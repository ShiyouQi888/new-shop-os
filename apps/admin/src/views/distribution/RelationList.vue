<template>
  <div class="sf-page">
    <SfPageContainer title="分销关系" description="分销开关配置与会员推荐关系链">
      <!-- 分销开关配置 -->
      <div class="sf-card">
        <div class="sf-card-title"><el-icon><Switch /></el-icon> 分销开关</div>
        <div class="dist-switch-bar" v-loading="configLoading">
          <div class="switch-item">
            <div class="switch-info">
              <span class="switch-name">分销总开关</span>
              <span class="switch-desc">关闭后前台隐藏推广/团队/佣金入口，关系链不再产生新佣金</span>
            </div>
            <el-switch v-model="distConfig.enabled" @change="(v: string|number|boolean) => saveConfig('distribution.enabled', Boolean(v))" />
          </div>
          <div class="switch-divider" />
          <div class="switch-item" :class="{ disabled: !distConfig.enabled }">
            <div class="switch-info">
              <span class="switch-name">一级分销</span>
              <span class="switch-desc">开启后直推（一级）关系生效，产生一级佣金</span>
            </div>
            <el-switch v-model="distConfig.level1" :disabled="!distConfig.enabled"
              @change="(v: string|number|boolean) => saveConfig('distribution.level_1', Boolean(v))" />
          </div>
          <div class="switch-item" :class="{ disabled: !distConfig.enabled }">
            <div class="switch-info">
              <span class="switch-name">二级分销</span>
              <span class="switch-desc">开启后间推（二级）关系生效，产生二级佣金</span>
            </div>
            <el-switch v-model="distConfig.level2" :disabled="!distConfig.enabled"
              @change="(v: string|number|boolean) => saveConfig('distribution.level_2', Boolean(v))" />
          </div>
          <div class="switch-item" :class="{ disabled: !distConfig.enabled }">
            <div class="switch-info">
              <span class="switch-name">三级分销</span>
              <span class="switch-desc">开启后三级关系生效，产生三级佣金</span>
            </div>
            <el-switch v-model="distConfig.level3" :disabled="!distConfig.enabled"
              @change="(v: string|number|boolean) => saveConfig('distribution.level_3', Boolean(v))" />
          </div>
        </div>
        <div class="dist-hint" v-if="!distConfig.enabled">
          <el-icon><Warning /></el-icon>
          <span>分销已整体关闭：前台「推广中心 / 我的团队 / 佣金明细」将提示暂停，且不会产生新佣金。</span>
        </div>
      </div>

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
import { ref, reactive, onMounted, computed } from 'vue'
import { Search, Share, User, Switch, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { type Member, type SystemConfig } from '@shop-os/shared'
import { apiMember, apiConfig } from '@/api'
import SfPageContainer from '@/components/SfPageContainer.vue'
import { loadLevelMap } from '@/utils/level'
import SfLevelTag from '@/components/SfLevelTag.vue'

const keyword = ref('')
const currentMember = ref<Member | null>(null)
const activeTab = ref('1')
/** 全量会员缓存（后端 /members 加载，用于本地关系检索） */
const members = ref<Member[]>([])

// ===== 分销开关 =====
const configLoading = ref(false)
const distConfig = reactive({ enabled: true, level1: true, level2: true, level3: true })

const loadDistConfig = async () => {
  configLoading.value = true
  try {
    const configs = await apiConfig.getSystemConfigs('distribution')
    const val = (k: string, def = '1') => {
      const c = configs.find((x: SystemConfig) => x.configKey === k)
      return c ? c.configValue : def
    }
    distConfig.enabled = val('distribution.enabled') === '1'
    distConfig.level1 = val('distribution.level_1') === '1'
    distConfig.level2 = val('distribution.level_2') === '1'
    distConfig.level3 = val('distribution.level_3') === '1'
  } catch {
    ElMessage.warning('分销开关配置加载失败')
  } finally {
    configLoading.value = false
  }
}

const saveConfig = async (key: string, value: boolean) => {
  try {
    const configs = await apiConfig.getSystemConfigs('distribution')
    const target = configs.find((x: SystemConfig) => x.configKey === key)
    if (!target) {
      ElMessage.warning('配置项不存在')
      return
    }
    await apiConfig.saveSystemConfig({ ...target, configValue: value ? '1' : '0' })
    ElMessage.success(value ? '已开启' : '已关闭')
    if (key === 'distribution.enabled' && !value) {
      // 关总开关时前端禁用分级开关视觉
      distConfig.level1 = false
      distConfig.level2 = false
      distConfig.level3 = false
    }
  } catch {
    ElMessage.error('保存失败')
  }
}

const loadMembers = async () => {
  try {
    const res = await apiMember.getList({ page: 1, pageSize: 100 })
    members.value = res.list
  } catch {
    ElMessage.warning('会员数据加载失败')
  }
}

const search = () => {
  const kw = keyword.value.trim()
  if (!kw) return
  const found = members.value.find(m => m.id.toString() === kw || m.phone.includes(kw))
  currentMember.value = found || null
}

const getInviter = (level: 1 | 2 | 3): Member | null => {
  if (!currentMember.value) return null
  const id = level === 1 ? currentMember.value.inviterId : level === 2 ? currentMember.value.secondInviterId : currentMember.value.thirdInviterId
  if (!id) return null
  return members.value.find(m => m.id === id) || null
}

const teamData = computed(() => {
  if (!currentMember.value) return []
  return members.value.filter(m => m.inviterId === currentMember.value!.id)
})

onMounted(async () => {
  loadLevelMap()
  await Promise.all([loadDistConfig(), loadMembers()])
  keyword.value = '1'
  search()
})
</script>

<style scoped>
.dist-switch-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 32px;
  padding: 4px 0;
}
.switch-item {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 240px;
}
.switch-item.disabled {
  opacity: 0.45;
}
.switch-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.switch-name {
  font-size: 14px;
  font-weight: 600;
  color: #171A1F;
}
.switch-desc {
  font-size: 12px;
  color: #626A73;
}
.switch-divider {
  width: 1px;
  height: 40px;
  background: #E7E9ED;
}
.dist-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 10px 12px;
  background: #FFF1EB;
  border-radius: 6px;
  color: #F5A623;
  font-size: 12px;
}
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
.level-1 { background: #FFF1EB; color: #FF6B35; }
.level-2 { background: #FFF1EB; color: #E85222; }
.level-3 { background: #F8F9FB; color: #626A73; }
.level-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #F8F9FB;
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
  color: #626A73;
}
.level-empty {
  padding: 24px;
  text-align: center;
  color: #9AA1AA;
  background: #F8F9FB;
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
