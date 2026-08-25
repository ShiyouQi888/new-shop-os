<template>
  <div class="sf-page">
    <SfPageContainer title="日志与审计" description="系统操作日志、登录日志、数据变更追溯">
      <div class="sf-card">
        <el-tabs v-model="activeTab">
          <!-- 操作日志 -->
          <el-tab-pane label="操作日志" name="operation">
            <div class="sf-search-bar">
              <div class="sf-search-item">
                <span class="sf-search-label">关键词</span>
                <el-input v-model="opFilters.keyword" placeholder="操作人/模块/操作/IP/描述" clearable style="width: 240px" @keyup.enter="opPage = 1; applyOpPage()" />
              </div>
              <el-button type="primary" :icon="Search" @click="opPage = 1; applyOpPage()">搜索</el-button>
              <el-button :icon="RefreshLeft" @click="opFilters.keyword = ''; opPage = 1; applyOpPage()">重置</el-button>
            </div>
            <el-table :data="operationLogs" border v-loading="opLoading">
              <el-table-column label="时间" prop="createTime" min-width="180" />
              <el-table-column label="操作人" prop="operator" min-width="120" />
              <el-table-column label="模块" prop="module" min-width="120">
                <template #default="{ row }">
                  <el-tag size="small" effect="plain">{{ row.module }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" prop="action" width="100" />
              <el-table-column label="描述" prop="description" min-width="240" show-overflow-tooltip />
              <el-table-column label="IP" prop="ip" min-width="120" />
            </el-table>
            <div class="sf-pagination">
              <el-pagination v-model:current-page="opPage" :page-size="pageSize" :total="opTotal"
                layout="total, prev, pager, next" background @current-change="applyOpPage" />
            </div>
          </el-tab-pane>

          <!-- 登录日志 -->
          <el-tab-pane label="登录日志" name="login">
            <div class="sf-search-bar">
              <div class="sf-search-item">
                <span class="sf-search-label">关键词</span>
                <el-input v-model="loginFilters.keyword" placeholder="账号/IP/设备" clearable style="width: 240px" @keyup.enter="loginPage = 1; applyLoginPage()" />
              </div>
              <div class="sf-search-item">
                <span class="sf-search-label">结果</span>
                <el-select v-model="loginFilters.success" placeholder="全部" clearable style="width: 120px">
                  <el-option label="成功" :value="1" />
                  <el-option label="失败" :value="0" />
                </el-select>
              </div>
              <el-button type="primary" :icon="Search" @click="loginPage = 1; applyLoginPage()">搜索</el-button>
              <el-button :icon="RefreshLeft" @click="loginFilters.keyword = ''; loginFilters.success = ''; loginPage = 1; applyLoginPage()">重置</el-button>
            </div>
            <el-table :data="loginLogs" border v-loading="loginLoading">
              <el-table-column label="时间" prop="createTime" min-width="180" />
              <el-table-column label="账号" prop="username" min-width="130" />
              <el-table-column label="IP" prop="ip" min-width="120" />
              <el-table-column label="设备" prop="device" min-width="220" show-overflow-tooltip />
              <el-table-column label="结果" width="100">
                <template #default="{ row }">
                  <el-tag :type="Number(row.success) === 1 ? 'success' : 'danger'" size="small">{{ Number(row.success) === 1 ? '成功' : '失败' }}</el-tag>
                </template>
              </el-table-column>
            </el-table>
            <div class="sf-pagination">
              <el-pagination v-model:current-page="loginPage" :page-size="pageSize" :total="loginTotal"
                layout="total, prev, pager, next" background @current-change="applyLoginPage" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </SfPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, RefreshLeft } from '@element-plus/icons-vue'
import { apiLog } from '@/api'
import SfPageContainer from '@/components/SfPageContainer.vue'

const activeTab = ref('operation')
const pageSize = 8

// ---------- 操作日志 ----------
const opLoading = ref(false)
const operationLogs = ref<Array<{ operator: string; module: string; action: string; description: string; ip: string; createTime: string }>>([])
const opTotal = ref(0)
const opFilters = reactive({ keyword: '' })
const opPage = ref(1)

const loadOperations = async () => {
  opLoading.value = true
  try {
    const res = await apiLog.getOperations({
      page: opPage.value, pageSize, keyword: opFilters.keyword.trim() || undefined,
    })
    operationLogs.value = res.list
    opTotal.value = res.total
  } finally {
    opLoading.value = false
  }
}
const applyOpPage = () => loadOperations()

// ---------- 登录日志 ----------
const loginLoading = ref(false)
const loginLogs = ref<Array<{ username: string; ip: string; device: string; success: number; createTime: string }>>([])
const loginTotal = ref(0)
const loginFilters = reactive({ keyword: '', success: '' as '' | 0 | 1 })
const loginPage = ref(1)

const loadLogins = async () => {
  loginLoading.value = true
  try {
    const res = await apiLog.getLogins({
      page: loginPage.value, pageSize,
      keyword: loginFilters.keyword.trim() || undefined,
      success: loginFilters.success === '' ? undefined : loginFilters.success,
    })
    loginLogs.value = res.list
    loginTotal.value = res.total
  } finally {
    loginLoading.value = false
  }
}
const applyLoginPage = () => loadLogins()

onMounted(() => {
  loadOperations()
  loadLogins()
})
</script>
