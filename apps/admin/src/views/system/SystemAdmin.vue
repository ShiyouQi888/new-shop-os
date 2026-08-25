<template>
  <div class="sf-page">
    <SfPageContainer title="管理员管理" description="管理后台账号，分配角色与权限">
      <template #header>
        <el-button type="primary" :icon="Plus" @click="openEdit(null)">新增管理员</el-button>
      </template>
      <div class="sf-card" v-loading="loading">
        <el-table :data="list" border>
          <el-table-column label="头像" width="70">
            <template #default="{ row }">
              <el-avatar :size="36" :src="row.avatar" />
            </template>
          </el-table-column>
          <el-table-column label="姓名" prop="name" min-width="110" />
          <el-table-column label="账号" prop="username" min-width="120" />
          <el-table-column label="角色" min-width="120">
            <template #default="{ row }">
              <el-tag :type="row.role === 'super_admin' ? 'danger' : 'info'" size="small" effect="light">
                {{ row.roleName || row.role }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最后登录" prop="lastLogin" min-width="180" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-switch
                :model-value="row.status"
                :disabled="row.role === 'super_admin'"
                @change="(val: string | number | boolean) => toggleStatus(row as AdminAccount, Boolean(val))"
                style="--el-switch-on-color: #18A66A"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row as AdminAccount)">编辑</el-button>
              <el-button link type="warning" @click="openResetPwd(row as AdminAccount)">重置密码</el-button>
              <el-button link type="danger" :disabled="row.role === 'super_admin'" @click="removeAdmin(row as AdminAccount)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </SfPageContainer>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog v-model="editVisible" :title="editForm.id ? '编辑管理员' : '新增管理员'" width="480px" destroy-on-close>
      <el-form ref="formRef" :model="editForm" :rules="rules" label-width="100px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入姓名" maxlength="20" />
        </el-form-item>
        <el-form-item label="登录账号" prop="username">
          <el-input v-model="editForm.username" placeholder="请输入登录账号" maxlength="30" :disabled="!!editForm.id" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="editForm.role" style="width: 100%" :disabled="editForm.role === 'super_admin'">
            <el-option v-for="r in roles" :key="r.code" :label="r.name" :value="r.code" />
          </el-select>
          <div class="form-tip" v-if="editForm.role === 'super_admin'">超级管理员拥有全部权限，角色不可变更</div>
        </el-form-item>
        <el-form-item label="登录密码" prop="password" v-if="!editForm.id">
          <el-input v-model="editForm.password" type="password" show-password placeholder="默认 123456，最少 6 位" maxlength="50" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="editForm.status">
            <el-radio :value="true">正常</el-radio>
            <el-radio :value="false">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码弹窗 -->
    <el-dialog v-model="pwdVisible" title="重置登录密码" width="420px" destroy-on-close>
      <el-form label-width="90px">
        <el-form-item label="账号">
          <span>{{ current?.username }}（{{ current?.roleName || current?.role }}）</span>
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="newPassword" type="password" show-password placeholder="最少 6 位" maxlength="50" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="confirmResetPwd">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { apiAdmin, apiRole, type AdminAccount, type AdminRole } from '@/api'
import SfPageContainer from '@/components/SfPageContainer.vue'

const loading = ref(false)
const saving = ref(false)
const list = ref<AdminAccount[]>([])
const roles = ref<AdminRole[]>([])

const editVisible = ref(false)
const pwdVisible = ref(false)
const editForm = reactive<Partial<AdminAccount>>({ name: '', username: '', role: 'ops', status: true, password: '' })
const current = ref<AdminAccount | null>(null)
const newPassword = ref('')
const formRef = ref<FormInstance>()
const rules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const load = async () => {
  loading.value = true
  try {
    list.value = await apiAdmin.getList()
  } finally {
    loading.value = false
  }
}

const loadRoles = async () => {
  try {
    roles.value = await apiRole.getList()
  } catch { /* 权限不足或后端未就绪 */ }
}

const openEdit = (row: AdminAccount | null) => {
  if (row) {
    Object.assign(editForm, { ...row, password: '' })
  } else {
    Object.assign(editForm, { id: undefined, name: '', username: '', role: 'ops', status: true, password: '' })
  }
  editVisible.value = true
}

const save = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (editForm.id) {
      await apiAdmin.update(editForm.id, { name: editForm.name, role: editForm.role })
      ElMessage.success('已保存')
    } else {
      await apiAdmin.create({
        name: editForm.name, username: editForm.username!,
        role: editForm.role!, password: editForm.password || undefined,
      })
      ElMessage.success('已创建')
    }
    editVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row: AdminAccount, val: boolean) => {
  await apiAdmin.toggleStatus(row.id)
  ElMessage.success(val ? '已启用' : '已禁用')
  load()
}

const openResetPwd = (row: AdminAccount) => {
  current.value = row
  newPassword.value = ''
  pwdVisible.value = true
}

const confirmResetPwd = async () => {
  if (!current.value) return
  if (newPassword.value.length < 6) {
    ElMessage.warning('密码最少 6 位')
    return
  }
  saving.value = true
  try {
    await apiAdmin.update(current.value.id, { password: newPassword.value })
    ElMessage.success('密码已重置')
    pwdVisible.value = false
  } finally {
    saving.value = false
  }
}

const removeAdmin = async (row: AdminAccount) => {
  try {
    await ElMessageBox.confirm(`确认删除管理员「${row.name}」？删除后无法登录后台。`, '删除管理员', {
      type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger',
    })
  } catch { return }
  await apiAdmin.remove(row.id)
  ElMessage.success('已删除')
  load()
}

onMounted(() => {
  load()
  loadRoles()
})
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #626A73;
  margin-top: 4px;
}
</style>
