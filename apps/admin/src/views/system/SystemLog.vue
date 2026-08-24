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
            <el-table :data="opPageList" border>
              <el-table-column label="时间" prop="time" min-width="180" />
              <el-table-column label="操作人" prop="operator" min-width="120" />
              <el-table-column label="模块" prop="module" min-width="120">
                <template #default="{ row }">
                  <el-tag size="small" effect="plain">{{ row.module }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" prop="action" width="100" />
              <el-table-column label="描述" prop="desc" min-width="240" show-overflow-tooltip />
              <el-table-column label="IP" prop="ip" min-width="120" />
            </el-table>
            <div class="sf-pagination">
              <el-pagination v-model:current-page="opPage" :page-size="pageSize" :total="opFiltered.length"
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
                  <el-option label="成功" :value="true" />
                  <el-option label="失败" :value="false" />
                </el-select>
              </div>
              <el-button type="primary" :icon="Search" @click="loginPage = 1; applyLoginPage()">搜索</el-button>
              <el-button :icon="RefreshLeft" @click="loginFilters.keyword = ''; loginFilters.success = ''; loginPage = 1; applyLoginPage()">重置</el-button>
            </div>
            <el-table :data="loginPageList" border>
              <el-table-column label="时间" prop="time" min-width="180" />
              <el-table-column label="账号" prop="username" min-width="130" />
              <el-table-column label="IP" prop="ip" min-width="120" />
              <el-table-column label="设备" prop="device" min-width="220" show-overflow-tooltip />
              <el-table-column label="结果" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.success ? 'success' : 'danger'" size="small">{{ row.success ? '成功' : '失败' }}</el-tag>
                </template>
              </el-table-column>
            </el-table>
            <div class="sf-pagination">
              <el-pagination v-model:current-page="loginPage" :page-size="pageSize" :total="loginFiltered.length"
                layout="total, prev, pager, next" background @current-change="applyLoginPage" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </SfPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Search, RefreshLeft } from '@element-plus/icons-vue'
import SfPageContainer from '@/components/SfPageContainer.vue'

const activeTab = ref('operation')
const pageSize = 8

// ---------- 操作日志 ----------
const operationLogs = [
  { time: '2026-08-24 14:30:00', operator: '超级管理员', module: '提现管理', action: '审核', desc: '通过提现申请 WD20260824140002', ip: '192.168.1.100' },
  { time: '2026-08-24 12:00:00', operator: '运营-王', module: '商品管理', action: '编辑', desc: '编辑商品「赋能焕颜精华套装」', ip: '192.168.1.101' },
  { time: '2026-08-24 11:20:00', operator: '运营-王', module: '商品分类', action: '新增', desc: '新增子分类「口腔护理」', ip: '192.168.1.101' },
  { time: '2026-08-23 16:30:00', operator: '运营-王', module: '权益配置', action: '修改', desc: '修改银卡月度领货额度 580 → 600', ip: '192.168.1.101' },
  { time: '2026-08-23 14:10:00', operator: '超级管理员', module: '订单管理', action: '发货', desc: '批量发货 3 笔订单（顺丰速运）', ip: '192.168.1.100' },
  { time: '2026-08-23 10:00:00', operator: '财务-李', module: '佣金规则', action: '修改', desc: '修改9800礼包一级佣金比例 15%', ip: '192.168.1.102' },
  { time: '2026-08-22 15:40:00', operator: '财务-李', module: '提现管理', action: '打款', desc: '打款提现单 WD20260120100001', ip: '192.168.1.102' },
  { time: '2026-08-22 09:15:00', operator: '财务-李', module: '订单管理', action: '发货', desc: '批量发货 2 笔订单', ip: '192.168.1.102' },
  { time: '2026-08-21 17:30:00', operator: '运营-王', module: '转卖管理', action: '匹配', desc: '手动匹配转卖单 RS20260821009', ip: '192.168.1.101' },
  { time: '2026-08-21 11:00:00', operator: '超级管理员', module: '管理员管理', action: '新增', desc: '新增管理员「客服-赵」', ip: '192.168.1.100' },
  { time: '2026-08-20 16:20:00', operator: '财务-李', module: '领货管理', action: '调整', desc: '调整会员3本月领货额度 +100', ip: '192.168.1.102' },
  { time: '2026-08-20 10:00:00', operator: '运营-王', module: '商品管理', action: '上架', desc: '批量上架 5 个商品', ip: '192.168.1.101' },
]

const opFilters = reactive({ keyword: '' })
const opPage = ref(1)

const opFiltered = computed(() => {
  const kw = opFilters.keyword.toLowerCase()
  if (!kw) return operationLogs
  return operationLogs.filter(l =>
    l.operator.toLowerCase().includes(kw) || l.module.includes(kw) || l.action.includes(kw)
    || l.desc.includes(kw) || l.ip.includes(kw),
  )
})
const opPageList = computed(() => {
  const start = (opPage.value - 1) * pageSize
  return opFiltered.value.slice(start, start + pageSize)
})
const applyOpPage = () => { /* computed 驱动 */ }

// ---------- 登录日志 ----------
const loginLogs = [
  { time: '2026-08-24 14:00:00', username: 'admin', ip: '192.168.1.100', device: 'Chrome 127 / Windows 10', success: true },
  { time: '2026-08-24 08:30:00', username: 'ops_wang', ip: '192.168.1.101', device: 'Chrome 127 / macOS', success: true },
  { time: '2026-08-23 16:30:00', username: 'ops_wang', ip: '192.168.1.101', device: 'Chrome 127 / macOS', success: true },
  { time: '2026-08-23 08:00:00', username: 'admin', ip: '10.0.0.5', device: 'Unknown / Linux', success: false },
  { time: '2026-08-22 09:15:00', username: 'fin_li', ip: '192.168.1.102', device: 'Edge 127 / Windows 11', success: true },
  { time: '2026-08-21 20:00:00', username: 'ops_wang', ip: '10.0.0.8', device: 'Chrome 126 / Android', success: true },
  { time: '2026-08-21 18:30:00', username: 'cs_zhao', ip: '192.168.1.103', device: 'Chrome 127 / Windows 11', success: true },
  { time: '2026-08-20 22:10:00', username: 'cs_zhao', ip: '203.0.113.7', device: 'Firefox 128 / Linux', success: false },
  { time: '2026-08-20 09:00:00', username: 'admin', ip: '192.168.1.100', device: 'Chrome 127 / Windows 10', success: true },
  { time: '2026-08-19 15:45:00', username: 'fin_li', ip: '192.168.1.102', device: 'Edge 127 / Windows 11', success: true },
]

const loginFilters = reactive({ keyword: '', success: '' as '' | boolean })
const loginPage = ref(1)

const loginFiltered = computed(() => {
  const kw = loginFilters.keyword.toLowerCase()
  return loginLogs.filter(l => {
    if (loginFilters.success !== '' && l.success !== loginFilters.success) return false
    if (!kw) return true
    return l.username.toLowerCase().includes(kw) || l.ip.includes(kw) || l.device.toLowerCase().includes(kw)
  })
})
const loginPageList = computed(() => {
  const start = (loginPage.value - 1) * pageSize
  return loginFiltered.value.slice(start, start + pageSize)
})
const applyLoginPage = () => { /* computed 驱动 */ }
</script>
