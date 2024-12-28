import chatDB from '../services/db'
import { useRouter } from 'vue-router'

export default {
  name: 'SessionList',
  props: {
    currentSessionId: {
      type: [Number, String],
      default: null
    }
  },
  setup() {
    const router = useRouter()
    return { router }
  },
  data() {
    return {
      sessions: [],
      editingSessionId: null,
      showDeleteConfirm: false,
      pendingDeleteId: null,
      forceUpdate: 0
    }
  },
  computed: {
    groupedSessions() {
      const groups = {
        '今天': [],
        '昨天': [],
        '前 7 天': [],
        '更早': []
      }
      
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      this.sessions.forEach(session => {
        const timestamp = new Date(session.timestamp)
        const sessionDate = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate())
        
        if (sessionDate.getTime() === today.getTime()) {
          groups['今天'].push(session)
        } else if (sessionDate.getTime() === yesterday.getTime()) {
          groups['昨天'].push(session)
        } else if (sessionDate >= weekAgo) {
          groups['前 7 天'].push(session)
        } else {
          groups['更早'].push(session)
        }
      })
      
      return Object.fromEntries(
        Object.entries(groups).filter(([, group]) => group.length > 0)
      )
    }
  },
  methods: {
    async loadSessions() {
      try {
        const sessions = await chatDB.getAllSessions()
        this.sessions = sessions.sort((a, b) => b.timestamp - a.timestamp)
      } catch (error) {
        console.error('加载会话列表失败:', error)
      }
    },
    createNewSession() {
      this.router.push('/')
    },
    selectSession(sessionId) {
      this.$emit('select-session', parseInt(sessionId))
    },
    handleTitleClick(event, session) {
      if (this.editingSessionId === session.id) {
        event.stopPropagation()
      } else {
        this.selectSession(session.id)
      }
    },
    startEditTitle(sessionId) {
      event.stopPropagation()
      this.editingSessionId = sessionId
      this.$nextTick(() => {
        const editor = this.$refs.titleEditor.find(
          el => el.parentElement.parentElement.getAttribute('data-id') === sessionId
        )
        if (editor) {
          editor.focus()
          const range = document.createRange()
          range.selectNodeContents(editor)
          range.collapse(false)
          const selection = window.getSelection()
          selection.removeAllRanges()
          selection.addRange(range)
        }
      })
    },
    async handleBlur(event, session) {
      if (event.relatedTarget && event.relatedTarget.closest('.session-item__title')) {
        return
      }

      const newTitle = event.target.innerText.trim()
      if (newTitle && newTitle !== session.title) {
        try {
          await chatDB.updateSessionTitle(session.id, newTitle)
          await this.loadSessions()
        } catch (error) {
          console.error('更新会话标题失败:', error)
          event.target.innerText = session.title
        }
      } else {
        event.target.innerText = session.title
      }
      this.editingSessionId = null
    },
    async deleteSession(sessionId) {
      this.pendingDeleteId = sessionId
      this.showDeleteConfirm = true
    },
    cancelDelete() {
      this.showDeleteConfirm = false
      this.pendingDeleteId = null
    },
    async confirmDelete() {
      try {
        const sessionId = parseInt(this.pendingDeleteId)
        
        this.sessions = this.sessions.filter(session => session.id !== sessionId)
        
        if (this.currentSessionId && parseInt(this.currentSessionId) === sessionId) {
          this.router.push('/')
        }
        
        await chatDB.deleteSession(sessionId)
        
        this.$emit('session-deleted', sessionId)
        
        await this.loadSessions()
      } catch (error) {
        console.error('删除会话失败:', error)
        await this.loadSessions()
      } finally {
        this.showDeleteConfirm = false
        this.pendingDeleteId = null
      }
    },
    handleGlobalClick(event) {
      if (this.editingSessionId) {
        const titleEditor = this.$refs.titleEditor.find(
          el => el.parentElement.parentElement.getAttribute('data-id') === this.editingSessionId
        )
        const isClickInside = titleEditor && (
          titleEditor.contains(event.target) || 
          titleEditor === event.target || 
          event.target.closest('.session-item__title') ||
          event.target.closest('.session-item__content')
        )
        const isClickRenameButton = event.target.closest('.action-btn')
        
        if (!isClickInside && !isClickRenameButton) {
          this.editingSessionId = null
        }
      }
    }
  },
  watch: {
    currentSessionId: {
      immediate: true,
      handler(newId) {
        if (newId === null) {
          this.loadSessions()
        }
      }
    },
    forceUpdate: {
      handler() {
        this.$nextTick(() => {
          this.loadSessions()
        })
      }
    }
  },
  mounted() {
    this.loadSessions()
    document.addEventListener('click', this.handleGlobalClick)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleGlobalClick)
  }
} 