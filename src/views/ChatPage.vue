<!-- 聊天主页面 -->
<template>
  <div class="chat-container">
    <!-- 聊天消息列表 -->
    <div class="chat-messages" ref="messageList">
      <div>
        <div v-for="(message, index) in messages" 
             :key="index" 
             class="chat-message"
             :class="message.type === 'user' ? 'chat-message--user' : 'chat-message--ai'">
          <div class="chat-message__avatar" v-if="message.type === 'ai'">
            <img src="../assets/ai.png" alt="AI头像">
          </div>
          <div class="chat-message__content">{{ message.content }}</div>
        </div>
      </div>
    </div>

    <!-- 底部输入框 -->
    <div class="chat-input">
      <textarea 
        class="chat-input__textarea" 
        placeholder="请输入消息..."
        v-model="inputMessage"
        @input="adjustHeight"
        @keydown.enter.prevent="handleEnter"
        maxlength="4096"
        ref="textarea"
      ></textarea>
      <div class="chat-input__counter" v-if="inputMessage">{{ inputMessage.length }}/4096</div>
      <svg 
        class="chat-input__send-btn" 
        :class="{ 'chat-input__send-btn--disabled': !canSend && !isTyping }"
        viewBox="0 0 1024 1024" 
        version="1.1" 
        xmlns="http://www.w3.org/2000/svg" 
        @click="handleClick"
      >
        <template v-if="!isTyping">
          <path d="M512 100.266667A411.733333 411.733333 0 0 0 100.266667 512 411.733333 411.733333 0 0 0 512 923.733333 411.733333 411.733333 0 0 0 923.733333 512 411.733333 411.733333 0 0 0 512 100.266667z" fill="currentColor"></path>
          <path d="M707.754667 353.066667a27.733333 27.733333 0 0 0-36.608-36.608l-383.488 170.453333a27.733333 27.733333 0 0 0 2.773333 51.754667l147.84 47.274666 47.317333 147.84a27.733333 27.733333 0 0 0 51.754667 2.816l170.410667-383.530666z" fill="#FFFFFF"></path>
        </template>
        <template v-else>
          <path d="M63.65 512c-0.01 0 0 0 0 0 2.04-148.61 27.84-271.66 103.31-345.05C240.34 91.49 363.39 65.68 512 63.65c148.61 2.04 271.66 27.84 345.05 103.31 75.46 73.38 101.27 196.43 103.3 345.04-2.04 148.61-27.85 271.66-103.31 345.05-73.38 75.46-196.43 101.27-345.04 103.3-148.61-2.04-271.66-27.84-345.05-103.31C91.49 783.66 65.68 660.61 63.65 512z" fill="currentColor"></path>
          <path d="M452.66 353.01v317.98c0 24.52-20.06 44.59-44.59 44.59-24.52 0-44.59-20.06-44.59-44.59V353.01c0-24.52 20.06-44.59 44.59-44.59 24.53 0 44.59 20.07 44.59 44.59zM660.51 353.01v317.98c0 24.52-20.06 44.59-44.59 44.59-24.52 0-44.59-20.06-44.59-44.59V353.01c0-24.52 20.06-44.59 44.59-44.59 24.52 0 44.59 20.07 44.59 44.59z" fill="#FFFFFF"></path>
        </template>
      </svg>
    </div>
  </div>
</template>

<script>
import '../styles/chat-page.css'
import chatLogic from '../js/chat-page.js'

export default chatLogic
</script>