<template>
  <div class="sf-file-picker">
    <!-- 已选预览区 -->
    <div class="selected-list">
      <div v-for="(url, idx) in selectedList" :key="url + idx" class="selected-item">
        <el-image :src="url" fit="cover" class="selected-img" />
        <div class="selected-remove" @click="removeSelected(idx)">
          <el-icon><Close /></el-icon>
        </div>
      </div>
      <div class="picker-trigger" @click="open">
        <el-icon><Plus /></el-icon>
        <span class="trigger-text">{{ selectedList.length ? '选择文件' : placeholder }}</span>
      </div>
    </div>

    <!-- 选择器弹窗 -->
    <el-dialog
      v-model="visible"
      :title="title"
      width="920px"
      align-center
      append-to-body
      destroy-on-close
      class="sf-file-picker-dialog"
    >
      <div class="picker-toolbar">
        <el-radio-group v-model="filterType" size="small">
          <el-radio-button label="">全部</el-radio-button>
          <el-radio-button :label="FileAssetType.Image">图片</el-radio-button>
          <el-radio-button :label="FileAssetType.Video">视频</el-radio-button>
        </el-radio-group>
        <el-input v-model="keyword" placeholder="搜索文件名" clearable style="width: 200px" size="small" @keyup.enter="load">
          <template #append>
            <el-button :icon="Search" @click="load" />
          </template>
        </el-input>
        <el-upload
          ref="pickerUploadRef"
          action="#"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleUpload"
          accept="image/*,video/*"
          style="margin-left: auto"
        >
          <el-button type="primary" size="small" :icon="Upload">本地上传</el-button>
        </el-upload>
      </div>

      <!-- 分组导航 -->
      <div class="picker-groups">
        <div
          class="pg-item"
          :class="{ active: groupId === undefined }"
          @click="switchGroup(undefined)"
        >全部</div>
        <div
          class="pg-item"
          :class="{ active: groupId === null }"
          @click="switchGroup(null)"
        >未分组</div>
        <div
          class="pg-item"
          v-for="g in groups"
          :key="g.id"
          :class="{ active: groupId === g.id }"
          @click="switchGroup(g.id)"
        >
          <SfIcon :name="g.icon || 'folder'" /> {{ g.name }}
        </div>
      </div>

      <el-scrollbar height="420px" v-loading="loading">
        <el-empty v-if="!list.length" description="暂无文件" />
        <div v-else class="picker-grid">
          <div
            v-for="item in list"
            :key="item.id"
            class="picker-item"
            :class="{ active: tempSelected.includes(item.url), disabled: isDisabled(item) }"
            @click="toggleItem(item)"
          >
            <el-image v-if="item.type === FileAssetType.Image" :src="item.thumbUrl || item.url" fit="cover" class="picker-thumb" />
            <div v-else class="picker-video">
              <img v-if="item.thumbUrl" :src="item.thumbUrl" alt="" />
              <video v-else :src="item.url" preload="metadata" muted />
              <div class="picker-video-mask"><el-icon><VideoPlay /></el-icon></div>
            </div>
            <div class="picker-check" v-if="tempSelected.includes(item.url)">
              <el-icon><Check /></el-icon>
            </div>
            <div class="picker-name" :title="item.name">{{ item.name }}</div>
          </div>
        </div>
      </el-scrollbar>

      <div class="picker-footer">
        <span class="picker-tip">已选 {{ tempSelected.length }} 个</span>
        <div>
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" @click="confirm">确定</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Plus, Close, Search, Upload, VideoPlay, Check } from '@element-plus/icons-vue'
import { ElMessage, ElUpload } from 'element-plus'
import { apiFile, apiFileGroup } from '@/api'
import { FileAsset, FileAssetType, FileAssetGroup } from '@shop-os/shared'
import SfIcon from '@/components/SfIcon.vue'

const props = defineProps<{
  modelValue?: string | string[]
  multiple?: boolean
  accept?: 'image' | 'video' | 'all'
  placeholder?: string
  title?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string | string[]): void
}>()

const selectedList = computed(() => {
  if (!props.modelValue) return []
  return Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]
})

const visible = ref(false)
const loading = ref(false)
const list = ref<FileAsset[]>([])
const groups = ref<FileAssetGroup[]>([])
const groupId = ref<number | null | undefined>(undefined)
const tempSelected = ref<string[]>([])
const filterType = ref<FileAssetType | ''>('')
const keyword = ref('')

const pickerUploadRef = ref<InstanceType<typeof ElUpload>>()

const acceptType = computed(() => {
  if (props.accept === 'image') return FileAssetType.Image
  if (props.accept === 'video') return FileAssetType.Video
  return ''
})

watch(acceptType, (val) => {
  filterType.value = val
}, { immediate: true })

const isDisabled = (item: FileAsset) => {
  if (props.multiple) return false
  return tempSelected.value.length > 0 && !tempSelected.value.includes(item.url)
}

const load = async () => {
  loading.value = true
  try {
    const res = await apiFile.getList({ page: 1, pageSize: 100, keyword: keyword.value, type: filterType.value, groupId: groupId.value })
    list.value = res.list
  } finally {
    loading.value = false
  }
}

const switchGroup = (id: number | null | undefined) => {
  groupId.value = id
  load()
}

const open = async () => {
  tempSelected.value = [...selectedList.value]
  visible.value = true
  groups.value = await apiFileGroup.getList()
  load()
}

const toggleItem = (item: FileAsset) => {
  if (isDisabled(item)) return
  const idx = tempSelected.value.indexOf(item.url)
  if (idx >= 0) {
    tempSelected.value.splice(idx, 1)
  } else {
    if (props.multiple) tempSelected.value.push(item.url)
    else tempSelected.value = [item.url]
  }
}

const confirm = () => {
  const val = props.multiple ? tempSelected.value : (tempSelected.value[0] || '')
  emit('update:modelValue', val)
  visible.value = false
}

const removeSelected = (idx: number) => {
  const arr = [...selectedList.value]
  arr.splice(idx, 1)
  emit('update:modelValue', props.multiple ? arr : (arr[0] || ''))
}

const handleUpload = async (uploadFile: any) => {
  const raw = uploadFile.raw as File
  if (!raw) return
  // 如果限制了类型，做校验
  if (props.accept === 'image' && !raw.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }
  if (props.accept === 'video' && !raw.type.startsWith('video/')) {
    ElMessage.warning('请选择视频文件')
    return
  }
  try {
    const asset = await apiFile.upload(raw)
    if (props.multiple) tempSelected.value.push(asset.url)
    else tempSelected.value = [asset.url]
    load()
    ElMessage.success('上传成功')
  } catch {
    ElMessage.error('上传失败')
  }
  pickerUploadRef.value?.clearFiles?.()
}

onMounted(() => {
  if (!props.accept || props.accept === 'all') filterType.value = ''
})
</script>

<style scoped>
.sf-file-picker {
  display: inline-block;
}
.selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.selected-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #E7E9ED;
}
.selected-img {
  width: 100%;
  height: 100%;
}
.selected-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-bottom-left-radius: 6px;
}
.picker-trigger {
  width: 80px;
  height: 80px;
  border: 1px dashed #E7E9ED;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #626A73;
  cursor: pointer;
  transition: all 0.2s;
}
.picker-trigger:hover {
  border-color: #FF6B35;
  color: #FF6B35;
}
.trigger-text {
  font-size: 12px;
  margin-top: 4px;
}
.picker-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.picker-groups {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #E7E9ED;
}
.pg-item {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  color: #626A73;
  background: #F8F9FB;
  cursor: pointer;
  transition: all 0.15s;
}
.pg-item:hover {
  color: #FF6B35;
}
.pg-item.active {
  background: #FFF1EB;
  color: #FF6B35;
  font-weight: 500;
}
.picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}
.picker-item {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  background: #F8F9FB;
}
.picker-item:hover {
  border-color: #FF6B35;
}
.picker-item.active {
  border-color: #FF6B35;
}
.picker-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.picker-thumb,
.picker-video {
  width: 100%;
  aspect-ratio: 1;
}
.picker-thumb :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.picker-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.picker-video img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.picker-video-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28px;
  background: rgba(0, 0, 0, 0.2);
}
.picker-check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #FF6B35;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.picker-name {
  padding: 6px 8px;
  font-size: 12px;
  color: #626A73;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: #fff;
}
.picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #E7E9ED;
}
.picker-tip {
  font-size: 13px;
  color: #626A73;
}
</style>

<style>
.sf-file-picker-dialog {
  max-width: calc(100vw - 48px);
}
</style>
