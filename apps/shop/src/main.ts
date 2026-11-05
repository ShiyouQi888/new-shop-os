import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import 'vant/lib/index.css'
import './styles/index.scss'
import { ensureSiteBranding, refreshSiteBranding } from './utils/site'

void ensureSiteBranding()
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void refreshSiteBranding()
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
