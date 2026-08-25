import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: false,
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: false,
    }),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: '@shop-os/shared', replacement: resolve(__dirname, '../../packages/shared/src/index.ts') },
      // dayjs 默认入口是 UMD（dayjs.min.js），浏览器直连没有 default export；
      // element-plus 内部还会 import dayjs/plugin/*（CJS）。把 dayjs 及其插件统一指向 ESM 构建，
      // 使其以原生 ESM 直接供浏览器运行，既不依赖预构建，也规避 Vite 对 node_modules 内
      // 子路径 import 不重写导致的 SyntaxError。
      // 注意：replacement 必须为绝对路径 —— 相对路径会被相对 importee 所在目录解析导致 dev 报错
      { find: /^dayjs$/, replacement: resolve(__dirname, 'node_modules/dayjs/esm/index.js') },
      { find: /^dayjs\/plugin\/(.+?)(?:\.js)?$/, replacement: resolve(__dirname, 'node_modules/dayjs/esm/plugin/$1/index.js') },
    ],
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  optimizeDeps: {
    // 禁用依赖预构建与运行时发现：避免重优化触发批量删缓存被 safe-delete 守卫拦截导致崩溃
    // （本项目的 vue/element-plus/vant/pinia/echarts/dayjs-esm 均为 ESM，无需预构建）
    noDiscovery: true,
    include: [],
  },
  build: {
    // 沙箱 safe-delete 对 dist 内大量文件触发拦截，关闭自动清空由人工/脚本清理
    emptyOutDir: false,
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
        additionalData: `@use "@/styles/variables" as *;`,
      },
    },
  },
})
