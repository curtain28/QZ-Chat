import axios from 'axios'

const ollamaApi = axios.create({
  baseURL: 'http://localhost:11434/api',
  timeout: 30000
})

// 获取所有可用模型
export const getModels = async () => {
  try {
    const response = await ollamaApi.get('/tags')
    window.addDebugLog?.('info', '获取模型列表成功')
    return response.data.models || []
  } catch (error) {
    window.addDebugLog?.('error', `获取模型列表失败: ${error.message}`)
    console.error('获取模型列表失败:', error)
    // 确保在连接失败时抛出错误
    if (error.code === 'ECONNREFUSED' || error.message.includes('Failed to fetch')) {
      throw new Error('无法连接到 Ollama 服务')
    }
    throw error
  }
}

const OLLAMA_BASE_URL = 'http://localhost:11434'

export async function sendMessage(model, messages, onProgress, signal) {
  try {
    window.addDebugLog?.('info', `开始发送消息到模型 ${model}`)
    
    // 确保只获取消息的文本内容
    const messageContent = typeof messages[0] === 'string' 
      ? messages[0] 
      : (messages[0].content || '').toString()

    const requestBody = {
      model,
      prompt: messageContent,
      stream: true,
      context: [], // Ollama会自动管理上下文
      options: {
        num_ctx: 4096 // 设置上下文窗口大小
      }
    }
    
    window.addDebugLog?.('info', `请求参数: ${JSON.stringify(requestBody, null, 2)}`)

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal
    })

    if (!response.ok) {
      window.addDebugLog?.('error', `HTTP错误: 状态码 ${response.status}, 状态文本 ${response.statusText}`)
      const errorText = await response.text()
      window.addDebugLog?.('error', `错误详情: ${errorText}`)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    window.addDebugLog?.('info', '开始接收流式响应')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullResponse = ''

    try {
      let reading = true
      while (reading) {
        const { done, value } = await reader.read()
        if (done) {
          window.addDebugLog?.('info', '响应接收完成')
          reading = false
          continue
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (!line.trim()) continue
          
          try {
            const data = JSON.parse(line)
            if (data.error) {
              window.addDebugLog?.('error', `模型返回错误: ${data.error}`)
              throw new Error(data.error)
            }
            if (data.response) {
              fullResponse += data.response
              // 立即调用回调函数更新UI
              onProgress?.(fullResponse)
              // 强制刷新
              await new Promise(resolve => setTimeout(resolve, 0))
            }
          } catch (e) {
            const errorMessage = e.message
            if (errorMessage !== 'data.error') {
              window.addDebugLog?.('error', `解析响应出错: ${errorMessage}`)
              console.error('解析响应出错:', e)
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error
      }
      window.addDebugLog?.('error', `读取流出错: ${error.message}`)
      throw error
    } finally {
      reader.releaseLock()
    }

    return fullResponse
  } catch (error) {
    window.addDebugLog?.('error', `发送消息失败: ${error.message}`)
    console.error('发送消息失败:', error)
    throw error
  }
}

export default {
  getModels,
  sendMessage
}