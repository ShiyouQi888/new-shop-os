// vite.config.ts
import { defineConfig } from "file:///D:/shop-OS/node_modules/.pnpm/vite@5.4.21_sass@1.103.1/node_modules/vite/dist/node/index.js";
import vue from "file:///D:/shop-OS/node_modules/.pnpm/@vitejs+plugin-vue@5.2.4_vite@5.4.21_vue@3.5.41/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import AutoImport from "file:///D:/shop-OS/node_modules/.pnpm/unplugin-auto-import@0.17.8/node_modules/unplugin-auto-import/dist/vite.js";
import Components from "file:///D:/shop-OS/node_modules/.pnpm/unplugin-vue-components@0.27.5_vue@3.5.41/node_modules/unplugin-vue-components/dist/vite.js";
import { ElementPlusResolver } from "file:///D:/shop-OS/node_modules/.pnpm/unplugin-vue-components@0.27.5_vue@3.5.41/node_modules/unplugin-vue-components/dist/resolvers.js";
import { resolve } from "path";
var __vite_injected_original_dirname = "D:\\shop-OS\\apps\\admin";
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ["vue", "vue-router", "pinia"],
      dts: "src/auto-imports.d.ts"
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: "src/components.d.ts"
    })
  ],
  resolve: {
    alias: [
      { find: "@", replacement: resolve(__vite_injected_original_dirname, "src") },
      { find: "@shop-os/shared", replacement: resolve(__vite_injected_original_dirname, "../../packages/shared/src/index.ts") },
      // dayjs 默认入口是 UMD（dayjs.min.js），浏览器直连没有 default export；
      // element-plus 内部还会 import dayjs/plugin/*（CJS）。把 dayjs 及其插件统一指向 ESM 构建，
      // 使其以原生 ESM 直接供浏览器运行，既不依赖预构建，也规避 Vite 对 node_modules 内
      // 子路径 import 不重写导致的 SyntaxError。
      { find: /^dayjs$/, replacement: "dayjs/esm/index.js" },
      { find: /^dayjs\/plugin\/(.+?)(?:\.js)?$/, replacement: "dayjs/esm/plugin/$1/index.js" }
    ]
  },
  server: {
    port: 5173,
    host: "0.0.0.0"
  },
  optimizeDeps: {
    // 禁用依赖预构建与运行时发现：避免重优化触发批量删缓存被 safe-delete 守卫拦截导致崩溃
    // （本项目的 vue/element-plus/vant/pinia/echarts/dayjs-esm 均为 ESM，无需预构建）
    noDiscovery: true,
    include: []
  },
  build: {
    // 沙箱 safe-delete 对 dist 内大量文件触发拦截，关闭自动清空由人工/脚本清理
    emptyOutDir: false
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern",
        additionalData: `@use "@/styles/variables" as *;`
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxzaG9wLU9TXFxcXGFwcHNcXFxcYWRtaW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXHNob3AtT1NcXFxcYXBwc1xcXFxhZG1pblxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovc2hvcC1PUy9hcHBzL2FkbWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xuaW1wb3J0IEF1dG9JbXBvcnQgZnJvbSAndW5wbHVnaW4tYXV0by1pbXBvcnQvdml0ZSdcbmltcG9ydCBDb21wb25lbnRzIGZyb20gJ3VucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3ZpdGUnXG5pbXBvcnQgeyBFbGVtZW50UGx1c1Jlc29sdmVyIH0gZnJvbSAndW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvcmVzb2x2ZXJzJ1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICB2dWUoKSxcbiAgICBBdXRvSW1wb3J0KHtcbiAgICAgIHJlc29sdmVyczogW0VsZW1lbnRQbHVzUmVzb2x2ZXIoKV0sXG4gICAgICBpbXBvcnRzOiBbJ3Z1ZScsICd2dWUtcm91dGVyJywgJ3BpbmlhJ10sXG4gICAgICBkdHM6ICdzcmMvYXV0by1pbXBvcnRzLmQudHMnLFxuICAgIH0pLFxuICAgIENvbXBvbmVudHMoe1xuICAgICAgcmVzb2x2ZXJzOiBbRWxlbWVudFBsdXNSZXNvbHZlcigpXSxcbiAgICAgIGR0czogJ3NyYy9jb21wb25lbnRzLmQudHMnLFxuICAgIH0pLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IFtcbiAgICAgIHsgZmluZDogJ0AnLCByZXBsYWNlbWVudDogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSB9LFxuICAgICAgeyBmaW5kOiAnQHNob3Atb3Mvc2hhcmVkJywgcmVwbGFjZW1lbnQ6IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vcGFja2FnZXMvc2hhcmVkL3NyYy9pbmRleC50cycpIH0sXG4gICAgICAvLyBkYXlqcyBcdTlFRDhcdThCQTRcdTUxNjVcdTUzRTNcdTY2MkYgVU1EXHVGRjA4ZGF5anMubWluLmpzXHVGRjA5XHVGRjBDXHU2RDRGXHU4OUM4XHU1NjY4XHU3NkY0XHU4RkRFXHU2Q0ExXHU2NzA5IGRlZmF1bHQgZXhwb3J0XHVGRjFCXG4gICAgICAvLyBlbGVtZW50LXBsdXMgXHU1MTg1XHU5MEU4XHU4RkQ4XHU0RjFBIGltcG9ydCBkYXlqcy9wbHVnaW4vKlx1RkYwOENKU1x1RkYwOVx1MzAwMlx1NjI4QSBkYXlqcyBcdTUzQ0FcdTUxNzZcdTYzRDJcdTRFRjZcdTdFREZcdTRFMDBcdTYzMDdcdTU0MTEgRVNNIFx1Njc4NFx1NUVGQVx1RkYwQ1xuICAgICAgLy8gXHU0RjdGXHU1MTc2XHU0RUU1XHU1MzlGXHU3NTFGIEVTTSBcdTc2RjRcdTYzQTVcdTRGOUJcdTZENEZcdTg5QzhcdTU2NjhcdThGRDBcdTg4NENcdUZGMENcdTY1RTJcdTRFMERcdTRGOURcdThENTZcdTk4ODRcdTY3ODRcdTVFRkFcdUZGMENcdTRFNUZcdTg5QzRcdTkwN0YgVml0ZSBcdTVCRjkgbm9kZV9tb2R1bGVzIFx1NTE4NVxuICAgICAgLy8gXHU1QjUwXHU4REVGXHU1Rjg0IGltcG9ydCBcdTRFMERcdTkxQ0RcdTUxOTlcdTVCRkNcdTgxRjRcdTc2ODQgU3ludGF4RXJyb3JcdTMwMDJcbiAgICAgIHsgZmluZDogL15kYXlqcyQvLCByZXBsYWNlbWVudDogJ2RheWpzL2VzbS9pbmRleC5qcycgfSxcbiAgICAgIHsgZmluZDogL15kYXlqc1xcL3BsdWdpblxcLyguKz8pKD86XFwuanMpPyQvLCByZXBsYWNlbWVudDogJ2RheWpzL2VzbS9wbHVnaW4vJDEvaW5kZXguanMnIH0sXG4gICAgXSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgICBob3N0OiAnMC4wLjAuMCcsXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIC8vIFx1Nzk4MVx1NzUyOFx1NEY5RFx1OEQ1Nlx1OTg4NFx1Njc4NFx1NUVGQVx1NEUwRVx1OEZEMFx1ODg0Q1x1NjVGNlx1NTNEMVx1NzNCMFx1RkYxQVx1OTA3Rlx1NTE0RFx1OTFDRFx1NEYxOFx1NTMxNlx1ODlFNlx1NTNEMVx1NjI3OVx1OTFDRlx1NTIyMFx1N0YxM1x1NUI1OFx1ODhBQiBzYWZlLWRlbGV0ZSBcdTVCODhcdTUzNkJcdTYyRTZcdTYyMkFcdTVCRkNcdTgxRjRcdTVEMjlcdTZFODNcbiAgICAvLyBcdUZGMDhcdTY3MkNcdTk4NzlcdTc2RUVcdTc2ODQgdnVlL2VsZW1lbnQtcGx1cy92YW50L3BpbmlhL2VjaGFydHMvZGF5anMtZXNtIFx1NTc0N1x1NEUzQSBFU01cdUZGMENcdTY1RTBcdTk3MDBcdTk4ODRcdTY3ODRcdTVFRkFcdUZGMDlcbiAgICBub0Rpc2NvdmVyeTogdHJ1ZSxcbiAgICBpbmNsdWRlOiBbXSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICAvLyBcdTZDOTlcdTdCQjEgc2FmZS1kZWxldGUgXHU1QkY5IGRpc3QgXHU1MTg1XHU1OTI3XHU5MUNGXHU2NTg3XHU0RUY2XHU4OUU2XHU1M0QxXHU2MkU2XHU2MjJBXHVGRjBDXHU1MTczXHU5NUVEXHU4MUVBXHU1MkE4XHU2RTA1XHU3QTdBXHU3NTMxXHU0RUJBXHU1REU1L1x1ODExQVx1NjcyQ1x1NkUwNVx1NzQwNlxuICAgIGVtcHR5T3V0RGlyOiBmYWxzZSxcbiAgfSxcbiAgY3NzOiB7XG4gICAgcHJlcHJvY2Vzc29yT3B0aW9uczoge1xuICAgICAgc2Nzczoge1xuICAgICAgICBhcGk6ICdtb2Rlcm4nLFxuICAgICAgICBhZGRpdGlvbmFsRGF0YTogYEB1c2UgXCJAL3N0eWxlcy92YXJpYWJsZXNcIiBhcyAqO2AsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5UCxTQUFTLG9CQUFvQjtBQUN0UixPQUFPLFNBQVM7QUFDaEIsT0FBTyxnQkFBZ0I7QUFDdkIsT0FBTyxnQkFBZ0I7QUFDdkIsU0FBUywyQkFBMkI7QUFDcEMsU0FBUyxlQUFlO0FBTHhCLElBQU0sbUNBQW1DO0FBT3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLElBQUk7QUFBQSxJQUNKLFdBQVc7QUFBQSxNQUNULFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQztBQUFBLE1BQ2pDLFNBQVMsQ0FBQyxPQUFPLGNBQWMsT0FBTztBQUFBLE1BQ3RDLEtBQUs7QUFBQSxJQUNQLENBQUM7QUFBQSxJQUNELFdBQVc7QUFBQSxNQUNULFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQztBQUFBLE1BQ2pDLEtBQUs7QUFBQSxJQUNQLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxFQUFFLE1BQU0sS0FBSyxhQUFhLFFBQVEsa0NBQVcsS0FBSyxFQUFFO0FBQUEsTUFDcEQsRUFBRSxNQUFNLG1CQUFtQixhQUFhLFFBQVEsa0NBQVcsb0NBQW9DLEVBQUU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BS2pHLEVBQUUsTUFBTSxXQUFXLGFBQWEscUJBQXFCO0FBQUEsTUFDckQsRUFBRSxNQUFNLG1DQUFtQyxhQUFhLCtCQUErQjtBQUFBLElBQ3pGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLGNBQWM7QUFBQTtBQUFBO0FBQUEsSUFHWixhQUFhO0FBQUEsSUFDYixTQUFTLENBQUM7QUFBQSxFQUNaO0FBQUEsRUFDQSxPQUFPO0FBQUE7QUFBQSxJQUVMLGFBQWE7QUFBQSxFQUNmO0FBQUEsRUFDQSxLQUFLO0FBQUEsSUFDSCxxQkFBcUI7QUFBQSxNQUNuQixNQUFNO0FBQUEsUUFDSixLQUFLO0FBQUEsUUFDTCxnQkFBZ0I7QUFBQSxNQUNsQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
