/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// esbuild 打包产物，无随附类型声明，实际使用处已按 any 处理（见 utils/qrcode.ts）
declare module '*.mjs' {
  const value: unknown
  export default value
}
