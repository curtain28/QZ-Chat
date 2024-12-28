// IndexedDB 数据库服务

const DB_NAME = 'qz-chat-db'
const DB_VERSION = 3  // 增加版本号，强制更新数据库结构
const CHAT_STORE_NAME = 'chat_messages'
const SESSION_STORE_NAME = 'chat_sessions'

class ChatDB {
  constructor() {
    this.db = null
    this.initPromise = null
  }

  // 初始化数据库
  initDB() {
    // 如果已经有初始化过程在进行，直接返回该 Promise
    if (this.initPromise) {
      return this.initPromise
    }

    console.log('开始初始化数据库')
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = (event) => {
        const error = '数据库打开失败:' + event.target.error
        console.error(error)
        window.addDebugLog?.('error', error)
        this.initPromise = null // 重置 initPromise，允许重试
        reject(event.target.error)
      }

      request.onsuccess = (event) => {
        this.db = event.target.result
        console.log('数据库连接成功')
        window.addDebugLog?.('info', '数据库连接成功')
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        console.log('数据库升级，当前版本:', event.oldVersion, '新版本:', event.newVersion)
        const db = event.target.result
        
        // 如果存在旧的存储对象，先删除
        if (db.objectStoreNames.contains(CHAT_STORE_NAME)) {
          db.deleteObjectStore(CHAT_STORE_NAME)
        }
        if (db.objectStoreNames.contains(SESSION_STORE_NAME)) {
          db.deleteObjectStore(SESSION_STORE_NAME)
        }
        
        // 创建消息存储对象
        console.log('创建消息存储对象')
        const store = db.createObjectStore(CHAT_STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true
        })
        // 创建索引
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('type', 'type', { unique: false })
        store.createIndex('sessionId', 'sessionId', { unique: false })
        console.log('消息存储对象创建完成')

        // 创建会话存储对象
        console.log('创建会话存储对象')
        const sessionStore = db.createObjectStore(SESSION_STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true
        })
        sessionStore.createIndex('timestamp', 'timestamp', { unique: false })
        sessionStore.createIndex('title', 'title', { unique: false })
        console.log('会话存储对象创建完成')
        
        window.addDebugLog?.('info', '数据库结构升级完成')
      }
    })

    return this.initPromise
  }

  // 确保数据库已初始化
  async ensureDB() {
    if (!this.db) {
      await this.initDB()
    }
    return this.db
  }

  // 验证数据库结构
  async validateDB() {
    await this.ensureDB()
    
    try {
      const transaction = this.db.transaction([CHAT_STORE_NAME], 'readonly')
      const store = transaction.objectStore(CHAT_STORE_NAME)
      // 验证索引是否存在
      const indexes = ['sessionId', 'type', 'timestamp']
      indexes.forEach(indexName => {
        const index = store.index(indexName)
        if (!index) throw new Error(`索引 ${indexName} 不存在`)
      })
      console.log('数据库结构验证成功')
      return true
    } catch (error) {
      console.error('数据库结构验证失败:', error)
      // 如果验证失败，删除旧数据库并重新创建
      await this.deleteDatabase()
      this.db = null
      this.initPromise = null
      await this.initDB()
      return false
    }
  }

  // 删除数据库
  async deleteDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME)
      request.onsuccess = () => {
        console.log('数据库删除成功')
        resolve()
      }
      request.onerror = () => {
        console.error('数据库删除失败')
        reject()
      }
    })
  }

  // 创建新会话
  async createSession(title = '新对话') {
    await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SESSION_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(SESSION_STORE_NAME)
      
      const session = {
        title,
        timestamp: new Date().getTime(),
        lastMessage: ''
      }
      
      const request = store.add(session)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // 获取所有会话
  async getAllSessions() {
    await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SESSION_STORE_NAME], 'readonly')
      const store = transaction.objectStore(SESSION_STORE_NAME)
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // 更新会话标题
  async updateSessionTitle(sessionId, title) {
    await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SESSION_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(SESSION_STORE_NAME)
      
      const getRequest = store.get(sessionId)
      
      getRequest.onsuccess = () => {
        const session = getRequest.result
        if (session) {
          session.title = title
          const updateRequest = store.put(session)
          updateRequest.onsuccess = () => resolve()
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          reject(new Error('会话不存在'))
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  // 删除会话及其消息
  async deleteSession(sessionId) {
    await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SESSION_STORE_NAME, CHAT_STORE_NAME], 'readwrite')
      
      // 删除会话
      const sessionStore = transaction.objectStore(SESSION_STORE_NAME)
      const deleteRequest = sessionStore.delete(sessionId)
      
      deleteRequest.onerror = () => {
        reject(deleteRequest.error)
      }
      
      // 删除该会话的所有消息
      const messageStore = transaction.objectStore(CHAT_STORE_NAME)
      const messageIndex = messageStore.index('sessionId')
      const messageRequest = messageIndex.openCursor(IDBKeyRange.only(sessionId))
      
      messageRequest.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }
      
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // 添加消息到指定会话
  async addMessage(message, sessionId) {
    console.log('添加消息到会话:', { message, sessionId })
    await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([CHAT_STORE_NAME, SESSION_STORE_NAME], 'readwrite')
        const store = transaction.objectStore(CHAT_STORE_NAME)
        const sessionStore = transaction.objectStore(SESSION_STORE_NAME)
        
        const messageWithMeta = {
          ...message,
          sessionId,
          timestamp: new Date().getTime()
        }
        
        const request = store.add(messageWithMeta)
        
        // 更新会话的最后一条消息
        const sessionRequest = sessionStore.get(sessionId)
        sessionRequest.onsuccess = () => {
          const session = sessionRequest.result
          if (session) {
            session.lastMessage = message.content
            session.timestamp = messageWithMeta.timestamp
            sessionStore.put(session)
            console.log('更新会话最后消息:', session)
          }
        }
        
        request.onsuccess = () => {
          console.log('消息添加成功:', messageWithMeta)
          window.addDebugLog?.('info', `消息添加成功: ${message.type}`)
          resolve(request.result)
        }
        
        request.onerror = () => {
          const error = `添加消息失败: ${request.error}`
          console.error(error)
          window.addDebugLog?.('error', error)
          reject(request.error)
        }
      } catch (error) {
        const errorMsg = `添加消息时发生错误: ${error.message}`
        console.error(errorMsg)
        window.addDebugLog?.('error', errorMsg)
        reject(error)
      }
    })
  }

  // 获取指定会话的所有消息
  async getSessionMessages(sessionId) {
    console.log('开始获取会话消息:', sessionId)
    await this.ensureDB()
    
    // 先验证数据库结构
    await this.validateDB()
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([CHAT_STORE_NAME], 'readonly')
        const store = transaction.objectStore(CHAT_STORE_NAME)
        const index = store.index('sessionId')
        const request = index.getAll(IDBKeyRange.only(sessionId))
        
        request.onsuccess = () => {
          const messages = request.result
          console.log(`成功获取会话 ${sessionId} 的消息:`, messages)
          window.addDebugLog?.('info', `获取到 ${messages.length} 条消息`)
          resolve(messages)
        }
        
        request.onerror = () => {
          const error = `获取会话 ${sessionId} 消息失败: ${request.error}`
          console.error(error)
          window.addDebugLog?.('error', error)
          reject(request.error)
        }
      } catch (error) {
        const errorMsg = `获取会话消息时发生错误: ${error.message}`
        console.error(errorMsg)
        window.addDebugLog?.('error', errorMsg)
        reject(error)
      }
    })
  }

  // 清空所有数据
  async clearAll() {
    await this.ensureDB()
    
    return Promise.all([
      this.clearStore(CHAT_STORE_NAME),
      this.clearStore(SESSION_STORE_NAME)
    ])
  }

  // 清空指定存储对象
  async clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

export default new ChatDB() 