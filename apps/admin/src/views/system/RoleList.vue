<template>
  <div class="sf-page">
    <SfPageContainer title="角色权限管理" description="自定义后台角色，按模块分配操作权限">
      <template #header>
        <el-button type="primary" :icon="Plus" @click="openEdit(null)">新增角色</el-button>
        <el-button :icon="RefreshLeft" @click="seedBuiltin">重置内置角色</el-button>
      </template>

      <div class="sf-card" v-loading="loading">
        <el-table :data="list" border>
          <el-table-column label="角色名称" min-width="140">
            <template #default="{ row }">
              <span class="role-name">{{ row.name }}</span>
              <el-tag v-if="Number(row.isBuiltin) === 1" size="small" type="info" effect="plain" style="margin-left: 6px">内置</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="角色编码" prop="code" min-width="140">
            <template #default="{ row }"><code class="role-code">{{ row.code }}</code></template>
          </el-table-column>
          <el-table-column label="描述" prop="description" min-width="220" show-overflow-tooltip />
          <el-table-column label="权限数" width="90" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.permissions.length ? 'success' : 'info'" effect="light">
                {{ row.permissions.length }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-switch :model-value="Number(row.status) === 1" :disabled="Number(row.isBuiltin) === 1"
                @change="(val: string | number | boolean) => toggleStatus(row as AdminRole, Boolean(val))"
                style="--el-switch-on-color: #18A66A" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row as AdminRole)">配置权限</el-button>
              <el-button link type="danger" :disabled="Number(row.isBuiltin) === 1" @click="removeRole(row as AdminRole)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </SfPageContainer>

    <!-- 新增 / 编辑角色 -->
    <el-dialog v-model="editVisible" :title="editForm.id ? '配置角色权限' : '新增角色'" width="520px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="角色名称" required>
          <el-input v-model="editForm.name" placeholder="如：商品运营" maxlength="20" :disabled="Number(editForm.isBuiltin) === 1" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.description" placeholder="角色职责说明" maxlength="100" />
        </el-form-item>
        <el-form-item label="权限">
          <div class="perm-tree">
            <div class="perm-group" v-for="g in permissionTree" :key="g.group">
              <el-checkbox
                :model-value="groupChecked(g.group)"
                :indeterminate="groupIndeterminate(g.group)"
                @change="(val: string | number | boolean) => toggleGroup(g.group, Boolean(val))"
              >
                <span class="perm-group-name">{{ g.group }}</span>
              </el-checkbox>
              <div class="perm-items">
                <el-checkbox
                  v-for="item in g.items"
                  :key="item.code"
                  :model-value="checkedPerms.includes(item.code)"
                  @change="(val: string | number | boolean) => togglePerm(item.code, Boolean(val))"
                >
                  {{ item.name }}
                  <span class="perm-desc" v-if="item.desc">{{ item.desc }}</span>
                </el-checkbox>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Plus, RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiRole, type AdminRole, type PermissionGroup } from '@/api'
import SfPageContainer from '@/components/SfPageContainer.vue'

const loading = ref(false)
const saving = ref(false)
const list = ref<AdminRole[]>([])
const permissionTree = ref<PermissionGroup[]>([])
const editVisible = ref(false)
const editForm = reactive<Partial<AdminRole>>({ name: '', description: '', permissions: [] })
const checkedPerms = ref<string[]>([])

const load = async () => {
  loading.value = true
  try {
    list.value = await apiRole.getList()
  } finally {
    loading.value = false
  }
}

const loadTree = async () => {
  try {
    permissionTree.value = await apiRole.getPermissionTree()
  } catch { /* ignore */ }
}

const openEdit = (row: AdminRole | null) => {
  if (row) {
    Object.assign(editForm, { ...row })
    checkedPerms.value = [...(row.permissions || [])]
  } else {
    Object.assign(editForm, { id: undefined, name: '', description: '', permissions: [], isBuiltin: 0 })
    checkedPerms.value = []
  }
  editVisible.value = true
}

const groupChecked = (group: string) => {
  const codes = permissionTree.value.find(g => g.group === group)?.items.map(i => i.code) || []
  return codes.length > 0 && codes.every(c => checkedPerms.value.includes(c))
}

const groupIndeterminate = (group: string) => {
  const codes = permissionTree.value.find(g => g.group === group)?.items.map(i => i.code) || []
  const checked = codes.filter(c => checkedPerms.value.includes(c)).length
  return checked > 0 && checked < codes.length
}

const toggleGroup = (group: string, val: boolean) => {
  const codes = permissionTree.value.find(g => g.group === group)?.items.map(i => i.code) || []
  const set = new Set(checkedPerms.value)
  for (const c of codes) {
    if (val) set.add(c)
    else set.delete(c)
  }
  checkedPerms.value = [...set]
}

const togglePerm = (code: string, val: boolean) => {
  const set = new Set(checkedPerms.value)
  if (val) set.add(code)
  else set.delete(code)
  checkedPerms.value = [...set]
}

const save = async () => {
  if (!editForm.name?.trim()) {
    ElMessage.warning('请输入角色名称')
    return
  }
  saving.value = true
  try {
    if (editForm.id) {
      await apiRole.update(editForm.id, {
        name: editForm.name, description: editForm.description, permissions: checkedPerms.value,
      })
      ElMessage.success('角色已更新')
    } else {
      await apiRole.create({
        name: editForm.name, description: editForm.description, permissions: checkedPerms.value,
      })
      ElMessage.success('角色已创建')
    }
    editVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row: AdminRole, val: boolean) => {
  await apiRole.update(row.id, { status: val ? 1 : 0 })
  ElMessage.success(val ? '已启用' : '已停用')
  load()
}

const removeRole = async (row: AdminRole) => {
  try {
    await ElMessageBox.confirm(`确认删除角色「${row.name}」？`, '删除角色', {
      type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger',
    })
  } catch { return }
  await apiRole.remove(row.id)
  ElMessage.success('已删除')
  load()
}

const seedBuiltin = async () => {
  try {
    await ElMessageBox.confirm('将内置角色（超级管理员/运营/财务/客服）重置为默认权限，确认继续？', '重置内置角色', { type: 'warning' })
  } catch { return }
  await apiRole.seedBuiltin()
  ElMessage.success('内置角色已重置')
  load()
}

onMounted(() => {
  load()
  loadTree()
})
</script>

<style scoped>
.role-name { font-weight: 600; }
.role-code { font-size: 12px; color: #626A73; background: #F8F9FB; padding: 2px 6px; border-radius: 4px; }
.perm-tree { width: 100%; max-height: 380px; overflow-y: auto; border: 1px solid #E7E9ED; border-radius: 6px; padding: 8px 12px; }
.perm-group { padding: 8px 0; border-bottom: 1px dashed #E7E9ED; }
.perm-group:last-child { border-bottom: none; }
.perm-group-name { font-weight: 600; font-size: 13px; }
.perm-items { display: flex; flex-wrap: wrap; gap: 4px 18px; margin: 8px 0 0 24px; }
.perm-items :deep(.el-checkbox) { margin-right: 0; }
.perm-desc { color: #9AA1AA; font-size: 11px; margin-left: 2px; }
</style>
