import { createRouter, createWebHistory } from 'vue-router'
import NewChat from '../components/NewChat.vue'
import ChatPage from '../views/ChatPage.vue'

const routes = [
  {
    path: '/',
    name: 'NewChat',
    component: NewChat
  },
  {
    path: '/chat',
    name: 'Chat',
    component: ChatPage,
    props: true,
    beforeEnter: (to, from, next) => {
      if (!to.query.sessionId) {
        next('/')
      } else {
        next()
      }
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 