<template>
  <div class="sf-page">
    <SfPageContainer title="管理员管理" description="管理后台账号与角色权限">
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
          <el-table-column label="姓名" prop="name" min-width="120" />
          <el-table-column label="账号" prop="username" min-width="120" />
          <el-table-column label="角色" min-width="120">
            <template #default="{ row }">
              <el-tag :type="row.role === '超级管理员' ? 'danger' : 'info'" size="small" effect="light">{{ row.role }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最后登录" prop="lastLogin" min-width="180" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-switch
                :model-value="row.status"
                :disabled="row.role === '超级管理员'"
                @change="(val: string | number | boolean) => toggleStatus(row as AdminAccount, Boolean(val))"
                style="--el-switch-on-color: #39b54a"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row as AdminAccount)">编辑</el-button>
              <el-button link type="danger" :disabled="row.role === '超级管理员'" @click="removeAdmin(row as AdminAccount)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </SfPageContainer>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog v-model="editVisible" :title="editForm.id ? '编辑管理员' : '新增管理员'" width="460px" destroy-on-close>
      <el-form ref="formRef" :model="editForm" :rules="rules" label-width="90px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入姓名" maxlength="20" />
        </el-form-item>
        <el-form-item label="登录账号" prop="username">
          <el-input v-model="editForm.username" placeholder="请输入登录账号" maxlength="30" :disabled="editForm.role === '超级管理员'" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="editForm.role" style="width: 100%">
            <el-option label="超级管理员" value="超级管理员" />
            <el-option label="运营" value="运营" />
            <el-option label="财务" value="财务" />
            <el-option label="客服" value="客服" />
          </el-select>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { apiAdmin, type AdminAccount } from '@/api'
import SfPageContainer from '@/components/SfPageContainer.vue'

const loading = ref(false)
const saving = ref(false)
const list = ref<AdminAccount[]>([])

const editVisible = ref(false)
const editForm = reactive<Partial<AdminAccount>>({ name: '', username: '', role: '运营', status: true })
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

const openEdit = (row: AdminAccount | null) => {
  if (row) {
    Object.assign(editForm, row)
  } else {
    Object.assign(editForm, { id: undefined, name: '', username: '', role: '运营', status: true })
  }
  editVisible.value = true
}

const save = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (editForm.id) {
      await apiAdmin.update(editForm.id, editForm)
      ElMessage.success('已保存')
    } else {
      await apiAdmin.create(editForm)
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

onMounted(load)
</script>
