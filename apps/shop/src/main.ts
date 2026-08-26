import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import 'vant/lib/index.css'
import './styles/index.scss'
import { ensureSiteBranding, siteBranding } from './utils/site'

ensureSiteBranding().then(() => {
  if (!siteBranding.icon) return
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (link) link.href = siteBranding.icon
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
