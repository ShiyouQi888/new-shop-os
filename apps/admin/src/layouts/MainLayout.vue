<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="collapsed ? '64px' : '220px'" class="admin-aside">
      <div class="logo-area" :class="{ collapsed }">
        <div v-show="collapsed" class="logo-icon" aria-hidden="true">
          <img :src="siteBranding.icon || '/icon.png'" alt="" />
        </div>
        <img v-show="!collapsed" class="logo-wordmark" :src="siteBranding.logo || '/logo.png'" alt="橙选管理后台" />
      </div>
      <el-scrollbar class="menu-scrollbar">
        <el-menu
          :default-active="activeMenu"
          :collapse="collapsed"
          :collapse-transition="false"
          router
          class="admin-menu"
        >
          <template v-for="route in menuRoutes" :key="route.path">
            <!-- 单菜单项：无可见子路由 -->
            <el-menu-item v-if="visibleChildren(route).length === 0" :index="firstMenuPath(route)">
              <el-icon><component :is="route.meta?.icon || 'Menu'" /></el-icon>
              <template #title>{{ route.meta?.title }}</template>
            </el-menu-item>

            <!-- 父菜单 -->
            <el-sub-menu v-else :index="route.path">
              <template #title>
                <el-icon><component :is="route.meta?.icon || 'Menu'" /></el-icon>
                <span>{{ route.meta?.title }}</span>
              </template>
              <el-menu-item
                v-for="child in visibleChildren(route)"
                :key="route.path + '/' + child.path"
                :index="route.path + '/' + child.path"
              >
                <el-icon v-if="child.meta?.icon"><component :is="child.meta.icon" /></el-icon>
                <template #title>{{ child.meta?.title }}</template>
              </el-menu-item>
            </el-sub-menu>
          </template>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-container>
      <!-- 顶栏 -->
      <el-header class="admin-header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="collapsed = !collapsed">
            <Fold v-if="!collapsed" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item
              v-for="item in breadcrumbItems"
              :key="item.path"
              :to="item.path"
            >
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-tooltip content="刷新" placement="bottom">
            <el-icon class="header-icon" @click="refresh"><Refresh /></el-icon>
          </el-tooltip>
          <el-tooltip content="全屏" placement="bottom">
            <el-icon class="header-icon" @click="toggleFullscreen"><FullScreen /></el-icon>
          </el-tooltip>
          <el-dropdown trigger="click" @command="handleUserCommand">
            <div class="user-info">
              <el-avatar :size="32" :src="user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'" />
              <span class="username">{{ user?.name || '超级管理员' }}</span>
              <el-icon class="user-caret"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <div class="user-meta">
                    <div>{{ user?.name }}</div>
                    <div class="user-role">{{ user?.role }}</div>
                  </div>
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="admin-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter, type RouteRecordRaw } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Fold, Expand, Refresh, FullScreen, ArrowDown, SwitchButton } from '@element-plus/icons-vue'
import { adminRoutes } from '@/router/routes'
import { getUser, getPermissions, clearAuth } from '@/utils/auth'
import { siteBranding, ensureSiteBranding } from '@/utils/site'
import { apiAuth } from '@/api'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
ensureSiteBranding()
const user = getUser()
/** 权限码数组；null = 超管全部可见 */
const perms = getPermissions()

/** 是否拥有某权限（超管恒通过） */
const hasPerm = (code?: string) => {
  if (!code) return true
  if (perms === null) return true
  return perms.includes(code)
}

const handleUserCommand = async (cmd: string) => {
  if (cmd !== 'logout') return
  try {
    await ElMessageBox.confirm('确定退出登录吗？', '退出确认', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await apiAuth.logout()
    clearAuth()
    ElMessage.success('已退出登录')
    router.replace('/login')
  } catch {
    /* cancelled */
  }
}

const menuRoutes = computed(() => {
  return adminRoutes
    .filter(r => r.meta?.title && !r.meta?.hidden && hasPerm(r.meta?.permission as string | undefined))
    // 子路由按权限过滤；带 redirect 的页面可作为单菜单项展示（如仪表盘）
    .map(r => {
      const children = (r.children || []).filter(c => !c.meta?.hidden && c.meta?.title && hasPerm(c.meta?.permission as string | undefined))
      if (children.length) return { ...r, children }
      if (r.redirect) return { ...r, children: [] }
      return null
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
})

const visibleChildren = (route: RouteRecordRaw) => {
  return (route.children || []).filter(c => !c.meta?.hidden && c.meta?.title && hasPerm(c.meta?.permission as string | undefined))
}

const firstMenuPath = (route: RouteRecordRaw) => {
  if (route.redirect && typeof route.redirect === 'string') return route.redirect
  if (route.children?.length) {
    const first = route.children.find(c => !c.meta?.hidden)
    if (first) return route.path + '/' + first.path
  }
  return route.path
}

const activeMenu = computed(() => {
  // 如果当前路径命中某个菜单重定向目标，也高亮父菜单
  const path = route.path
  const matchedParent = menuRoutes.value.find(r => {
    if (r.redirect && typeof r.redirect === 'string' && r.redirect === path) return true
    return path.startsWith(r.path + '/')
  })
  if (matchedParent && visibleChildren(matchedParent).length === 0) {
    return firstMenuPath(matchedParent)
  }
  return path
})

const breadcrumbItems = computed(() => {
  const items: { path: string; title: string }[] = []
  const matched = route.matched
  matched.forEach(item => {
    if (item.meta?.title) {
      items.push({ path: item.path, title: item.meta.title as string })
    }
  })
  if (items.length === 0) {
    items.push({ path: '/', title: '首页' })
  }
  return items
})

const refresh = () => {
  router.go(0)
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}
</script>

<style scoped>
.admin-layout {
  height: 100vh;
}
.admin-aside {
  background:
    radial-gradient(circle at 20% 0%, rgba(255, 107, 53, 0.22), transparent 30%),
    linear-gradient(180deg, #171A1F 0%, #242830 100%);
  transition: width 0.25s ease;
  overflow: hidden;
}
.logo-area {
  height: 68px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  white-space: nowrap;
}
.logo-area.collapsed {
  padding: 0;
  justify-content: center;
}
.logo-icon {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.logo-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.logo-wordmark {
  width: 180px;
  height: 52px;
  object-fit: contain;
}
.menu-scrollbar {
  height: calc(100vh - 68px);
}
.admin-menu {
  border-right: none;
  background: transparent;
}
.admin-menu:not(.el-menu--collapse) {
  width: 220px;
}
:deep(.el-menu) {
  background: transparent;
}
:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  margin: 4px 10px;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.68);
}
:deep(.el-menu--collapse .el-menu-tooltip__trigger),
:deep(.el-menu--collapse .el-sub-menu__title) {
  justify-content: center;
  padding: 0;
}
:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
:deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.22), rgba(232, 82, 34, 0.14));
  color: #fff;
  border-right: 0;
  box-shadow: inset 3px 0 0 #FF6B35;
}

.admin-header {
  height: 56px;
  background: rgba(255, 255, 255, 0.94);
  border-bottom: 1px solid #E7E9ED;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 8px 24px rgba(17, 24, 39, 0.04);
  backdrop-filter: blur(14px);
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #626A73;
  transition: color 0.2s;
}
.collapse-btn:hover {
  color: #FF6B35;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}
.header-icon {
  font-size: 18px;
  cursor: pointer;
  color: #626A73;
}
.header-icon:hover {
  color: #FF6B35;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.username {
  font-size: 14px;
  color: #171A1F;
}
.user-caret {
  font-size: 12px;
  color: #626A73;
}
.user-meta {
  font-size: 13px;
  line-height: 1.6;
}
.user-role {
  font-size: 12px;
  color: #626A73;
}
.admin-main {
  background:
    radial-gradient(circle at 100% 0%, rgba(255, 107, 53, 0.06), transparent 30%),
    #F8F9FB;
  padding: 0;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
