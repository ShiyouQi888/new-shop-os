<template>
  <div class="sf-page">
    <SfPageContainer title="推广海报管理" description="上传分销推广海报，可固定一张或随机千人千面展示">
      <template #header>
        <el-button type="primary" :icon="Plus" @click="openEdit(null)">新增海报</el-button>
      </template>

      <div class="sf-card">
        <el-alert title="前台推广中心海报规则：若有「固定海报」则固定展示该张；否则从所有启用海报中随机抽取一张（千人千面）。固定仅可设置一张。" type="info" :closable="false" show-icon style="margin-bottom: 16px" />
        <el-table :data="list" v-loading="loading" border>
          <el-table-column label="海报预览" width="150">
            <template #default="{ row }">
              <el-image :src="row.image" fit="cover" class="poster-thumb" :preview-src-list="[row.image]" preview-teleported />
            </template>
          </el-table-column>
          <el-table-column label="标题" prop="title" min-width="140">
            <template #default="{ row }">
              <span v-if="row.title">{{ row.title }}</span>
              <span v-else class="muted">未命名</span>
            </template>
          </el-table-column>
          <el-table-column label="展示方式" width="120" align="center">
            <template #default="{ row }">
              <el-tag v-if="Number(row.isFixed) === 1" type="warning" effect="light">固定展示</el-tag>
              <el-tag v-else type="info" effect="plain">随机候选</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="二维码布局" width="170">
            <template #default="{ row }">
              <div class="layout-cell">
                <span>X {{ formatPercent(row.qrX) }}</span>
                <span>Y {{ formatPercent(row.qrY) }}</span>
                <span>尺寸 {{ formatPercent(row.qrSize) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="启用" width="90" align="center">
            <template #default="{ row }">
              <el-switch :model-value="Number(row.status) === 1"
                @change="(v: string|number|boolean) => toggleStatus(row as PromotePoster, Boolean(v))"
                style="--el-switch-on-color: #18A66A" />
            </template>
          </el-table-column>
          <el-table-column label="排序" prop="sort" width="80" align="center" />
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <template v-if="Number(row.isFixed) === 1">
                <el-button link type="info" @click="setFixed(row as PromotePoster, false)">取消固定</el-button>
              </template>
              <template v-else>
                <el-button link type="warning" @click="setFixed(row as PromotePoster, true)">设为固定</el-button>
              </template>
              <el-button link type="primary" @click="openEdit(row as PromotePoster)">编辑</el-button>
              <el-button link type="danger" @click="removePoster(row as PromotePoster)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!list.length && !loading" description="暂无海报，点击右上角「新增海报」上传" />
      </div>
    </SfPageContainer>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="editVisible" :title="editForm.id ? '编辑海报' : '新增海报'" width="1080px" destroy-on-close>
      <div class="poster-editor">
        <section class="editor-preview">
          <div class="preview-title">
            <div>
              <strong>海报二维码排版</strong>
              <span>拖动二维码或使用右侧滑块微调，前台推广海报将同步此布局。</span>
            </div>
            <el-button size="small" @click="resetQrLayout">重置默认</el-button>
          </div>
          <div v-if="editForm.image" class="layout-canvas" @pointerdown="onPreviewPointerDown">
            <img :src="editForm.image" alt="海报预览" draggable="false" />
            <div
              class="qr-anchor"
              :style="qrPreviewStyle"
              @pointerdown.stop="onQrPointerDown"
            >
              <div class="qr-code-mock">
                <span></span><span></span><span></span><span></span>
                <b>QR</b>
              </div>
              <em>专属二维码</em>
            </div>
          </div>
          <div v-else class="empty-preview">
            <el-icon><Picture /></el-icon>
            <span>请先选择海报图片</span>
          </div>
        </section>

        <el-form label-width="92px" class="editor-form">
          <el-form-item label="海报图片" required>
            <SfFilePicker v-model="editForm.image" accept="image" placeholder="上传海报图片" title="选择海报图片" />
          </el-form-item>
          <el-form-item label="海报标题">
            <el-input v-model="editForm.title" placeholder="如：新人入会海报" maxlength="50" />
          </el-form-item>
          <el-form-item label="展示方式">
            <el-radio-group v-model="displayMode">
              <el-radio value="random">随机候选</el-radio>
              <el-radio value="fixed">固定展示</el-radio>
            </el-radio-group>
            <div class="form-tip">固定展示仅可设置一张，保存后自动覆盖原固定海报</div>
          </el-form-item>
          <el-form-item label="启用">
            <el-switch v-model="editForm.status" :active-value="1" :inactive-value="0" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="editForm.sort" :min="0" :max="999" style="width: 160px" />
            <div class="form-tip">数字越小越靠前，随机模式下权重优先</div>
          </el-form-item>

          <el-divider content-position="left">二维码位置</el-divider>
          <el-form-item label="横向位置">
            <el-slider v-model="editForm.qrX" :min="0" :max="100 - Number(editForm.qrSize || 24)" :step="0.5" show-input />
          </el-form-item>
          <el-form-item label="纵向位置">
            <el-slider v-model="editForm.qrY" :min="0" :max="100" :step="0.5" show-input />
          </el-form-item>
          <el-form-item label="二维码大小">
            <el-slider v-model="editForm.qrSize" :min="8" :max="48" :step="0.5" show-input />
          </el-form-item>
          <div class="sync-note">
            <el-icon><Connection /></el-icon>
            <span>保存后，商城前台推广中心会按当前海报的二维码坐标重新合成用户专属推广海报。</span>
          </div>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue'
import { Connection, Picture, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiPoster, type PromotePoster } from '@/api'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfFilePicker from '@/components/SfFilePicker.vue'

const loading = ref(false)
const saving = ref(false)
const list = ref<PromotePoster[]>([])
const editVisible = ref(false)
const displayMode = ref<'random' | 'fixed'>('random')
const defaultQrLayout = { qrX: 38, qrY: 72, qrSize: 24 }
const editForm = reactive<Partial<PromotePoster>>({
  id: undefined,
  title: '',
  image: '',
  status: 1,
  sort: 0,
  ...defaultQrLayout,
})

const numberOrDefault = (value: unknown, fallback: number) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const formatPercent = (value: unknown) => `${numberOrDefault(value, 0).toFixed(1)}%`

const normalizedQrLayout = computed(() => {
  const size = Math.min(48, Math.max(8, numberOrDefault(editForm.qrSize, defaultQrLayout.qrSize)))
  const x = Math.min(100 - size, Math.max(0, numberOrDefault(editForm.qrX, defaultQrLayout.qrX)))
  const y = Math.min(100, Math.max(0, numberOrDefault(editForm.qrY, defaultQrLayout.qrY)))
  return { x, y, size }
})

const qrPreviewStyle = computed(() => ({
  left: `${normalizedQrLayout.value.x}%`,
  top: `${normalizedQrLayout.value.y}%`,
  width: `${normalizedQrLayout.value.size}%`,
}))

const clampQrLayout = () => {
  editForm.qrSize = normalizedQrLayout.value.size
  editForm.qrX = normalizedQrLayout.value.x
  editForm.qrY = normalizedQrLayout.value.y
}

const setQrByPointer = (event: PointerEvent, center = false) => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const size = normalizedQrLayout.value.size
  const x = ((event.clientX - rect.left) / rect.width) * 100
  const y = ((event.clientY - rect.top) / rect.height) * 100
  editForm.qrX = Number(Math.min(100 - size, Math.max(0, center ? x - size / 2 : x)).toFixed(1))
  editForm.qrY = Number(Math.min(100, Math.max(0, center ? y - size / 2 : y)).toFixed(1))
}

const onPreviewPointerDown = (event: PointerEvent) => {
  setQrByPointer(event, true)
}

const onQrPointerDown = (event: PointerEvent) => {
  const canvas = (event.currentTarget as HTMLElement).parentElement
  if (!canvas) return
  const move = (moveEvent: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    const size = normalizedQrLayout.value.size
    const x = ((moveEvent.clientX - rect.left) / rect.width) * 100 - size / 2
    const y = ((moveEvent.clientY - rect.top) / rect.height) * 100 - size / 2
    editForm.qrX = Number(Math.min(100 - size, Math.max(0, x)).toFixed(1))
    editForm.qrY = Number(Math.min(100, Math.max(0, y)).toFixed(1))
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up, { once: true })
}

const resetQrLayout = () => {
  editForm.qrX = defaultQrLayout.qrX
  editForm.qrY = defaultQrLayout.qrY
  editForm.qrSize = defaultQrLayout.qrSize
}

const load = async () => {
  loading.value = true
  try {
    list.value = await apiPoster.getList()
  } finally {
    loading.value = false
  }
}

const openEdit = (row: PromotePoster | null) => {
  if (row) {
    Object.assign(editForm, {
      ...row,
      qrX: numberOrDefault(row.qrX, defaultQrLayout.qrX),
      qrY: numberOrDefault(row.qrY, defaultQrLayout.qrY),
      qrSize: numberOrDefault(row.qrSize, defaultQrLayout.qrSize),
    })
    displayMode.value = Number(row.isFixed) === 1 ? 'fixed' : 'random'
  } else {
    Object.assign(editForm, { id: undefined, title: '', image: '', status: 1, sort: 0, ...defaultQrLayout })
    displayMode.value = 'random'
  }
  editVisible.value = true
}

const save = async () => {
  if (!editForm.image) {
    ElMessage.warning('请先上传海报图片')
    return
  }
  clampQrLayout()
  saving.value = true
  try {
    const payload = {
      title: editForm.title,
      image: editForm.image,
      status: editForm.status,
      sort: editForm.sort,
      qrX: editForm.qrX,
      qrY: editForm.qrY,
      qrSize: editForm.qrSize,
    }
    if (editForm.id) {
      await apiPoster.update(editForm.id, payload)
      if (displayMode.value === 'fixed' && Number(editForm.isFixed) !== 1) {
        await apiPoster.setFixed(editForm.id, true)
      }
      if (displayMode.value === 'random' && Number(editForm.isFixed) === 1) {
        await apiPoster.setFixed(editForm.id, false)
      }
      ElMessage.success('海报已更新')
    } else {
      const res = await apiPoster.create(payload as { title?: string; image: string; status?: number; sort?: number; qrX?: number; qrY?: number; qrSize?: number })
      if (displayMode.value === 'fixed') {
        await apiPoster.setFixed(res.id, true)
      }
      ElMessage.success('海报已创建')
    }
    editVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row: PromotePoster, val: boolean) => {
  await apiPoster.update(row.id, { status: val ? 1 : 0 })
  ElMessage.success(val ? '已启用' : '已停用')
  load()
}

const setFixed = async (row: PromotePoster, fixed: boolean) => {
  await apiPoster.setFixed(row.id, fixed)
  ElMessage.success(fixed ? '已设为固定海报（前台将固定展示）' : '已取消固定（参与随机展示）')
  load()
}

const removePoster = async (row: PromotePoster) => {
  try {
    await ElMessageBox.confirm(`确认删除海报「${row.title || '未命名'}」？删除后前台不再展示。`, '删除海报', {
      type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger',
    })
  } catch { return }
  await apiPoster.remove(row.id)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>

<style scoped>
.poster-thumb {
  width: 96px;
  height: 64px;
  border-radius: 6px;
  display: block;
}
.layout-cell {
  display: grid;
  gap: 2px;
  color: #626A73;
  font-size: 12px;
  line-height: 1.35;
}
.muted {
  color: #9AA1AA;
}
.form-tip {
  font-size: 12px;
  color: #626A73;
  margin-top: 4px;
}
.poster-editor {
  display: grid;
  grid-template-columns: minmax(420px, 1fr) 380px;
  gap: 22px;
}
.editor-preview {
  min-width: 0;
}
.preview-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.preview-title strong,
.preview-title span {
  display: block;
}
.preview-title strong {
  color: #171A1F;
  font-size: 16px;
  font-weight: 800;
}
.preview-title span {
  margin-top: 4px;
  color: #626A73;
  font-size: 12px;
  line-height: 1.5;
}
.layout-canvas {
  position: relative;
  width: min(100%, 520px);
  max-height: 660px;
  margin: 0 auto;
  border: 1px solid #E7E9ED;
  border-radius: 18px;
  overflow: hidden;
  background:
    linear-gradient(45deg, #F8F9FB 25%, transparent 25%),
    linear-gradient(-45deg, #F8F9FB 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #F8F9FB 75%),
    linear-gradient(-45deg, transparent 75%, #F8F9FB 75%),
    #fff;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  background-size: 16px 16px;
  box-shadow: 0 18px 42px rgba(17, 24, 39, 0.08);
  cursor: crosshair;
}
.layout-canvas img {
  width: 100%;
  max-height: 660px;
  object-fit: contain;
  user-select: none;
}
.qr-anchor {
  position: absolute;
  aspect-ratio: 1;
  padding: 7px;
  border: 2px solid #FF6B35;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(255, 107, 53, 0.28);
  cursor: grab;
  touch-action: none;
}
.qr-anchor:active {
  cursor: grabbing;
}
.qr-code-mock {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  padding: 8px;
  border-radius: 9px;
  background: #F8F9FB;
}
.qr-code-mock span {
  border-radius: 4px;
  background: #171A1F;
}
.qr-code-mock b {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: #E85222;
  font-size: 12px;
  font-weight: 800;
}
.qr-anchor em {
  position: absolute;
  left: 50%;
  bottom: -28px;
  transform: translateX(-50%);
  min-width: 88px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(23, 26, 31, 0.9);
  color: #fff;
  font-style: normal;
  font-size: 12px;
  text-align: center;
}
.empty-preview {
  height: 420px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  border: 1px dashed #D6DAE0;
  border-radius: 18px;
  color: #9AA1AA;
  background: #F8F9FB;
}
.empty-preview .el-icon {
  font-size: 34px;
}
.editor-form {
  padding: 18px;
  border: 1px solid rgba(231, 233, 237, 0.78);
  border-radius: 18px;
  background: #fff;
}
.sync-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: #FFF1EB;
  color: #E85222;
  font-size: 12px;
  line-height: 1.5;
}
@media (max-width: 1100px) {
  .poster-editor {
    grid-template-columns: 1fr;
  }
  .editor-form {
    padding: 0;
    border: 0;
  }
}
</style>
