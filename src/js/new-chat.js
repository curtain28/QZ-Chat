import { useRouter } from 'vue-router'
import chatDB from '../services/db'

export default {
  name: 'SearchInput',
  props: {
    isCollapsed: {
      type: Boolean,
      default: false
    },
    selectedModel: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      message: ''
    }
  },
  setup() {
    const router = useRouter()
    return { router }
  },
  computed: {
    wrapperStyle() {
      const sidebarWidth = this.isCollapsed ? '0px' : '260px'
      return {
        left: `calc(50% + ${sidebarWidth} / 2)`,
        transition: 'left var(--anim-duration) var(--anim-timing)'
      }
    }
  },
  methods: {
    adjustHeight() {
      const textarea = this.$refs.textarea
      textarea.style.height = 'auto'
      const height = Math.min(textarea.scrollHeight, 400)
      textarea.style.height = Math.max(100, height) + 'px'
    },
    async handleSend() {
      if (this.message.trim()) {
        try {
          // 创建新会话，使用消息的前20个字符作为标题
          const title = this.message.trim().slice(0, 20) + (this.message.length > 20 ? '...' : '')
          const sessionId = await chatDB.createSession(title)
          
          // 更新当前会话ID
          this.$emit('update:current-session-id', sessionId)
          
          // 跳转到聊天页面并带上消息内容
          this.router.push({
            path: '/chat',
            query: { 
              q: this.message,
              sessionId
            }
          })
          
          // 清空输入框
          this.message = ''
        } catch (error) {
          console.error('创建新会话失败:', error)
        }
      }
    },
    handleEnterPress(e) {
      // 如果按下Shift+Enter，允许换行
      if (e.shiftKey) return
      
      // 否则发送消息
      this.handleSend()
    }
  }
} 