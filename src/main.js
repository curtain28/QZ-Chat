import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)

// 设置全局调试日志函数
window.addDebugLog = (type, message) => {
  const vm = app._instance.proxy
  if (vm && vm.addDebugLog) {
    vm.addDebugLog(type, message)
  }
}

app.mount('#app')
