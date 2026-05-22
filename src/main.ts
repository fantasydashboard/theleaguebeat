import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueApexCharts from 'vue3-apexcharts'
import App from './App.vue'
import router from './router'
import './style.css'
import { inject } from '@vercel/analytics'  // ← add line 7

const app = createApp(App)

inject()  // ← add after this blank line

app.use(createPinia())
app.use(router)
app.use(VueApexCharts)

app.mount('#app')