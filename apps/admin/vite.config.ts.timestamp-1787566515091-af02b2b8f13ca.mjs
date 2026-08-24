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
      { find: /^dayjs\/plugin\/(.+)$/, replacement: "dayjs/esm/plugin/$1/index.js" }
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxzaG9wLU9TXFxcXGFwcHNcXFxcYWRtaW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXHNob3AtT1NcXFxcYXBwc1xcXFxhZG1pblxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovc2hvcC1PUy9hcHBzL2FkbWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xuaW1wb3J0IEF1dG9JbXBvcnQgZnJvbSAndW5wbHVnaW4tYXV0by1pbXBvcnQvdml0ZSdcbmltcG9ydCBDb21wb25lbnRzIGZyb20gJ3VucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3ZpdGUnXG5pbXBvcnQgeyBFbGVtZW50UGx1c1Jlc29sdmVyIH0gZnJvbSAndW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvcmVzb2x2ZXJzJ1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICB2dWUoKSxcbiAgICBBdXRvSW1wb3J0KHtcbiAgICAgIHJlc29sdmVyczogW0VsZW1lbnRQbHVzUmVzb2x2ZXIoKV0sXG4gICAgICBpbXBvcnRzOiBbJ3Z1ZScsICd2dWUtcm91dGVyJywgJ3BpbmlhJ10sXG4gICAgICBkdHM6ICdzcmMvYXV0by1pbXBvcnRzLmQudHMnLFxuICAgIH0pLFxuICAgIENvbXBvbmVudHMoe1xuICAgICAgcmVzb2x2ZXJzOiBbRWxlbWVudFBsdXNSZXNvbHZlcigpXSxcbiAgICAgIGR0czogJ3NyYy9jb21wb25lbnRzLmQudHMnLFxuICAgIH0pLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IFtcbiAgICAgIHsgZmluZDogJ0AnLCByZXBsYWNlbWVudDogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSB9LFxuICAgICAgeyBmaW5kOiAnQHNob3Atb3Mvc2hhcmVkJywgcmVwbGFjZW1lbnQ6IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vcGFja2FnZXMvc2hhcmVkL3NyYy9pbmRleC50cycpIH0sXG4gICAgICAvLyBkYXlqcyBcdTlFRDhcdThCQTRcdTUxNjVcdTUzRTNcdTY2MkYgVU1EXHVGRjA4ZGF5anMubWluLmpzXHVGRjA5XHVGRjBDXHU2RDRGXHU4OUM4XHU1NjY4XHU3NkY0XHU4RkRFXHU2Q0ExXHU2NzA5IGRlZmF1bHQgZXhwb3J0XHVGRjFCXG4gICAgICAvLyBlbGVtZW50LXBsdXMgXHU1MTg1XHU5MEU4XHU4RkQ4XHU0RjFBIGltcG9ydCBkYXlqcy9wbHVnaW4vKlx1RkYwOENKU1x1RkYwOVx1MzAwMlx1NjI4QSBkYXlqcyBcdTUzQ0FcdTUxNzZcdTYzRDJcdTRFRjZcdTdFREZcdTRFMDBcdTYzMDdcdTU0MTEgRVNNIFx1Njc4NFx1NUVGQVx1RkYwQ1xuICAgICAgLy8gXHU0RjdGXHU1MTc2XHU0RUU1XHU1MzlGXHU3NTFGIEVTTSBcdTc2RjRcdTYzQTVcdTRGOUJcdTZENEZcdTg5QzhcdTU2NjhcdThGRDBcdTg4NENcdUZGMENcdTY1RTJcdTRFMERcdTRGOURcdThENTZcdTk4ODRcdTY3ODRcdTVFRkFcdUZGMENcdTRFNUZcdTg5QzRcdTkwN0YgVml0ZSBcdTVCRjkgbm9kZV9tb2R1bGVzIFx1NTE4NVxuICAgICAgLy8gXHU1QjUwXHU4REVGXHU1Rjg0IGltcG9ydCBcdTRFMERcdTkxQ0RcdTUxOTlcdTVCRkNcdTgxRjRcdTc2ODQgU3ludGF4RXJyb3JcdTMwMDJcbiAgICAgIHsgZmluZDogL15kYXlqcyQvLCByZXBsYWNlbWVudDogJ2RheWpzL2VzbS9pbmRleC5qcycgfSxcbiAgICAgIHsgZmluZDogL15kYXlqc1xcL3BsdWdpblxcLyguKykkLywgcmVwbGFjZW1lbnQ6ICdkYXlqcy9lc20vcGx1Z2luLyQxL2luZGV4LmpzJyB9LFxuICAgIF0sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgaG9zdDogJzAuMC4wLjAnLFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICAvLyBcdTc5ODFcdTc1MjhcdTRGOURcdThENTZcdTk4ODRcdTY3ODRcdTVFRkFcdTRFMEVcdThGRDBcdTg4NENcdTY1RjZcdTUzRDFcdTczQjBcdUZGMUFcdTkwN0ZcdTUxNERcdTkxQ0RcdTRGMThcdTUzMTZcdTg5RTZcdTUzRDFcdTYyNzlcdTkxQ0ZcdTUyMjBcdTdGMTNcdTVCNThcdTg4QUIgc2FmZS1kZWxldGUgXHU1Qjg4XHU1MzZCXHU2MkU2XHU2MjJBXHU1QkZDXHU4MUY0XHU1RDI5XHU2RTgzXG4gICAgLy8gXHVGRjA4XHU2NzJDXHU5ODc5XHU3NkVFXHU3Njg0IHZ1ZS9lbGVtZW50LXBsdXMvdmFudC9waW5pYS9lY2hhcnRzL2RheWpzLWVzbSBcdTU3NDdcdTRFM0EgRVNNXHVGRjBDXHU2NUUwXHU5NzAwXHU5ODg0XHU2Nzg0XHU1RUZBXHVGRjA5XG4gICAgbm9EaXNjb3Zlcnk6IHRydWUsXG4gICAgaW5jbHVkZTogW10sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgLy8gXHU2Qzk5XHU3QkIxIHNhZmUtZGVsZXRlIFx1NUJGOSBkaXN0IFx1NTE4NVx1NTkyN1x1OTFDRlx1NjU4N1x1NEVGNlx1ODlFNlx1NTNEMVx1NjJFNlx1NjIyQVx1RkYwQ1x1NTE3M1x1OTVFRFx1ODFFQVx1NTJBOFx1NkUwNVx1N0E3QVx1NzUzMVx1NEVCQVx1NURFNS9cdTgxMUFcdTY3MkNcdTZFMDVcdTc0MDZcbiAgICBlbXB0eU91dERpcjogZmFsc2UsXG4gIH0sXG4gIGNzczoge1xuICAgIHByZXByb2Nlc3Nvck9wdGlvbnM6IHtcbiAgICAgIHNjc3M6IHtcbiAgICAgICAgYXBpOiAnbW9kZXJuJyxcbiAgICAgICAgYWRkaXRpb25hbERhdGE6IGBAdXNlIFwiQC9zdHlsZXMvdmFyaWFibGVzXCIgYXMgKjtgLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeVAsU0FBUyxvQkFBb0I7QUFDdFIsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sZ0JBQWdCO0FBQ3ZCLE9BQU8sZ0JBQWdCO0FBQ3ZCLFNBQVMsMkJBQTJCO0FBQ3BDLFNBQVMsZUFBZTtBQUx4QixJQUFNLG1DQUFtQztBQU96QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxJQUFJO0FBQUEsSUFDSixXQUFXO0FBQUEsTUFDVCxXQUFXLENBQUMsb0JBQW9CLENBQUM7QUFBQSxNQUNqQyxTQUFTLENBQUMsT0FBTyxjQUFjLE9BQU87QUFBQSxNQUN0QyxLQUFLO0FBQUEsSUFDUCxDQUFDO0FBQUEsSUFDRCxXQUFXO0FBQUEsTUFDVCxXQUFXLENBQUMsb0JBQW9CLENBQUM7QUFBQSxNQUNqQyxLQUFLO0FBQUEsSUFDUCxDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsRUFBRSxNQUFNLEtBQUssYUFBYSxRQUFRLGtDQUFXLEtBQUssRUFBRTtBQUFBLE1BQ3BELEVBQUUsTUFBTSxtQkFBbUIsYUFBYSxRQUFRLGtDQUFXLG9DQUFvQyxFQUFFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQUtqRyxFQUFFLE1BQU0sV0FBVyxhQUFhLHFCQUFxQjtBQUFBLE1BQ3JELEVBQUUsTUFBTSx5QkFBeUIsYUFBYSwrQkFBK0I7QUFBQSxJQUMvRTtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxjQUFjO0FBQUE7QUFBQTtBQUFBLElBR1osYUFBYTtBQUFBLElBQ2IsU0FBUyxDQUFDO0FBQUEsRUFDWjtBQUFBLEVBQ0EsT0FBTztBQUFBO0FBQUEsSUFFTCxhQUFhO0FBQUEsRUFDZjtBQUFBLEVBQ0EsS0FBSztBQUFBLElBQ0gscUJBQXFCO0FBQUEsTUFDbkIsTUFBTTtBQUFBLFFBQ0osS0FBSztBQUFBLFFBQ0wsZ0JBQWdCO0FBQUEsTUFDbEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
