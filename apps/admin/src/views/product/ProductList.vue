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
    <el-dialog
      v-model="editVisible"
      :title="editForm.id ? '编辑商品' : '新增商品'"
      width="min(1180px, calc(100vw - 48px))"
      class="product-dialog"
      destroy-on-close
    >
      <el-form ref="editFormRef" :model="editForm" label-width="88px">
        <div class="product-form-grid">
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
          <el-form-item label="商品标签">
            <div class="tag-checks">
              <el-checkbox v-model="editForm.isGiftPackage">大礼包商品</el-checkbox>
              <el-checkbox v-model="editForm.isMonthlyProduct">领货商品</el-checkbox>
              <el-checkbox v-model="editForm.excludeDiscount">排除会员折扣</el-checkbox>
            </div>
          </el-form-item>
          <el-form-item label="主图">
            <SfFilePicker v-model="editForm.mainImage" accept="image" placeholder="上传主图" title="选择商品主图" />
          </el-form-item>
          <el-form-item label="详情图">
            <SfFilePicker v-model="editForm.images" :multiple="true" accept="image" placeholder="上传详情图" title="选择详情图" />
          </el-form-item>
          <el-form-item label="商品描述" class="form-wide">
            <el-input v-model="editForm.description" type="textarea" :rows="2" placeholder="商品描述" />
          </el-form-item>
        </div>

        <!-- SKU 编辑 -->
        <el-form-item label="SKU 规格" required>
          <div class="sku-editor">
            <div class="sku-toolbar">
              <div>
                <strong>规格列表</strong>
                <span>用于前台购买、库存扣减和大礼包内容引用</span>
              </div>
              <el-button type="primary" plain :icon="Plus" @click="addSku">新增 SKU</el-button>
            </div>

            <el-table :data="editSkus" border size="small" style="width: 100%">
              <el-table-column label="SKU 名称" min-width="170">
                <template #default="{ row }">
                  <el-input v-model="row.skuName" placeholder="如：黑色 / 150g×3" />
                </template>
              </el-table-column>
              <el-table-column label="规格键值" min-width="240">
                <template #default="{ row }">
                  <div class="spec-list">
                    <div v-for="spec in getSpecRows(row)" :key="spec.key" class="spec-row">
                      <el-input v-model="spec.key" placeholder="规格名" @change="syncSpecRows(row, getSpecRows(row))" />
                      <el-input v-model="spec.value" placeholder="规格值" @change="syncSpecRows(row, getSpecRows(row))" />
                      <el-button link type="danger" :icon="Delete" @click="removeSpec(row, spec.key)" />
                    </div>
                    <el-button link type="primary" :icon="Plus" @click="addSpec(row)">添加规格项</el-button>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="SKU 图" width="122">
                <template #default="{ row }">
                  <SfFilePicker v-model="row.image" accept="image" placeholder="选择" title="选择 SKU 图片" />
                </template>
              </el-table-column>
              <el-table-column label="销售价" width="120">
                <template #default="{ row }">
                  <el-input-number v-model="row.price" :min="0" :precision="2" :controls="false" style="width: 100%" />
                </template>
              </el-table-column>
              <el-table-column label="成本/参考原价" width="138">
                <template #default="{ row }">
                  <el-input-number v-model="row.costPrice" :min="0" :precision="2" :controls="false" style="width: 100%" />
                </template>
              </el-table-column>
              <el-table-column label="库存" width="110">
                <template #default="{ row }">
                  <el-input-number v-model="row.stock" :min="0" :controls="false" style="width: 100%" />
                </template>
              </el-table-column>
              <el-table-column label="状态" width="86" align="center">
                <template #default="{ row }">
                  <el-switch v-model="row.status" :active-value="1" :inactive-value="0" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="70" align="center">
                <template #default="{ row, $index }">
                  <el-button link type="danger" @click="removeSku(row, $index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>

            <el-empty v-if="!editSkus.length" description="请至少新增一个 SKU 规格" :image-size="72" />
          </div>
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
import { Delete, Plus, Search, RefreshLeft } from '@element-plus/icons-vue'
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
type EditableSku = ProductSKU & { image?: string; originalPrice?: number }
const editForm = reactive<Partial<ProductSPU>>({
  name: '', brand: '', categoryId: undefined, mainImage: '', images: [], description: '',
  isGiftPackage: false, isMonthlyProduct: false, excludeDiscount: false,
})
const editSkus = ref<EditableSku[]>([])
const deletedSkuIds = ref<number[]>([])
const specRowsMap = reactive<Record<string, { key: string; value: string }[]>>({})

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

const normalizeSku = (sku: ProductSKU & { originalPrice?: number; image?: string }): EditableSku => ({
  ...sku,
  specInfo: sku.specInfo || {},
  costPrice: Number(sku.costPrice ?? sku.originalPrice ?? sku.price ?? 0),
  stockLocked: Number(sku.stockLocked ?? 0),
  image: sku.image || '',
})

const specKey = (sku: EditableSku) => String(sku.id || editSkus.value.indexOf(sku))

const getSpecRows = (sku: EditableSku) => {
  const key = specKey(sku)
  if (!specRowsMap[key]) {
    specRowsMap[key] = Object.entries(sku.specInfo || {}).map(([name, value]) => ({ key: name, value }))
  }
  return specRowsMap[key]
}

const syncSpecRows = (sku: EditableSku, rows: { key: string; value: string }[]) => {
  const next: Record<string, string> = {}
  rows.forEach(item => {
    const key = item.key.trim()
    if (key) next[key] = item.value.trim()
  })
  sku.specInfo = next
}

const addSpec = (sku: EditableSku) => {
  const rows = getSpecRows(sku)
  rows.push({ key: '', value: '' })
}

const removeSpec = (sku: EditableSku, key: string) => {
  const rows = getSpecRows(sku)
  const index = rows.findIndex(item => item.key === key)
  if (index >= 0) rows.splice(index, 1)
  syncSpecRows(sku, rows)
}

const addSku = () => {
  const index = editSkus.value.length + 1
  const sku: EditableSku = {
    id: 0,
    spuId: editForm.id || 0,
    skuName: index === 1 ? '默认规格' : `规格 ${index}`,
    specInfo: { 规格: index === 1 ? '默认' : String(index) },
    price: 0,
    costPrice: 0,
    stock: 0,
    stockLocked: 0,
    status: ProductStatus.OnSale,
    image: '',
  }
  editSkus.value.push(sku)
  specRowsMap[specKey(sku)] = Object.entries(sku.specInfo).map(([key, value]) => ({ key, value }))
}

const removeSku = async (sku: EditableSku, index: number) => {
  if (sku.id) {
    try {
      await ElMessageBox.confirm(`确认删除 SKU「${sku.skuName}」？大礼包或订单引用该规格时请谨慎操作。`, '删除 SKU', {
        type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger',
      })
    } catch { return }
    deletedSkuIds.value.push(sku.id)
  }
  editSkus.value.splice(index, 1)
}

const openEdit = async (row: ProductSPU | null) => {
  Object.keys(specRowsMap).forEach(key => { delete specRowsMap[key] })
  deletedSkuIds.value = []
  if (row) {
    Object.assign(editForm, row)
    editSkus.value = (await apiProduct.getSkus(row.id)).map(normalizeSku)
  } else {
    Object.assign(editForm, { name: '', brand: '', categoryId: undefined, mainImage: '', images: [], description: '', isGiftPackage: false, isMonthlyProduct: false, excludeDiscount: false, status: 1, sort: 0 })
    editSkus.value = []
    addSku()
  }
  editVisible.value = true
}

const saveProduct = async () => {
  if (!editForm.name) {
    ElMessage.warning('请输入商品名称')
    return
  }
  if (!editSkus.value.length) {
    ElMessage.warning('请至少创建一个 SKU 规格')
    return
  }
  const invalidSku = editSkus.value.find(sku => !sku.skuName.trim() || sku.price < 0 || sku.stock < 0)
  if (invalidSku) {
    ElMessage.warning('请完善 SKU 名称、价格和库存')
    return
  }
  saving.value = true
  try {
    const saved = await apiProduct.save(editForm)
    if (deletedSkuIds.value.length) {
      await Promise.all(deletedSkuIds.value.map(id => apiProduct.removeSku(saved.id, id)))
    }
    await apiProduct.saveSkus(saved.id, editSkus.value.map(sku => ({ ...sku, spuId: saved.id })))
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
  background: #FFF1EB;
  border-radius: 6px;
  font-size: 13px;
  color: #626A73;
}
.batch-count {
  color: #FF6B35;
  font-size: 16px;
}
.sku-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #626A73;
}
.stock-text {
  color: #626A73;
}
.empty-tip {
  color: #9AA1AA;
}
:deep(.product-dialog) {
  margin-top: 5vh;
}
:deep(.product-dialog .el-dialog__body) {
  max-height: calc(90vh - 132px);
  overflow: auto;
  padding-top: 10px;
}
.product-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 22px;
  padding-right: 4px;
}
.product-form-grid :deep(.el-form-item) {
  min-width: 0;
}
.form-wide {
  grid-column: 1 / -1;
}
.tag-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
}
.sku-editor {
  width: 100%;
  min-width: 0;
}
.sku-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  margin-bottom: 12px;
  border: 1px solid #FFD5C5;
  border-radius: 10px;
  background: #FFF1EB;
}
.sku-toolbar strong {
  display: block;
  color: #171A1F;
  font-size: 14px;
}
.sku-toolbar span {
  display: block;
  margin-top: 3px;
  color: #626A73;
  font-size: 12px;
}
.spec-list {
  display: grid;
  gap: 6px;
}
.spec-row {
  display: grid;
  grid-template-columns: minmax(72px, 1fr) minmax(88px, 1fr) 28px;
  gap: 6px;
  align-items: center;
}
@media (max-width: 860px) {
  .product-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
