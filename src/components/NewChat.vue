<template>
  <div class="search-input" :style="wrapperStyle">
    <div class="search-input__title">有什么可以帮忙的？</div>
    <div class="search-input__container">
      <textarea 
        class="search-input__textarea" 
        placeholder="请输入消息..."
        @input="adjustHeight"
        @keydown.enter.prevent="handleEnterPress"
        v-model="message"
        ref="textarea"
      ></textarea>
      <svg class="search-input__send-btn" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" @click="handleSend">
        <path d="M512 100.266667A411.733333 411.733333 0 0 0 100.266667 512 411.733333 411.733333 0 0 0 512 923.733333 411.733333 411.733333 0 0 0 923.733333 512 411.733333 411.733333 0 0 0 512 100.266667z" fill="#262D3D"></path>
        <path d="M707.754667 353.066667a27.733333 27.733333 0 0 0-36.608-36.608l-383.488 170.453333a27.733333 27.733333 0 0 0 2.773333 51.754667l147.84 47.274666 47.317333 147.84a27.733333 27.733333 0 0 0 51.754667 2.816l170.410667-383.530666z" fill="#FFFFFF"></path>
      </svg>
    </div>
  </div>
</template>

<script>
import newChatLogic from '../js/new-chat.js'

export default newChatLogic
</script>

<style>
@import '../styles/new-chat.css';
</style>
