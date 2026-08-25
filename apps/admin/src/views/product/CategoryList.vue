<template>
  <div class="sf-page">
    <SfPageContainer title="商品分类" description="管理商品分类树，支持二级分类与入会专区标记">
      <template #header>
        <el-button type="primary" :icon="Plus" @click="openEdit(null)">新增一级分类</el-button>
      </template>

      <div class="sf-card" v-loading="loading">
        <el-table :data="treeData" row-key="id" border default-expand-all>
          <el-table-column label="分类名称" prop="name" min-width="240">
            <template #default="{ row }">
              <SfIcon :name="row.icon || 'folder'" class="category-icon" />
              {{ row.name }}
              <el-tag v-if="row.isGiftZone" type="danger" size="small" effect="plain" style="margin-left: 8px">入会专区</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="排序" prop="sort" width="90" align="center" />
          <el-table-column label="商品数" width="90" align="center">
            <template #default="{ row }">{{ countByCategory(row.id) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-switch
                :model-value="row.status === 1"
                :disabled="row.isGiftZone"
                @change="(val: string | number | boolean) => toggleStatus(row as ProductCategory, Boolean(val))"
                style="--el-switch-on-color: #18A66A"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="230" align="center">
            <template #default="{ row }">
              <el-button v-if="row.parentId === 0" link type="primary" :icon="Plus" @click="openEdit(null, row.id)">添加子分类</el-button>
              <el-button link type="primary" @click="openEdit(row as ProductCategory)">编辑</el-button>
              <el-button link type="danger" @click="removeCategory(row as ProductCategory)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </SfPageContainer>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog v-model="editVisible" :title="editForm.id ? '编辑分类' : editForm.parentId ? '新增子分类' : '新增一级分类'" width="480px" destroy-on-close>
      <el-form ref="formRef" :model="editForm" :rules="rules" label-width="90px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入分类名称" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="上级分类" v-if="!editForm.parentId && editForm.id === undefined">
          <el-select v-model="editForm.parentId" style="width: 100%">
            <el-option label="顶级分类" :value="0" />
            <el-option v-for="c in topCategories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="图标">
          <SfIconSelect v-model="editForm.icon" scope="category" placeholder="选择图标" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="editForm.sort" :min="0" :max="9999" style="width: 160px" />
          <div class="form-tip">数字越小越靠前</div>
        </el-form-item>
        <el-form-item label="入会专区" v-if="editForm.parentId === 0">
          <el-switch v-model="editForm.isGiftZone" />
          <div class="form-tip">开启后该分类下商品仅作为入会大礼包</div>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="editForm.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">停用</el-radio>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { apiCategory, apiProduct } from '@/api'
import { type ProductCategory, ProductStatus } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfIcon from '@/components/SfIcon.vue'
import SfIconSelect from '@/components/SfIconSelect.vue'

const loading = ref(false)
const saving = ref(false)
const categories = ref<ProductCategory[]>([])
const productCounts = ref<Record<number, number>>({})

const treeData = computed(() => {
  const roots = categories.value.filter(c => c.parentId === 0)
  return roots.map(root => ({
    ...root,
    children: categories.value.filter(c => c.parentId === root.id),
  }))
})

const topCategories = computed(() => categories.value.filter(c => c.parentId === 0))

const countByCategory = (id: number) => productCounts.value[id] || 0

const editVisible = ref(false)
const editForm = reactive<Partial<ProductCategory>>({ name: '', icon: '', parentId: 0, sort: 0, isGiftZone: false, status: ProductStatus.OnSale })
const formRef = ref<FormInstance>()
const rules: FormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
}

const load = async () => {
  loading.value = true
  try {
    categories.value = await apiCategory.getList()
    // 统计每个分类下的商品数
    const counts: Record<number, number> = {}
    const products = await apiProduct.getList({ page: 1, pageSize: 100 })
    products.list.forEach(p => {
      if (p.categoryId) counts[p.categoryId] = (counts[p.categoryId] || 0) + 1
    })
    productCounts.value = counts
  } finally {
    loading.value = false
  }
}

const openEdit = (row: ProductCategory | null, parentId = 0) => {
  if (row) {
    Object.assign(editForm, row)
  } else {
    Object.assign(editForm, { id: undefined, name: '', icon: '', parentId, sort: 0, isGiftZone: false, status: ProductStatus.OnSale })
  }
  editVisible.value = true
}

const save = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (editForm.id) {
      await apiCategory.update(editForm.id, editForm)
      ElMessage.success('分类已更新')
    } else {
      await apiCategory.create(editForm)
      ElMessage.success('分类已创建')
    }
    editVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row: ProductCategory, val: boolean) => {
  await apiCategory.update(row.id, { status: val ? ProductStatus.OnSale : ProductStatus.OffSale })
  ElMessage.success(val ? '已启用' : '已停用')
  load()
}

const removeCategory = async (row: ProductCategory) => {
  try {
    await ElMessageBox.confirm(
      `确认删除分类「${row.name}」？${row.parentId === 0 ? '其下子分类将一并删除，' : ''}该分类下商品将变为未分类。`,
      '删除分类',
      { type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger' },
    )
  } catch { return }
  await apiCategory.remove(row.id)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>

<style scoped>
.category-icon {
  margin-right: 6px;
}
.form-tip {
  font-size: 12px;
  color: #626A73;
  margin-left: 8px;
}
</style>
