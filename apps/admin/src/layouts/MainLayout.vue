<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="collapsed ? '64px' : '220px'" class="admin-aside">
      <div class="logo-area">
        <div class="logo-icon">
          <el-icon :size="22" color="#fff"><ShoppingBag /></el-icon>
        </div>
        <span v-show="!collapsed" class="logo-text">Shop-OS 管理后台</span>
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
import { Fold, Expand, Refresh, FullScreen, ArrowDown, SwitchButton, ShoppingBag } from '@element-plus/icons-vue'
import { adminRoutes } from '@/router/routes'
import { getUser, clearAuth } from '@/utils/auth'
import { apiAuth } from '@/api'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const user = getUser()

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
  return adminRoutes.filter(r => r.meta?.title && !r.meta?.hidden)
})

const visibleChildren = (route: RouteRecordRaw) => {
  return (route.children || []).filter(c => !c.meta?.hidden && c.meta?.title)
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
  background: #1a1a2e;
  transition: width 0.25s ease;
  overflow: hidden;
}
.logo-area {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  white-space: nowrap;
}
.logo-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(135deg, #e54d42, #f37b1d);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(229, 77, 66, 0.35);
}
.logo-text {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
.menu-scrollbar {
  height: calc(100vh - 60px);
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
  color: rgba(255, 255, 255, 0.65);
}
:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}
:deep(.el-menu-item.is-active) {
  background: rgba(229, 77, 66, 0.15);
  color: #fff;
  border-right: 3px solid #e54d42;
}

.admin-header {
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
  transition: color 0.2s;
}
.collapse-btn:hover {
  color: #e54d42;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}
.header-icon {
  font-size: 18px;
  cursor: pointer;
  color: #606266;
}
.header-icon:hover {
  color: #e54d42;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.username {
  font-size: 14px;
  color: #303133;
}
.user-caret {
  font-size: 12px;
  color: #909399;
}
.user-meta {
  font-size: 13px;
  line-height: 1.6;
}
.user-role {
  font-size: 12px;
  color: #909399;
}
.admin-main {
  background: #f0f2f5;
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
