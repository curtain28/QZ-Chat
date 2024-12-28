import { getModels } from '../api/ollama'
import SessionList from '../components/SessionList.vue'

export default {
  name: 'App',
  components: {
    SessionList
  },
  data() {
    return {
      isCollapsed: false,
      models: [],
      selectedModel: '',
      isConnected: false,
      showDebugLog: false,
      debugLogs: [],
      isDragging: false,
      dragOffset: {
        x: 0,
        y: 0
      },
      windowPosition: {
        x: window.innerWidth - 520,
        y: 80
      },
      windowSize: {
        width: 500,
        height: 400
      },
      isResizing: false,
      resizeDirection: '',
      showPromptWindow: false,
      currentSessionId: null
    }
  },
  watch: {
    '$route': {
      immediate: true,
      handler(to) {
        if (to.path === '/chat') {
          const sessionId = parseInt(to.query.sessionId)
          if (sessionId && sessionId !== this.currentSessionId) {
            this.currentSessionId = sessionId
            this.$nextTick(() => {
              this.$refs.sessionList?.loadSessions()
            })
          } else if (!sessionId && this.currentSessionId) {
            this.$router.replace({
              path: '/chat',
              query: { sessionId: this.currentSessionId }
            })
          }
        }
      }
    },
    currentSessionId: {
      handler(newId) {
        if (newId) {
          localStorage.setItem('lastSessionId', newId.toString())
          if (this.$route.path === '/chat' && parseInt(this.$route.query.sessionId) !== newId) {
            this.$router.replace({
              path: '/chat',
              query: { sessionId: newId }
            })
          }
        } else {
          localStorage.removeItem('lastSessionId')
        }
      }
    }
  },
  methods: {
    toggleSidebar() {
      this.isCollapsed = !this.isCollapsed
    },
    async loadModels() {
      try {
        const models = await getModels()
        this.isConnected = Array.isArray(models) && models.length > 0
        this.models = models
        
        if (models.length > 0) {
          this.selectedModel = models[0].name
        }
      } catch (error) {
        this.isConnected = false
        this.models = []
        console.error('加载模型失败:', error)
      }
    },
    addDebugLog(type, message) {
      const time = new Date().toLocaleTimeString()
      this.debugLogs.unshift({
        time,
        type,
        message
      })
      if (this.debugLogs.length > 100) {
        this.debugLogs.pop()
      }
    },
    clearDebugLogs() {
      this.debugLogs = []
    },
    toggleDebugLog() {
      this.showDebugLog = !this.showDebugLog
    },
    startDrag(e) {
      this.isDragging = true
      this.dragOffset = {
        x: e.clientX - this.windowPosition.x,
        y: e.clientY - this.windowPosition.y
      }
      document.addEventListener('mousemove', this.onDrag)
      document.addEventListener('mouseup', this.stopDrag)
    },
    onDrag(e) {
      if (this.isDragging) {
        this.windowPosition = {
          x: e.clientX - this.dragOffset.x,
          y: e.clientY - this.dragOffset.y
        }
      }
    },
    stopDrag() {
      this.isDragging = false
      document.removeEventListener('mousemove', this.onDrag)
      document.removeEventListener('mouseup', this.stopDrag)
    },
    startResize(e, direction) {
      this.isResizing = true
      this.resizeDirection = direction
      
      document.addEventListener('mousemove', this.onResize)
      document.addEventListener('mouseup', this.stopResize)
    },
    onResize(e) {
      if (!this.isResizing) return
      
      const minWidth = 300
      const minHeight = 200
      const maxWidth = window.innerWidth - 40
      const maxHeight = window.innerHeight - 40
      
      if (this.resizeDirection.includes('e')) {
        const newWidth = e.clientX - this.windowPosition.x
        this.windowSize.width = Math.min(Math.max(newWidth, minWidth), maxWidth)
      }
      if (this.resizeDirection.includes('s')) {
        const newHeight = e.clientY - this.windowPosition.y
        this.windowSize.height = Math.min(Math.max(newHeight, minHeight), maxHeight)
      }
      if (this.resizeDirection.includes('w')) {
        const newWidth = this.windowSize.width + (this.windowPosition.x - e.clientX)
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          this.windowPosition.x = e.clientX
          this.windowSize.width = newWidth
        }
      }
      if (this.resizeDirection.includes('n')) {
        const newHeight = this.windowSize.height + (this.windowPosition.y - e.clientY)
        if (newHeight >= minHeight && newHeight <= maxHeight) {
          this.windowPosition.y = e.clientY
          this.windowSize.height = newHeight
        }
      }
    },
    stopResize() {
      this.isResizing = false
      this.resizeDirection = ''
      document.removeEventListener('mousemove', this.onResize)
      document.removeEventListener('mouseup', this.stopResize)
    },
    handleResize() {
      if (this.windowPosition.x + this.windowSize.width > window.innerWidth) {
        this.windowPosition.x = window.innerWidth - this.windowSize.width - 20
      }
      if (this.windowPosition.x < 0) {
        this.windowPosition.x = 20
      }
      if (this.windowPosition.y < 0) {
        this.windowPosition.y = 20
      }
      if (this.windowPosition.y + this.windowSize.height > window.innerHeight) {
        this.windowPosition.y = window.innerHeight - this.windowSize.height - 20
      }
    },
    togglePromptWindow() {
      this.showPromptWindow = !this.showPromptWindow
    },
    handleSessionSelect(sessionId) {
      this.currentSessionId = parseInt(sessionId) || null
      if (sessionId) {
        this.$router.push({
          path: '/chat',
          query: { sessionId }
        })
        this.$refs.sessionList?.loadSessions()
      }
    },
    createNewChat() {
      this.currentSessionId = null
      localStorage.removeItem('lastSessionId')
      this.$router.push('/')
    },
    handleSessionDeleted(sessionId) {
      if (parseInt(this.currentSessionId) === parseInt(sessionId)) {
        this.currentSessionId = null
        this.$router.push('/')
      }
      this.$refs.sessionList?.loadSessions()
    }
  },
  provide() {
    return {
      addDebugLog: (type, message) => {
        const time = new Date().toLocaleTimeString()
        this.debugLogs.unshift({
          time,
          type,
          message
        })
        if (this.debugLogs.length > 10000) {
          this.debugLogs.pop()
        }
      }
    }
  },
  async mounted() {
    this.loadModels()
    window.addEventListener('resize', this.handleResize)
    
    if (this.$route.path === '/chat') {
      const routeSessionId = parseInt(this.$route.query.sessionId)
      const savedSessionId = parseInt(localStorage.getItem('lastSessionId'))
      
      if (routeSessionId) {
        this.currentSessionId = routeSessionId
      } else if (savedSessionId) {
        this.currentSessionId = savedSessionId
        this.$router.replace({
          path: '/chat',
          query: { sessionId: savedSessionId }
        })
      } else {
        this.$router.replace('/')
      }
    }
    
    this.$nextTick(() => {
      this.$refs.sessionList?.loadSessions()
    })
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
  }
} 