<template>
  <div class="sf-page">
    <SfPageContainer title="帮助文档 / 规则条款" description="维护前台「客服与帮助」「规则中心」页展示的内容，可启停、按分类组织">
      <template #header>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增{{ scope === 'help' ? '文档' : '条款' }}</el-button>
      </template>

      <div class="sf-card">
        <div class="sf-search-bar">
          <el-radio-group v-model="scope" @change="load">
            <el-radio-button value="help">帮助文档</el-radio-button>
            <el-radio-button value="rules">规则条款</el-radio-button>
          </el-radio-group>
          <div class="sf-search-item">
            <span class="sf-search-label">关键词</span>
            <el-input v-model="keyword" placeholder="标题 / 内容" clearable style="width: 220px" @keyup.enter="load" />
          </div>
          <el-button type="primary" :icon="Search" @click="load">搜索</el-button>
        </div>

        <el-table :data="list" v-loading="loading" stripe>
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="row.scope === 'rules' ? 'warning' : 'primary'" size="small" effect="light">
                {{ row.scope === 'rules' ? '规则条款' : '帮助文档' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="标题" prop="title" min-width="200" show-overflow-tooltip />
          <el-table-column label="分类" width="120">
            <template #default="{ row }">
              <el-tag :type="CATEGORY_META[row.category]?.type || 'info'" size="small" effect="light">
                {{ CATEGORY_META[row.category]?.label || row.category }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="排序" prop="sort" width="80" align="center" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-switch
                :model-value="row.status"
                :active-value="1"
                :inactive-value="0"
                @change="(v: number | string | boolean) => toggleStatus(row as HelpArticle, v)"
              />
            </template>
          </el-table-column>
          <el-table-column label="更新时间" prop="updateTime" min-width="150" />
          <el-table-column label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row as HelpArticle)">编辑</el-button>
              <el-button link type="danger" @click="removeDoc(row as HelpArticle)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </SfPageContainer>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="editVisible" :title="editing ? '编辑' : '新增'" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="类型" prop="scope">
          <el-radio-group v-model="form.scope" :disabled="!!editing">
            <el-radio value="help">帮助文档</el-radio>
            <el-radio value="rules">规则条款</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="文档标题" maxlength="60" show-word-limit />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" style="width: 200px">
            <el-option v-for="(meta, key) in CATEGORY_META" :key="key" :label="meta.label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="999" style="width: 140px" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="8" maxlength="5000" show-word-limit placeholder="正文内容" />
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
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { apiHelp, type HelpArticle } from '@/api'
import SfPageContainer from '@/components/SfPageContainer.vue'

const CATEGORY_META: Record<string, { label: string; type?: 'primary' | 'success' | 'warning' | 'info' | 'danger' }> = {
  order: { label: '订单相关', type: 'primary' },
  member: { label: '会员权益', type: 'warning' },
  join: { label: '入会流程', type: 'success' },
  commission: { label: '佣金提现', type: 'danger' },
  aftersale: { label: '售后退款', type: 'info' },
  general: { label: '其他' },
}

const loading = ref(false)
const list = ref<HelpArticle[]>([])
const keyword = ref('')
const scope = ref<'help' | 'rules'>('help')

const editVisible = ref(false)
const saving = ref(false)
const editing = ref<HelpArticle | null>(null)
const formRef = ref<FormInstance>()
const form = reactive({ title: '', category: 'general', content: '', sort: 0, scope: 'help' as 'help' | 'rules' })
const rules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
}

const load = async () => {
  loading.value = true
  try {
    list.value = await apiHelp.getList(keyword.value.trim() || undefined, scope.value)
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editing.value = null
  Object.assign(form, { title: '', category: 'general', content: '', sort: 0, scope: scope.value })
  editVisible.value = true
}

const openEdit = (row: HelpArticle) => {
  editing.value = row
  Object.assign(form, { title: row.title, category: row.category, content: row.content, sort: row.sort, scope: row.scope })
  editVisible.value = true
}

const save = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    const payload = {
      title: form.title.trim(),
      category: form.category,
      content: form.content,
      sort: form.sort,
      scope: form.scope,
    }
    if (editing.value) {
      await apiHelp.update(editing.value.id, payload)
      ElMessage.success('已更新')
    } else {
      await apiHelp.create(payload)
      ElMessage.success('已创建')
    }
    editVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row: HelpArticle, v: number | string | boolean) => {
  const status = Number(v)
  await apiHelp.update(row.id, { status })
  row.status = status
  ElMessage.success(status ? '已启用' : '已下线')
}

const removeDoc = async (row: HelpArticle) => {
  try {
    await ElMessageBox.confirm(`确认删除文档「${row.title}」？`, '删除文档', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消',
    })
  } catch { return }
  await apiHelp.remove(row.id)
  ElMessage.success('文档已删除')
  load()
}

onMounted(load)
</script>
