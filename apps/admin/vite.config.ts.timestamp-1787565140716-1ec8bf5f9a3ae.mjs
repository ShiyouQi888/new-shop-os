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
    alias: {
      "@": resolve(__vite_injected_original_dirname, "src"),
      "@shop-os/shared": resolve(__vite_injected_original_dirname, "../../packages/shared/src/index.ts")
    }
  },
  server: {
    port: 5173,
    host: "0.0.0.0"
  },
  optimizeDeps: {
    // 禁用依赖预构建与运行时发现：避免重优化触发批量删缓存被 safe-delete 守卫拦截导致崩溃
    noDiscovery: true,
    // dayjs 的包入口是 UMD 文件，浏览器直连时没有 default export，需要显式预构建
    include: ["dayjs"]
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxzaG9wLU9TXFxcXGFwcHNcXFxcYWRtaW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXHNob3AtT1NcXFxcYXBwc1xcXFxhZG1pblxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovc2hvcC1PUy9hcHBzL2FkbWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xuaW1wb3J0IEF1dG9JbXBvcnQgZnJvbSAndW5wbHVnaW4tYXV0by1pbXBvcnQvdml0ZSdcbmltcG9ydCBDb21wb25lbnRzIGZyb20gJ3VucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3ZpdGUnXG5pbXBvcnQgeyBFbGVtZW50UGx1c1Jlc29sdmVyIH0gZnJvbSAndW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvcmVzb2x2ZXJzJ1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICB2dWUoKSxcbiAgICBBdXRvSW1wb3J0KHtcbiAgICAgIHJlc29sdmVyczogW0VsZW1lbnRQbHVzUmVzb2x2ZXIoKV0sXG4gICAgICBpbXBvcnRzOiBbJ3Z1ZScsICd2dWUtcm91dGVyJywgJ3BpbmlhJ10sXG4gICAgICBkdHM6ICdzcmMvYXV0by1pbXBvcnRzLmQudHMnLFxuICAgIH0pLFxuICAgIENvbXBvbmVudHMoe1xuICAgICAgcmVzb2x2ZXJzOiBbRWxlbWVudFBsdXNSZXNvbHZlcigpXSxcbiAgICAgIGR0czogJ3NyYy9jb21wb25lbnRzLmQudHMnLFxuICAgIH0pLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSxcbiAgICAgICdAc2hvcC1vcy9zaGFyZWQnOiByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3BhY2thZ2VzL3NoYXJlZC9zcmMvaW5kZXgudHMnKSxcbiAgICB9LFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTczLFxuICAgIGhvc3Q6ICcwLjAuMC4wJyxcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgLy8gXHU3OTgxXHU3NTI4XHU0RjlEXHU4RDU2XHU5ODg0XHU2Nzg0XHU1RUZBXHU0RTBFXHU4RkQwXHU4ODRDXHU2NUY2XHU1M0QxXHU3M0IwXHVGRjFBXHU5MDdGXHU1MTREXHU5MUNEXHU0RjE4XHU1MzE2XHU4OUU2XHU1M0QxXHU2Mjc5XHU5MUNGXHU1MjIwXHU3RjEzXHU1QjU4XHU4OEFCIHNhZmUtZGVsZXRlIFx1NUI4OFx1NTM2Qlx1NjJFNlx1NjIyQVx1NUJGQ1x1ODFGNFx1NUQyOVx1NkU4M1xuICAgIG5vRGlzY292ZXJ5OiB0cnVlLFxuICAgIC8vIGRheWpzIFx1NzY4NFx1NTMwNVx1NTE2NVx1NTNFM1x1NjYyRiBVTUQgXHU2NTg3XHU0RUY2XHVGRjBDXHU2RDRGXHU4OUM4XHU1NjY4XHU3NkY0XHU4RkRFXHU2NUY2XHU2Q0ExXHU2NzA5IGRlZmF1bHQgZXhwb3J0XHVGRjBDXHU5NzAwXHU4OTgxXHU2NjNFXHU1RjBGXHU5ODg0XHU2Nzg0XHU1RUZBXG4gICAgaW5jbHVkZTogWydkYXlqcyddLFxuICB9LFxuICBidWlsZDoge1xuICAgIC8vIFx1NkM5OVx1N0JCMSBzYWZlLWRlbGV0ZSBcdTVCRjkgZGlzdCBcdTUxODVcdTU5MjdcdTkxQ0ZcdTY1ODdcdTRFRjZcdTg5RTZcdTUzRDFcdTYyRTZcdTYyMkFcdUZGMENcdTUxNzNcdTk1RURcdTgxRUFcdTUyQThcdTZFMDVcdTdBN0FcdTc1MzFcdTRFQkFcdTVERTUvXHU4MTFBXHU2NzJDXHU2RTA1XHU3NDA2XG4gICAgZW1wdHlPdXREaXI6IGZhbHNlLFxuICB9LFxuICBjc3M6IHtcbiAgICBwcmVwcm9jZXNzb3JPcHRpb25zOiB7XG4gICAgICBzY3NzOiB7XG4gICAgICAgIGFwaTogJ21vZGVybicsXG4gICAgICAgIGFkZGl0aW9uYWxEYXRhOiBgQHVzZSBcIkAvc3R5bGVzL3ZhcmlhYmxlc1wiIGFzICo7YCxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlQLFNBQVMsb0JBQW9CO0FBQ3RSLE9BQU8sU0FBUztBQUNoQixPQUFPLGdCQUFnQjtBQUN2QixPQUFPLGdCQUFnQjtBQUN2QixTQUFTLDJCQUEyQjtBQUNwQyxTQUFTLGVBQWU7QUFMeEIsSUFBTSxtQ0FBbUM7QUFPekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osV0FBVztBQUFBLE1BQ1QsV0FBVyxDQUFDLG9CQUFvQixDQUFDO0FBQUEsTUFDakMsU0FBUyxDQUFDLE9BQU8sY0FBYyxPQUFPO0FBQUEsTUFDdEMsS0FBSztBQUFBLElBQ1AsQ0FBQztBQUFBLElBQ0QsV0FBVztBQUFBLE1BQ1QsV0FBVyxDQUFDLG9CQUFvQixDQUFDO0FBQUEsTUFDakMsS0FBSztBQUFBLElBQ1AsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssUUFBUSxrQ0FBVyxLQUFLO0FBQUEsTUFDN0IsbUJBQW1CLFFBQVEsa0NBQVcsb0NBQW9DO0FBQUEsSUFDNUU7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsY0FBYztBQUFBO0FBQUEsSUFFWixhQUFhO0FBQUE7QUFBQSxJQUViLFNBQVMsQ0FBQyxPQUFPO0FBQUEsRUFDbkI7QUFBQSxFQUNBLE9BQU87QUFBQTtBQUFBLElBRUwsYUFBYTtBQUFBLEVBQ2Y7QUFBQSxFQUNBLEtBQUs7QUFBQSxJQUNILHFCQUFxQjtBQUFBLE1BQ25CLE1BQU07QUFBQSxRQUNKLEtBQUs7QUFBQSxRQUNMLGdCQUFnQjtBQUFBLE1BQ2xCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
