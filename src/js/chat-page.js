import { sendMessage } from '../api/ollama'
import chatDB from '../services/db'

export default {
  name: 'ChatPage',
  props: {
    selectedModel: {
      type: String,
      required: true
    },
    isCollapsed: {
      type: Boolean,
      default: false
    },
    currentSessionId: {
      type: Number,
      default: null
    }
  },
  data() {
    return {
      messages: [],
      inputMessage: '',
      isTyping: false,
      controller: null,
      isLoading: false,
      retryCount: 0,
      localSessionId: null
    }
  },
  watch: {
    currentSessionId: {
      immediate: true,
      async handler(newId, oldId) {
        console.log('currentSessionId 变化:', { newId, oldId })
        if (newId) {
          console.log('设置 localSessionId:', newId)
          this.localSessionId = newId
          await this.loadSessionMessages(newId)
        } else {
          console.log('清空消息列表')
          this.messages = []
        }
      }
    },
    '$route': {
      immediate: true,
      async handler(to, from) {
        console.log('路由变化:', {
          to: to.fullPath,
          from: from?.fullPath,
          query: to.query
        })
        
        const sessionId = parseInt(to.query.sessionId)
        console.log('从路由获取的 sessionId:', sessionId)
        
        if (sessionId && !this.isLoading) {
          this.localSessionId = sessionId
          console.log('更新 localSessionId:', sessionId)
          
          if (sessionId !== this.currentSessionId) {
            console.log('通知父组件更新 currentSessionId:', sessionId)
            this.$emit('update:currentSessionId', sessionId)
          }
          
          await this.loadSessionMessages(sessionId)
        }
      }
    }
  },
  computed: {
    canSend() {
      return this.inputMessage.trim() !== '' && !this.isTyping
    }
  },
  methods: {
    adjustHeight() {
      const textarea = this.$refs.textarea
      textarea.style.height = 'auto'
      const height = Math.min(textarea.scrollHeight, 400)
      textarea.style.height = Math.max(100, height) + 'px'
    },
    handleEnter(e) {
      if (e.shiftKey) return
      this.sendMessage()
    },
    handleClick() {
      if (this.isTyping) {
        this.stopGenerating()
      } else if (this.canSend) {
        this.sendMessage()
      }
    },
    handleSend() {
      this.sendMessage()
    },
    stopGenerating() {
      if (this.controller) {
        this.controller.abort()
        this.controller = null
        this.isTyping = false
      }
    },
    async sendMessage(directMessage) {
      const messageToSend = directMessage || this.inputMessage.trim()
      if ((!messageToSend && !directMessage) || this.isTyping) return
      
      if (!this.currentSessionId) {
        try {
          const sessionId = await chatDB.createSession(messageToSend)
          this.$emit('update:currentSessionId', sessionId)
          await this.$nextTick()
          if (!this.currentSessionId) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        } catch (error) {
          console.error('创建新会话失败:', error)
          return
        }
      }

      this.isTyping = true
      let aiMessage = null
      this.controller = new AbortController()

      try {
        const userMessage = {
          type: 'user',
          content: messageToSend
        }
        this.messages.push(userMessage)
        await chatDB.addMessage(userMessage, this.currentSessionId)
        
        this.inputMessage = ''
        
        await this.$nextTick()
        this.adjustHeight()
        this.scrollToBottom()
        
        if (!this.selectedModel) {
          aiMessage = {
            type: 'ai',
            content: '无可用API'
          }
          this.messages.push(aiMessage)
          await chatDB.addMessage(aiMessage, this.currentSessionId)
          return
        }
        
        aiMessage = {
          type: 'ai',
          content: ''
        }
        this.messages.push(aiMessage)

        const context = this.messages
          .slice(-10)
          .map(msg => msg.content)
          .join('\n\n')
        
        const response = await sendMessage(
          this.selectedModel, 
          [context],
          (text) => {
            if (!text) return
            aiMessage.content = text
            this.$forceUpdate()
            this.$nextTick(() => {
              this.scrollToBottom()
            })
          },
          this.controller.signal
        )

        if (response) {
          await chatDB.addMessage({
            type: 'ai',
            content: response
          }, this.currentSessionId)
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          if (aiMessage) {
            aiMessage.content += ' [已停止生成]'
            await chatDB.addMessage({
              type: 'ai',
              content: aiMessage.content
            }, this.currentSessionId)
          }
          return
        }

        console.error('聊天错误:', error)
        let errorMessage = '无可用API'
        
        if (aiMessage) {
          aiMessage.content = errorMessage
          await chatDB.addMessage({
            type: 'ai',
            content: errorMessage
          }, this.currentSessionId)
        } else {
          const errorMsg = {
            type: 'ai',
            content: errorMessage
          }
          this.messages.push(errorMsg)
          await chatDB.addMessage(errorMsg, this.currentSessionId)
        }
      } finally {
        this.isTyping = false
        this.controller = null
        this.$forceUpdate()
      }
    },
    scrollToBottom() {
      const messageList = this.$refs.messageList
      messageList.scrollTop = messageList.scrollHeight
    },
    async loadSessionMessages(sessionId = null) {
      const targetSessionId = sessionId || this.localSessionId || this.currentSessionId
      console.log('开始加载消息，目标会话ID:', targetSessionId, {
        sessionId,
        localSessionId: this.localSessionId,
        currentSessionId: this.currentSessionId,
        routeSessionId: this.$route.query.sessionId
      })
      
      if (!targetSessionId) {
        console.warn('没有有效的会话ID，跳过加载')
        return
      }
      
      if (this.isLoading) {
        console.warn('消息正在加载中，跳过重复加载')
        return
      }

      this.isLoading = true
      console.log('开始从数据库加载消息')
      
      try {
        const messages = await chatDB.getSessionMessages(targetSessionId)
        console.log('数据库返回的消息:', messages)
        
        if (messages && messages.length > 0) {
          console.log(`成功加载 ${messages.length} 条消息`)
          this.messages = messages
          this.$nextTick(() => {
            this.scrollToBottom()
            console.log('消息列表已更新并滚动到底部')
          })
        } else {
          console.warn('数据库未返回消息或消息为空')
        }
      } catch (error) {
        console.error('加载会话消息失败:', error)
        window.addDebugLog?.('error', `加载会话消息失败: ${error.message}`)
      } finally {
        this.isLoading = false
      }
    }
  },
  async created() {
    console.log('ChatPage 组件创建')
    const sessionId = parseInt(this.$route.query.sessionId)
    console.log('初始化时从路由获取的 sessionId:', sessionId)
    
    if (sessionId) {
      console.log('设置初始 localSessionId:', sessionId)
      this.localSessionId = sessionId
      await this.loadSessionMessages(sessionId)
      
      if (sessionId !== this.currentSessionId) {
        console.log('通知父组件更新初始 currentSessionId:', sessionId)
        this.$emit('update:currentSessionId', sessionId)
      }
    } else {
      console.log('初始化时没有 sessionId')
    }
  },
  async mounted() {
    const queryMessage = this.$route.query.q
    if (queryMessage) {
      await this.$nextTick()
      if (this.currentSessionId) {
        await this.loadSessionMessages(this.currentSessionId)
      }
      await this.sendMessage(queryMessage)
      
      // 清除查询参数，防止刷新时重复发送
      const query = { ...this.$route.query }
      delete query.q
      await this.$router.replace({ query })
    }
  }
} 