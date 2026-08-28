<template>
  <div class="sf-page">
    <SfPageContainer title="轮播图管理" description="配置商城首页轮播图，支持跳转链接、启用状态与排序">
      <template #header>
        <el-button type="primary" :icon="Plus" @click="openEdit(null)">新增轮播图</el-button>
      </template>

      <div class="sf-card">
        <el-alert title="商城首页会按排序依次展示全部已启用的轮播图；点击轮播图会跳转到配置的链接（留空则不可点击）。" type="info" :closable="false" show-icon style="margin-bottom: 16px" />
        <el-table :data="list" v-loading="loading" border>
          <el-table-column label="预览" width="160">
            <template #default="{ row }">
              <el-image :src="row.image" fit="cover" class="banner-thumb" :preview-src-list="[row.image]" preview-teleported />
            </template>
          </el-table-column>
          <el-table-column label="标题" prop="title" min-width="140">
            <template #default="{ row }">
              <span v-if="row.title">{{ row.title }}</span>
              <span v-else class="muted">未命名</span>
            </template>
          </el-table-column>
          <el-table-column label="跳转链接" min-width="160">
            <template #default="{ row }">
              <span v-if="row.link">{{ row.link }}</span>
              <span v-else class="muted">不可点击</span>
            </template>
          </el-table-column>
          <el-table-column label="启用" width="90" align="center">
            <template #default="{ row }">
              <el-switch :model-value="Number(row.status) === 1"
                @change="(v: string|number|boolean) => toggleStatus(row as Banner, Boolean(v))"
                style="--el-switch-on-color: #18A66A" />
            </template>
          </el-table-column>
          <el-table-column label="排序" prop="sort" width="80" align="center" />
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row as Banner)">编辑</el-button>
              <el-button link type="danger" @click="removeBanner(row as Banner)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!list.length && !loading" description="暂无轮播图，点击右上角「新增轮播图」上传" />
      </div>
    </SfPageContainer>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="editVisible" :title="editForm.id ? '编辑轮播图' : '新增轮播图'" width="520px" destroy-on-close>
      <el-form label-width="92px">
        <el-form-item label="轮播图片" required>
          <SfFilePicker v-model="editForm.image" accept="image" placeholder="上传轮播图片" title="选择轮播图片" />
        </el-form-item>
        <el-form-item label="内部备注">
          <el-input v-model="editForm.title" placeholder="仅后台展示，如：8月大促" maxlength="50" />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="editForm.link" placeholder="如：/gift-zone，留空则不可点击" maxlength="200" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="editForm.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="editForm.sort" :min="0" :max="999" style="width: 160px" />
          <div class="form-tip">数字越小越靠前</div>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiBanner, type Banner } from '@/api'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfFilePicker from '@/components/SfFilePicker.vue'

const loading = ref(false)
const saving = ref(false)
const list = ref<Banner[]>([])
const editVisible = ref(false)
const editForm = reactive<Partial<Banner>>({ id: undefined, title: '', image: '', link: '', status: 1, sort: 0 })

const load = async () => {
  loading.value = true
  try {
    list.value = await apiBanner.getList()
  } finally {
    loading.value = false
  }
}

const openEdit = (row: Banner | null) => {
  if (row) {
    Object.assign(editForm, { ...row })
  } else {
    Object.assign(editForm, { id: undefined, title: '', image: '', link: '', status: 1, sort: 0 })
  }
  editVisible.value = true
}

const save = async () => {
  if (!editForm.image) {
    ElMessage.warning('请先上传轮播图片')
    return
  }
  saving.value = true
  try {
    const payload = { title: editForm.title, image: editForm.image, link: editForm.link, status: editForm.status, sort: editForm.sort }
    if (editForm.id) {
      await apiBanner.update(editForm.id, payload)
      ElMessage.success('轮播图已更新')
    } else {
      await apiBanner.create(payload as { title?: string; image: string; link?: string; status?: number; sort?: number })
      ElMessage.success('轮播图已创建')
    }
    editVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row: Banner, val: boolean) => {
  await apiBanner.update(row.id, { status: val ? 1 : 0 })
  ElMessage.success(val ? '已启用' : '已停用')
  load()
}

const removeBanner = async (row: Banner) => {
  try {
    await ElMessageBox.confirm(`确认删除轮播图「${row.title || '未命名'}」？删除后前台不再展示。`, '删除轮播图', {
      type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger',
    })
  } catch { return }
  await apiBanner.remove(row.id)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>

<style scoped>
.banner-thumb {
  width: 120px;
  height: 52px;
  border-radius: 6px;
  display: block;
}
.muted {
  color: #9AA1AA;
}
.form-tip {
  font-size: 12px;
  color: #626A73;
  margin-top: 4px;
}
</style>
