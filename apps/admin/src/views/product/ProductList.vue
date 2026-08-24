<template>
  <div class="sf-page">
    <SfPageContainer title="商品管理" description="管理商城商品、上下架、库存与价格">
      <template #header>
        <el-button type="primary" :icon="Plus" @click="openEdit(null)">新增商品</el-button>
      </template>

      <!-- 搜索栏 -->
      <div class="sf-card">
        <div class="sf-search-bar">
          <div class="sf-search-item">
            <span class="sf-search-label">关键词</span>
            <el-input v-model="filters.keyword" placeholder="商品名称/品牌" clearable style="width: 200px" @keyup.enter="search" />
          </div>
          <div class="sf-search-item">
            <span class="sf-search-label">分类</span>
            <el-select v-model="filters.categoryId" placeholder="全部分类" clearable style="width: 160px">
              <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </div>
          <el-button type="primary" :icon="Search" @click="search">搜索</el-button>
          <el-button :icon="RefreshLeft" @click="resetSearch">重置</el-button>
        </div>
      </div>

      <!-- 表格 -->
      <div class="sf-card">
        <div v-if="selectedIds.length" class="batch-bar">
          <span>已选 <b class="batch-count">{{ selectedIds.length }}</b> 个商品</span>
          <el-button type="success" size="small" @click="batchStatus(1)">批量上架</el-button>
          <el-button type="warning" size="small" @click="batchStatus(0)">批量下架</el-button>
          <el-button type="danger" size="small" plain @click="batchRemove">批量删除</el-button>
          <el-button size="small" @click="clearSelection">取消选择</el-button>
        </div>
        <el-table :data="list" v-loading="loading" stripe @selection-change="onSelectionChange">
          <el-table-column type="selection" width="46" />
          <el-table-column label="商品图片" width="80">
            <template #default="{ row }">
              <el-image :src="row.mainImage" class="product-img" fit="cover" preview-teleported :preview-src-list="[row.mainImage]" />
            </template>
          </el-table-column>
          <el-table-column label="商品名称" prop="name" min-width="180" show-overflow-tooltip />
          <el-table-column label="品牌" prop="brand" min-width="110" />
          <el-table-column label="分类" min-width="100">
            <template #default="{ row }">{{ getCategoryName(row.categoryId) }}</template>
          </el-table-column>
          <el-table-column label="SKU/库存" min-width="130">
            <template #default="{ row }">
              <div v-if="skuSummary[row.id]" class="sku-summary">
                <span>{{ skuSummary[row.id].count }} 个规格</span>
                <span class="stock-text">总库存 {{ skuSummary[row.id].stock }}</span>
              </div>
              <span v-else class="empty-tip">-</span>
            </template>
          </el-table-column>
          <el-table-column label="标签" min-width="150">
            <template #default="{ row }">
              <el-tag v-if="row.isGiftPackage" type="danger" size="small" effect="plain" class="tag-margin">大礼包</el-tag>
              <el-tag v-if="row.isMonthlyProduct" type="warning" size="small" effect="plain" class="tag-margin">领货商品</el-tag>
              <el-tag v-if="row.excludeDiscount" type="info" size="small" effect="plain" class="tag-margin">排除折扣</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small" effect="light">
                {{ row.status === 1 ? '上架' : '下架' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row as ProductSPU)">编辑</el-button>
              <el-button link :type="row.status === 1 ? 'warning' : 'success'" @click="toggleStatus(row as ProductSPU)">
                {{ row.status === 1 ? '下架' : '上架' }}
              </el-button>
              <el-button link type="danger" @click="removeProduct(row as ProductSPU)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="sf-pagination">
          <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
            layout="total, prev, pager, next, jumper" background @current-change="load" />
        </div>
      </div>
    </SfPageContainer>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" :title="editForm.id ? '编辑商品' : '新增商品'" width="640px" destroy-on-close>
      <el-form ref="editFormRef" :model="editForm" label-width="100px">
        <el-form-item label="商品名称" prop="name" required>
          <el-input v-model="editForm.name" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="品牌">
          <el-input v-model="editForm.brand" placeholder="请输入品牌" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="editForm.categoryId" placeholder="选择分类" style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="主图">
          <SfFilePicker v-model="editForm.mainImage" accept="image" placeholder="上传主图" title="选择商品主图" />
        </el-form-item>
        <el-form-item label="详情图">
          <SfFilePicker v-model="editForm.images" :multiple="true" accept="image" placeholder="上传详情图" title="选择详情图" />
        </el-form-item>
        <el-form-item label="商品描述">
          <el-input v-model="editForm.description" type="textarea" :rows="3" placeholder="商品描述" />
        </el-form-item>
        <el-form-item label="商品标签">
          <el-checkbox v-model="editForm.isGiftPackage">大礼包商品</el-checkbox>
          <el-checkbox v-model="editForm.isMonthlyProduct">领货商品</el-checkbox>
          <el-checkbox v-model="editForm.excludeDiscount">排除会员折扣</el-checkbox>
        </el-form-item>

        <!-- SKU 编辑 -->
        <el-form-item label="SKU 规格" v-if="editSkus.length || editForm.id">
          <el-table :data="editSkus" border size="small" style="width: 100%">
            <el-table-column label="规格" prop="skuName" min-width="140" />
            <el-table-column label="销售价" width="120">
              <template #default="{ row }">
                <el-input-number v-model="row.price" :min="0" :precision="2" :controls="false" style="width: 100%" />
              </template>
            </el-table-column>
            <el-table-column label="成本价" width="120">
              <template #default="{ row }">
                <el-input-number v-model="row.costPrice" :min="0" :precision="2" :controls="false" style="width: 100%" />
              </template>
            </el-table-column>
            <el-table-column label="库存" width="120">
              <template #default="{ row }">
                <el-input-number v-model="row.stock" :min="0" :controls="false" style="width: 100%" />
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-switch v-model="row.status" :active-value="1" :inactive-value="0" />
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveProduct">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiProduct, apiCategory } from '@/api'
import { type ProductSPU, type ProductCategory, type ProductSKU, ProductStatus } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfFilePicker from '@/components/SfFilePicker.vue'

const loading = ref(false)
const saving = ref(false)
const list = ref<ProductSPU[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', categoryId: '' as number | '' })
const categories = ref<ProductCategory[]>([])
const skuSummary = ref<Record<number, { count: number; stock: number }>>({})

const editVisible = ref(false)
const editForm = reactive<Partial<ProductSPU>>({
  name: '', brand: '', categoryId: undefined, mainImage: '', images: [], description: '',
  isGiftPackage: false, isMonthlyProduct: false, excludeDiscount: false,
})
const editSkus = ref<ProductSKU[]>([])

const selectedRows = ref<ProductSPU[]>([])
const selectedIds = computed(() => selectedRows.value.map(r => r.id))

const getCategoryName = (id: number) => categories.value.find(c => c.id === id)?.name || '-'

const load = async () => {
  loading.value = true
  try {
    const res = await apiProduct.getList({ page: page.value, pageSize: pageSize.value, ...filters })
    list.value = res.list
    total.value = res.total
    selectedRows.value = []
    // 汇总每个 SPU 的 SKU 数与总库存
    const summary: Record<number, { count: number; stock: number }> = {}
    for (const p of res.list) {
      const skus = await apiProduct.getSkus(p.id)
      summary[p.id] = {
        count: skus.length,
        stock: skus.reduce((s, k) => s + k.stock, 0),
      }
    }
    skuSummary.value = summary
  } finally {
    loading.value = false
  }
}

const search = () => { page.value = 1; load() }
const resetSearch = () => { filters.keyword = ''; filters.categoryId = ''; search() }

const onSelectionChange = (rows: ProductSPU[]) => { selectedRows.value = rows }
const clearSelection = () => { selectedRows.value = [] }

const openEdit = async (row: ProductSPU | null) => {
  if (row) {
    Object.assign(editForm, row)
    editSkus.value = await apiProduct.getSkus(row.id)
  } else {
    Object.assign(editForm, { name: '', brand: '', categoryId: undefined, mainImage: '', images: [], description: '', isGiftPackage: false, isMonthlyProduct: false, excludeDiscount: false, status: 1, sort: 0 })
    editSkus.value = []
  }
  editVisible.value = true
}

const saveProduct = async () => {
  if (!editForm.name) {
    ElMessage.warning('请输入商品名称')
    return
  }
  saving.value = true
  try {
    const saved = await apiProduct.save(editForm)
    // 保存 SKU（有 SKU 数据时）
    if (editSkus.value.length) {
      await apiProduct.saveSkus(saved.id, editSkus.value)
    }
    ElMessage.success('保存成功')
    editVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row: ProductSPU) => {
  await apiProduct.toggleStatus(row.id)
  ElMessage.success(row.status === 1 ? '已下架' : '已上架')
  load()
}

const batchStatus = async (status: number) => {
  await apiProduct.batchToggleStatus(selectedIds.value, status)
  ElMessage.success(status === 1 ? `已上架 ${selectedIds.value.length} 个商品` : `已下架 ${selectedIds.value.length} 个商品`)
  load()
}

const removeProduct = async (row: ProductSPU) => {
  try {
    await ElMessageBox.confirm(`确认删除商品「${row.name}」？其所有 SKU 将一并删除。`, '删除商品', {
      type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger',
    })
  } catch { return }
  await apiProduct.remove(row.id)
  ElMessage.success('已删除')
  load()
}

const batchRemove = async () => {
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 个商品？此操作不可恢复。`, '批量删除', {
      type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger',
    })
  } catch { return }
  for (const id of selectedIds.value) {
    await apiProduct.remove(id)
  }
  ElMessage.success('批量删除完成')
  load()
}

onMounted(async () => {
  categories.value = await apiCategory.getList()
  load()
})
</script>

<style scoped>
.product-img {
  width: 48px;
  height: 48px;
  border-radius: 6px;
}
.tag-margin {
  margin: 2px;
}
.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 12px;
  background: #ecf5ff;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;
}
.batch-count {
  color: #409eff;
  font-size: 16px;
}
.sku-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #606266;
}
.stock-text {
  color: #909399;
}
.empty-tip {
  color: #c0c4cc;
}
</style>
