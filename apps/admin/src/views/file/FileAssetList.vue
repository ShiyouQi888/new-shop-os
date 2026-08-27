<template>
  <div class="sf-page">
    <SfPageContainer title="文件资产管理" description="集中管理图片、视频等素材，支持分组与自动归组，新建商品时可直接调用">
      <template #header>
        <div class="header-actions">
          <el-button :icon="FolderAdd" @click="openGroupDialog(null)">新建分组</el-button>
          <el-upload
            ref="uploadRef"
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleFileChange"
            accept="image/*,video/*"
          >
            <el-button type="primary" :icon="Upload">上传文件</el-button>
          </el-upload>
        </div>
      </template>

      <div class="asset-overview">
        <div class="overview-card primary">
          <div class="overview-icon"><el-icon><Files /></el-icon></div>
          <div>
            <span>全部资产</span>
            <strong>{{ allCount }}</strong>
          </div>
        </div>
        <div class="overview-card">
          <div class="overview-icon"><el-icon><FolderOpened /></el-icon></div>
          <div>
            <span>资产分组</span>
            <strong>{{ groups.length }}</strong>
          </div>
        </div>
        <div class="overview-card">
          <div class="overview-icon"><el-icon><Files /></el-icon></div>
          <div>
            <span>当前页图片</span>
            <strong>{{ currentPageImageCount }}</strong>
          </div>
        </div>
        <div class="overview-card">
          <div class="overview-icon"><el-icon><VideoPlay /></el-icon></div>
          <div>
            <span>当前页视频</span>
            <strong>{{ currentPageVideoCount }}</strong>
          </div>
        </div>
      </div>

      <!-- 上传目标分组提示 -->
      <div class="sf-card" v-if="currentGroup !== undefined">
        <div class="upload-hint">
          <el-icon><FolderOpened /></el-icon>
          <span>
            上传到：<b>{{ currentGroup === null ? '未分组（自动归组）' : groupName(currentGroup) }}</b>
            <template v-if="currentGroup !== null"> · 不勾选自动归组规则时按规则自动归类</template>
          </span>
          <el-button link type="primary" size="small" @click="resetUploadTarget">恢复自动归组</el-button>
        </div>
      </div>

      <div class="asset-layout">
        <!-- 左侧分组栏 -->
        <div class="asset-sidebar">
          <div class="side-search">
            <el-input v-model="filters.keyword" placeholder="搜索文件名" clearable size="small" @keyup.enter="search">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
          </div>

          <div class="side-nav">
            <div
              class="side-item"
              :class="{ active: filters.groupId === undefined }"
              @click="selectGroup(undefined)"
            >
              <el-icon><Files /></el-icon>
              <span>全部文件</span>
              <span class="side-count">{{ allCount }}</span>
            </div>
            <div
              class="side-item"
              :class="{ active: filters.groupId === null }"
              @click="selectGroup(null)"
            >
              <el-icon><FolderDelete /></el-icon>
              <span>未分组</span>
              <span class="side-count">{{ ungroupedCount }}</span>
            </div>
          </div>

          <div class="side-title">
            资产分组
            <el-icon class="side-add" @click="openGroupDialog(null)"><Plus /></el-icon>
          </div>
          <el-scrollbar class="side-scroll">
            <div
              class="side-item"
              v-for="g in groups"
              :key="g.id"
              :class="{ active: filters.groupId === g.id }"
              @click="selectGroup(g.id)"
            >
              <SfIcon :name="g.icon || 'folder'" :size="15" class="side-icon" />
              <span class="side-name" :title="g.name">{{ g.name }}</span>
              <span class="side-count">{{ groupCounts[g.id] ?? 0 }}</span>
              <el-dropdown trigger="click" @command="(cmd) => handleGroupCommand(cmd, g)" @click.stop>
                <el-icon class="side-more"><MoreFilled /></el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="rename">重命名</el-dropdown-item>
                    <el-dropdown-item command="rule">设置自动归组</el-dropdown-item>
                    <el-dropdown-item divided command="delete" style="color: #FF6B35">删除分组</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <el-empty v-if="!groups.length" description="暂无分组" :image-size="48" />
          </el-scrollbar>
        </div>

        <!-- 右侧内容 -->
        <div class="asset-main">
          <div class="sf-card">
            <div class="content-head">
              <div>
                <div class="content-kicker">ASSET LIBRARY</div>
                <h3>{{ currentScopeTitle }}</h3>
                <p>{{ currentScopeDesc }}</p>
              </div>
              <div class="content-meta">
                <span>{{ total }} 个文件</span>
                <span>{{ selectedIds.length }} 已选</span>
              </div>
            </div>

            <!-- 工具条 -->
            <div class="asset-toolbar">
              <div class="toolbar-left">
                <el-radio-group v-model="filters.type" size="small" @change="search">
                  <el-radio-button value="">全部类型</el-radio-button>
                  <el-radio-button v-for="(label, val) in FileAssetTypeLabels" :key="val" :value="val">{{ label }}</el-radio-button>
                </el-radio-group>
              </div>
              <div class="toolbar-right">
                <template v-if="selectedIds.length">
                  <el-button size="small" :icon="FolderOpened" @click="() => openMoveDialog()">移动至分组 ({{ selectedIds.length }})</el-button>
                  <el-button size="small" :icon="Close" @click="selectedIds = []">取消选择</el-button>
                </template>
              </div>
            </div>

            <!-- 文件网格 -->
            <div class="asset-grid" v-loading="loading">
              <div v-for="item in list" :key="item.id" class="asset-col">
                <div class="asset-card" :class="{ selected: selectedIds.includes(item.id) }" @click="toggleSelect(item.id)">
                  <div class="asset-preview">
                    <el-image v-if="item.type === FileAssetType.Image" :src="item.thumbUrl || item.url" fit="cover" class="asset-image" @click.stop="preview(item)" />
                    <div v-else class="asset-video" @click.stop="preview(item)">
                      <img v-if="item.thumbUrl" :src="item.thumbUrl" alt="" class="video-cover" />
                      <video v-else :src="item.url" class="video-el" preload="metadata" muted />
                      <div class="video-mask">
                        <el-icon><VideoPlay /></el-icon>
                      </div>
                    </div>
                    <div class="asset-type-badge">{{ FileAssetTypeLabels[item.type] }}</div>
                    <div v-if="item.groupId !== null && currentGroupName(item)" class="asset-group-badge">{{ currentGroupName(item) }}</div>
                  </div>
                  <div class="asset-info">
                    <div class="asset-name" :title="item.name">{{ item.name }}</div>
                    <div class="asset-meta">
                      <span>{{ formatSize(item.size) }}</span>
                      <span v-if="item.width && item.height">{{ item.width }}×{{ item.height }}</span>
                      <span v-else-if="item.duration">{{ formatDuration(item.duration) }}</span>
                    </div>
                    <div class="asset-actions">
                      <el-button link type="primary" size="small" @click.stop="preview(item)">预览</el-button>
                      <el-button link type="primary" size="small" @click.stop="openMoveDialog([item.id])">移动</el-button>
                      <el-button link type="primary" size="small" @click.stop="rename(item)">重命名</el-button>
                      <el-popconfirm title="确定删除该文件？" confirm-button-text="删除" cancel-button-text="取消" @confirm.stop="remove(item)">
                        <template #reference>
                          <el-button link type="danger" size="small" @click.stop>删除</el-button>
                        </template>
                      </el-popconfirm>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="!loading && list.length === 0" class="asset-empty">
              <el-empty description="暂无文件" />
              <el-upload
                action="#"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="handleFileChange"
                accept="image/*,video/*"
              >
                <el-button type="primary" :icon="Upload">上传第一个文件</el-button>
              </el-upload>
            </div>

            <div class="sf-pagination">
              <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
                layout="total, prev, pager, next, jumper" background @current-change="load" />
            </div>
          </div>
        </div>
      </div>
    </SfPageContainer>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" :title="previewAsset?.name" width="800px" align-center destroy-on-close>
      <div class="preview-body">
        <el-image v-if="previewAsset?.type === FileAssetType.Image" :src="previewAsset?.url" fit="contain" style="width: 100%; max-height: 500px" />
        <video v-else-if="previewAsset" :src="previewAsset.url" controls style="width: 100%; max-height: 500px" />
      </div>
    </el-dialog>

    <!-- 重命名弹窗 -->
    <el-dialog v-model="renameVisible" title="重命名" width="420px">
      <el-input v-model="renameValue" placeholder="请输入新文件名" @keyup.enter="confirmRename" />
      <template #footer>
        <el-button @click="renameVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRename">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分组弹窗（新建/编辑） -->
    <el-dialog v-model="groupDialogVisible" :title="groupForm.id ? '编辑分组' : '新建分组'" width="480px">
      <el-form :model="groupForm" label-width="96px">
        <el-form-item label="分组名称" required>
          <el-input v-model="groupForm.name" placeholder="如：商品图片" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="分组图标">
          <SfIconSelect v-model="groupForm.icon" scope="file" placeholder="选择图标" />
        </el-form-item>
        <el-form-item label="自动归组规则">
          <el-input v-model="groupForm.matchRules" placeholder="扩展名/关键词，逗号分隔，如：jpg,png；或类型 video" />
          <div class="form-tip">上传文件时按此规则自动归入本组；留空则不参与自动归组</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveGroup">保存</el-button>
      </template>
    </el-dialog>

    <!-- 移动分组弹窗 -->
    <el-dialog v-model="moveVisible" title="移动至分组" width="440px">
      <div class="move-tip">已选 <b>{{ moveIds.length }}</b> 个文件</div>
      <el-radio-group v-model="moveTarget" class="move-options">
        <el-radio :value="0">未分组（清空归属）</el-radio>
        <el-radio v-for="g in groups" :key="g.id" :value="g.id">
          <SfIcon :name="g.icon || 'folder'" /> {{ g.name }}
        </el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="moveVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmMove">移动</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Search, Upload, VideoPlay, FolderAdd, FolderOpened, FolderDelete, Files, Plus, MoreFilled, Close } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, ElUpload } from 'element-plus'
import { apiFile, apiFileGroup } from '@/api'
import { FileAsset, FileAssetType, FileAssetTypeLabels, FileAssetGroup } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfIcon from '@/components/SfIcon.vue'
import SfIconSelect from '@/components/SfIconSelect.vue'

const loading = ref(false)
const list = ref<FileAsset[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(12)
const filters = reactive({ keyword: '', type: '' as FileAssetType | '', groupId: undefined as number | null | undefined })

const groups = ref<FileAssetGroup[]>([])
const groupCounts = ref<Record<number, number>>({})
const allCount = ref(0)
const ungroupedCount = ref(0)

const previewVisible = ref(false)
const previewAsset = ref<FileAsset | null>(null)

const renameVisible = ref(false)
const renameTarget = ref<FileAsset | null>(null)
const renameValue = ref('')

const uploadRef = ref<InstanceType<typeof ElUpload>>()
const selectedIds = ref<number[]>([])

const groupDialogVisible = ref(false)
const groupForm = reactive<{ id: number | null; name: string; icon: string; matchRules: string }>({
  id: null, name: '', icon: 'folder', matchRules: '',
})

const moveVisible = ref(false)
const moveIds = ref<number[]>([])
// 0 表示「未分组」，与 apiFile.moveToGroup 的 null 语义对应
const moveTarget = ref<number>(0)

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const currentGroup = computed(() => filters.groupId)
const currentPageImageCount = computed(() => list.value.filter(item => item.type === FileAssetType.Image).length)
const currentPageVideoCount = computed(() => list.value.filter(item => item.type === FileAssetType.Video).length)
const currentScopeTitle = computed(() => {
  if (filters.groupId === undefined) return '全部文件'
  if (filters.groupId === null) return '未分组文件'
  return groupName(filters.groupId)
})
const currentScopeDesc = computed(() => {
  if (filters.groupId === undefined) return '查看所有图片、视频与素材，可按类型筛选、移动分组或批量管理。'
  if (filters.groupId === null) return '这些文件还没有归属分组，建议移动到对应业务素材库，便于商品和海报复用。'
  return '当前分组中的素材会优先用于对应业务场景，也可继续调整自动归组规则。'
})

const groupName = (id: number) => groups.value.find(g => g.id === id)?.name || '未命名分组'
const currentGroupName = (item: FileAsset) => item.groupId !== null ? groupName(item.groupId) : ''

const loadCounts = async () => {
  const [all, ungrouped] = await Promise.all([
    apiFile.getList({ page: 1, pageSize: 1 }),
    apiFile.getList({ page: 1, pageSize: 1, groupId: null }),
  ])
  allCount.value = all.total
  ungroupedCount.value = ungrouped.total
  const counts: Record<number, number> = {}
  for (const g of groups.value) {
    const res = await apiFile.getList({ page: 1, pageSize: 1, groupId: g.id })
    counts[g.id] = res.total
  }
  groupCounts.value = counts
}

const loadGroups = async () => {
  groups.value = await apiFileGroup.getList()
  await loadCounts()
}

const load = async () => {
  loading.value = true
  try {
    const res = await apiFile.getList({ page: page.value, pageSize: pageSize.value, ...filters })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const search = () => { page.value = 1; load() }
const selectGroup = (id: number | null | undefined) => {
  filters.groupId = id
  search()
}

const resetUploadTarget = () => { filters.groupId = undefined; search() }

const preview = (item: FileAsset) => {
  previewAsset.value = item
  previewVisible.value = true
}

const rename = (item: FileAsset) => {
  renameTarget.value = item
  renameValue.value = item.name
  renameVisible.value = true
}

const confirmRename = async () => {
  if (!renameTarget.value || !renameValue.value.trim()) return
  await apiFile.rename(renameTarget.value.id, renameValue.value.trim())
  ElMessage.success('重命名成功')
  renameVisible.value = false
  load()
}

const remove = async (item: FileAsset) => {
  await apiFile.delete(item.id)
  ElMessage.success('删除成功')
  selectedIds.value = selectedIds.value.filter(id => id !== item.id)
  load()
  loadGroups()
}

const handleFileChange = async (uploadFile: any) => {
  const raw = uploadFile.raw as File
  if (!raw) return
  try {
    const asset = await apiFile.upload(raw, currentGroup.value === null ? undefined : currentGroup.value)
    const inGroup = groups.value.find(g => g.id === asset.groupId)
    ElMessage.success(`上传成功${asset.groupId !== null && inGroup ? `，已自动归入「${inGroup.name}」` : ''}`)
    search()
    loadGroups()
  } catch (e) {
    ElMessage.error('上传失败')
  }
  uploadRef.value?.clearFiles?.()
}

const toggleSelect = (id: number) => {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

// ===== 分组管理 =====
const openGroupDialog = (g: FileAssetGroup | null) => {
  groupForm.id = g?.id ?? null
  groupForm.name = g?.name ?? ''
  groupForm.icon = g?.icon ?? 'folder'
  groupForm.matchRules = g?.matchRules ?? ''
  groupDialogVisible.value = true
}

const saveGroup = async () => {
  if (!groupForm.name.trim()) {
    ElMessage.warning('请输入分组名称')
    return
  }
  if (groupForm.id) {
    await apiFileGroup.update(groupForm.id, { name: groupForm.name.trim(), icon: groupForm.icon.trim() || 'folder', matchRules: groupForm.matchRules.trim() })
    ElMessage.success('分组已更新')
  } else {
    await apiFileGroup.create(groupForm.name.trim(), groupForm.matchRules.trim(), groupForm.icon.trim() || 'folder')
    ElMessage.success('分组创建成功')
  }
  groupDialogVisible.value = false
  loadGroups()
}

const handleGroupCommand = async (cmd: string, g: FileAssetGroup) => {
  if (cmd === 'rename') openGroupDialog(g)
  if (cmd === 'rule') openGroupDialog(g)
  if (cmd === 'delete') {
    try {
      await ElMessageBox.confirm(
        `删除分组「${g.name}」？组内 ${groupCounts.value[g.id] ?? 0} 个文件将变为未分组，文件本身不会被删除。`,
        '删除分组',
        { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
      )
      await apiFileGroup.remove(g.id)
      ElMessage.success('分组已删除，组内文件已移至未分组')
      if (filters.groupId === g.id) selectGroup(undefined)
      loadGroups()
      load()
    } catch { /* cancelled */ }
  }
}

// ===== 移动 =====
const openMoveDialog = (ids?: number[]) => {
  moveIds.value = ids ?? [...selectedIds.value]
  if (!moveIds.value.length) {
    ElMessage.warning('请先选择要移动的文件')
    return
  }
  const first = list.value.find(f => f.id === moveIds.value[0])
  moveTarget.value = first?.groupId ?? 0
  moveVisible.value = true
}

const confirmMove = async () => {
  await apiFile.moveToGroup(moveIds.value, moveTarget.value === 0 ? null : moveTarget.value)
  ElMessage.success(`已将 ${moveIds.value.length} 个文件移动到${moveTarget.value === 0 ? '未分组' : `「${groupName(moveTarget.value)}」`}`)
  moveVisible.value = false
  selectedIds.value = []
  load()
  loadGroups()
}

onMounted(async () => {
  await loadGroups()
  load()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.asset-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.overview-card {
  min-height: 92px;
  padding: 18px;
  border: 1px solid #E7E9ED;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 241, 235, 0.62), rgba(255, 255, 255, 0) 72%),
    #fff;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 12px 30px rgba(17, 24, 39, 0.04);
}
.overview-card.primary {
  border-color: #FFD5C5;
  background:
    radial-gradient(circle at 0 0, rgba(255, 107, 53, 0.16), transparent 42%),
    #fff;
}
.overview-icon {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  color: #FF6B35;
  background: #FFF1EB;
  border: 1px solid #FFD5C5;
  font-size: 18px;
}
.overview-card span {
  display: block;
  color: #626A73;
  font-size: 12px;
  line-height: 1;
}
.overview-card strong {
  display: block;
  margin-top: 8px;
  color: #171A1F;
  font-size: 26px;
  line-height: 1;
  font-weight: 800;
}
.upload-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #626A73;
  padding: 4px 0;
}
.upload-hint b {
  color: #FF6B35;
}

/* 左右布局 */
.asset-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.asset-sidebar {
  width: 236px;
  flex-shrink: 0;
  background:
    linear-gradient(180deg, rgba(255, 241, 235, 0.72), rgba(255, 255, 255, 0) 28%),
    #fff;
  border-radius: 16px;
  border: 1px solid #E7E9ED;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: sticky;
  top: 12px;
  box-shadow: 0 18px 42px rgba(17, 24, 39, 0.05);
}
.side-search {
  margin-bottom: 4px;
}
.side-nav {
  border-bottom: 1px solid #E7E9ED;
  padding-bottom: 8px;
}
.side-title {
  font-size: 12px;
  color: #626A73;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  margin-top: 4px;
}
.side-add {
  cursor: pointer;
  color: #626A73;
  font-size: 14px;
}
.side-add:hover {
  color: #FF6B35;
}
.side-scroll {
  max-height: calc(100vh - 380px);
}
.side-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  color: #626A73;
  transition: all 0.15s;
  margin-bottom: 2px;
}
.side-item:hover {
  background: #F8F9FB;
  color: #171A1F;
}
.side-item.active {
  background: #FFF1EB;
  color: #FF6B35;
  font-weight: 700;
  box-shadow: inset 3px 0 0 #FF6B35;
}
.side-icon {
  font-size: 15px;
}
.side-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.side-count {
  font-size: 12px;
  color: #9AA1AA;
  background: #F8F9FB;
  border-radius: 999px;
  padding: 0 8px;
  line-height: 18px;
}
.side-item.active .side-count {
  background: #FFF1EB;
  color: #FF6B35;
}
.side-more {
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.15s;
}
.side-item:hover .side-more {
  opacity: 1;
}

.asset-main {
  flex: 1;
  min-width: 0;
}
.content-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #E7E9ED;
}
.content-kicker {
  color: #E85222;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
}
.content-head h3 {
  margin: 7px 0 6px;
  color: #171A1F;
  font-size: 22px;
  line-height: 1.2;
}
.content-head p {
  max-width: 620px;
  margin: 0;
  color: #626A73;
  font-size: 13px;
  line-height: 1.6;
}
.content-meta {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.content-meta span {
  min-height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  color: #626A73;
  background: #F8F9FB;
  border: 1px solid #E7E9ED;
  font-size: 12px;
  font-weight: 700;
}

/* 工具条 */
.asset-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.toolbar-left {
  display: flex;
  align-items: center;
}
.toolbar-right {
  min-height: 28px;
}

/* 资产卡片 */
.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 16px;
  min-height: 160px;
}
.asset-col {
  min-width: 0;
}
.asset-card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #E7E9ED;
  transition: all 0.2s;
  cursor: pointer;
  height: 100%;
  box-shadow: 0 12px 30px rgba(17, 24, 39, 0.04);
}
.asset-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 42px rgba(17, 24, 39, 0.09);
  border-color: #FF6B35;
}
.asset-card.selected {
  border-color: #FF6B35;
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.2);
}
.asset-preview {
  position: relative;
  aspect-ratio: 1;
  background: #F8F9FB;
  overflow: hidden;
}
.asset-image {
  width: 100%;
  height: 100%;
}
.asset-video {
  width: 100%;
  height: 100%;
  position: relative;
}
.video-el {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.video-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.video-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  font-size: 40px;
}
.asset-type-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(23, 26, 31, 0.72);
  color: #fff;
  backdrop-filter: blur(10px);
}
.asset-group-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  max-width: calc(100% - 80px);
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(255, 107, 53, 0.85);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  backdrop-filter: blur(10px);
}
.asset-info {
  padding: 12px 12px 10px;
}
.asset-name {
  font-size: 13px;
  font-weight: 500;
  color: #171A1F;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}
.asset-meta {
  font-size: 12px;
  color: #626A73;
  display: flex;
  gap: 12px;
  min-height: 18px;
  margin-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
}
.asset-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid #F0F1F3;
}
.asset-actions :deep(.el-button) {
  padding: 0;
  height: 22px;
  font-weight: 700;
}
.asset-empty {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.preview-body {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: #F8F9FB;
}
.form-tip {
  font-size: 12px;
  color: #626A73;
  line-height: 1.6;
  margin-top: 4px;
  width: 100%;
}
.move-tip {
  font-size: 13px;
  color: #626A73;
  margin-bottom: 16px;
}
.move-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
@media (max-width: 1100px) {
  .asset-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .asset-layout {
    flex-direction: column;
  }
  .asset-sidebar {
    position: static;
    width: 100%;
  }
  .side-scroll {
    max-height: 220px;
  }
}
@media (max-width: 720px) {
  .asset-overview {
    grid-template-columns: 1fr;
  }
  .content-head,
  .asset-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .content-meta {
    flex-wrap: wrap;
  }
  .asset-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
