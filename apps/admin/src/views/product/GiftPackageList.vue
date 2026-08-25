<template>
  <div class="sf-page">
    <SfPageContainer title="大礼包管理" description="管理入会大礼包商品、礼包内容与关联等级">
      <div class="sf-card" v-loading="loading">
        <el-table :data="list" border>
          <el-table-column label="礼包名称" prop="name" min-width="160" />
          <el-table-column label="价格" min-width="120">
            <template #default="{ row }">
              <SfPriceTag :value="row.price" size="large" />
            </template>
          </el-table-column>
          <el-table-column label="关联等级" min-width="130">
            <template #default="{ row }">
              <SfLevelTag :level="row.level" :name="levelName(row.level)" />
            </template>
          </el-table-column>
          <el-table-column label="礼包内容" min-width="320">
            <template #default="{ row }">
              <div v-for="item in row.items" :key="item.id" class="gift-item">
                {{ item.skuName }} × {{ item.quantity }}
                <span class="gift-price">¥{{ item.unitPrice }}</span>
              </div>
              <span v-if="!row.items?.length" class="empty-tip">暂无内容</span>
            </template>
          </el-table-column>
          <el-table-column label="礼包合计" min-width="110">
            <template #default="{ row }">
              <span class="sum-price">¥{{ calcTotal(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small" effect="light">
                {{ row.status === 1 ? '在售' : '停售' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row as GiftPackage)">编辑</el-button>
              <el-button link :type="row.status === 1 ? 'warning' : 'success'" @click="toggleStatus(row as GiftPackage)">
                {{ row.status === 1 ? '停售' : '上架' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </SfPageContainer>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" title="编辑大礼包" width="640px" destroy-on-close>
      <el-form :model="editForm" label-width="90px">
        <el-form-item label="礼包名称" required>
          <el-input v-model="editForm.name" placeholder="请输入礼包名称" maxlength="30" />
        </el-form-item>
        <el-form-item label="礼包价格" required>
          <el-input-number v-model="editForm.price" :min="0" :precision="2" :step="100" style="width: 200px" />
        </el-form-item>
        <el-form-item label="关联等级">
          <el-select v-model="editForm.level" style="width: 200px">
            <el-option v-for="l in levelOptions" :key="l.level" :label="l.levelName" :value="l.level" />
          </el-select>
        </el-form-item>
        <el-form-item label="礼包内容">
          <div class="items-editor">
            <el-table :data="editForm.items" border size="small">
              <el-table-column label="商品 SKU" prop="skuName" min-width="180" />
              <el-table-column label="数量" width="120">
                <template #default="{ row }">
                  <el-input-number v-model="row.quantity" :min="1" :max="999" :controls="false" style="width: 80px" />
                </template>
              </el-table-column>
              <el-table-column label="单价" width="130">
                <template #default="{ row }">
                  <el-input-number v-model="row.unitPrice" :min="0" :precision="2" :controls="false" style="width: 100px" />
                </template>
              </el-table-column>
              <el-table-column label="小计" width="110">
                <template #default="{ row }"><span class="price-nowrap">¥{{ (row.quantity * row.unitPrice).toFixed(2) }}</span></template>
              </el-table-column>
              <el-table-column label="操作" width="70" align="center">
                <template #default="{ $index }">
                  <el-button link type="danger" @click="editForm.items?.splice($index, 1)">移除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <!-- 添加内容项 -->
            <div class="add-item-bar">
              <el-select v-model="picker.spuId" placeholder="选择商品" style="width: 200px" @change="onSpuChange" filterable>
                <el-option v-for="p in products" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
              <el-select v-model="picker.skuId" placeholder="选择规格" style="width: 160px" :disabled="!skus.length">
                <el-option v-for="s in skus" :key="s.id" :label="`${s.skuName}（¥${s.price}）`" :value="s.id" />
              </el-select>
              <el-input-number v-model="picker.quantity" :min="1" :max="999" :controls="false" style="width: 80px" placeholder="数量" />
              <el-button type="primary" plain :icon="Plus" @click="addItem">添加</el-button>
            </div>
            <div class="items-total">
              礼包合计：<span class="sum-price">¥{{ calcTotal(editForm) }}</span>
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
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { apiGiftPackage, apiProduct, apiConfig } from '@/api'
import { type GiftPackage, type GiftPackageItem, type ProductSPU, type ProductSKU, type LevelBenefitConfig } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfPriceTag from '@/components/SfPriceTag.vue'
import SfLevelTag from '@/components/SfLevelTag.vue'

const loading = ref(false)
const saving = ref(false)
const list = ref<GiftPackage[]>([])
const products = ref<ProductSPU[]>([])
const skus = ref<ProductSKU[]>([])
const levelOptions = ref<LevelBenefitConfig[]>([])

const levelName = (level: number) => levelOptions.value.find(l => l.level === level)?.levelName || `Lv.${level}`

const editVisible = ref(false)
const editForm = reactive<Partial<GiftPackage>>({ name: '', price: 0, level: 1, status: 1, items: [] })
const picker = reactive({ spuId: undefined as number | undefined, skuId: undefined as number | undefined, quantity: 1 })

const calcTotal = (pkg: { items?: GiftPackageItem[] }) => {
  const sum = (pkg.items || []).reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  return sum.toFixed(2)
}

const load = async () => {
  loading.value = true
  try {
    list.value = await apiGiftPackage.getList()
    const [res, levels] = await Promise.all([
      apiProduct.getList({ page: 1, pageSize: 100 }),
      apiConfig.getLevelConfigs(),
    ])
    products.value = res.list
    levelOptions.value = [...levels].sort((a, b) => a.levelSort - b.levelSort)
  } finally {
    loading.value = false
  }
}

const openEdit = (row: GiftPackage) => {
  Object.assign(editForm, { ...row, items: row.items.map(i => ({ ...i })) })
  skus.value = []
  picker.spuId = undefined
  picker.skuId = undefined
  picker.quantity = 1
  editVisible.value = true
}

const onSpuChange = async (spuId: number) => {
  picker.skuId = undefined
  skus.value = await apiProduct.getSkus(spuId)
}

const addItem = () => {
  if (!picker.spuId) { ElMessage.warning('请选择商品'); return }
  if (!picker.skuId) { ElMessage.warning('请选择规格'); return }
  const sku = skus.value.find(s => s.id === picker.skuId)
  if (!sku) return
  const exists = (editForm.items || []).find(i => i.skuId === sku.id)
  if (exists) {
    exists.quantity += picker.quantity
    ElMessage.info('已合并到已有条目')
    return
  }
  editForm.items?.push({
    id: Date.now() + Math.random(),
    packageId: editForm.id || 0,
    skuId: sku.id,
    skuName: sku.skuName,
    quantity: picker.quantity,
    unitPrice: sku.price,
  })
  ElMessage.success('已添加')
}

const save = async () => {
  if (!editForm.name) { ElMessage.warning('请输入礼包名称'); return }
  if (!editForm.items?.length) { ElMessage.warning('请添加礼包内容'); return }
  saving.value = true
  try {
    await apiGiftPackage.save(editForm as GiftPackage)
    ElMessage.success('保存成功')
    editVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row: GiftPackage) => {
  await apiGiftPackage.save({ ...row, status: row.status === 1 ? 0 : 1 })
  ElMessage.success(row.status === 1 ? '已停售' : '已上架')
  load()
}

onMounted(load)
</script>

<style scoped>
.gift-item {
  font-size: 13px;
  color: #626A73;
  line-height: 1.8;
}
.gift-price {
  color: #626A73;
  margin-left: 4px;
  white-space: nowrap;
  word-break: keep-all;
}
.empty-tip {
  color: #9AA1AA;
  font-size: 12px;
}
.sum-price {
  color: #FF6B35;
  font-weight: 600;
  white-space: nowrap;
  word-break: keep-all;
}
.items-editor {
  width: 100%;
}
.add-item-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.items-total {
  margin-top: 12px;
  font-size: 13px;
  color: #626A73;
  text-align: right;
}
</style>
