<template>
  <div class="layout">
    <!-- 顶部导航栏 -->
    <header class="top-bar">
      <div class="top-bar-content" :class="{ 'collapsed': isCollapsed }">
        <!-- 模型选择器 -->
        <div class="model-selector">
          <select v-model="selectedModel" :disabled="!models.length">
            <option value="" disabled>{{ models.length ? '选择模型' : '加载中...' }}</option>
            <option v-for="model in models" :key="model.name" :value="model.name">
              {{ model.name }}
            </option>
          </select>
          <div class="model-status" :class="{ 'is-connected': isConnected }">
            {{ isConnected ? '已连接' : '未连接' }}
          </div>
          <!-- prompt按钮 -->
          <button class="prompt-btn" @click="togglePromptWindow" title="提示词">
            prompt
          </button>
          <!-- 调试按钮 -->
          <button class="debug-btn" @click="toggleDebugLog" title="调试日志">
            <svg viewBox="0 0 1024 1024" width="20" height="20">
              <path d="M511.998977 0C229.233759 0 0.013619 229.220139 0.013619 511.985357s229.22014 511.985357 511.985357 511.985357 511.985357-229.22014 511.985358-511.985357S794.764194 0 511.998977 0z m-0.259524 933.086324c-232.553917 0-420.841443-188.287526-420.841443-420.841443S279.185536 91.403438 511.739453 91.403438s420.841443 188.287526 420.841443 420.841443-188.287526 420.841443-420.841443 420.841443z" fill="currentColor" p-id="2369"></path>
              <path d="M511.739453 256.252826c-25.197091 0-45.701786 20.504695-45.701786 45.701786v274.210716c0 25.197091 20.504695 45.701786 45.701786 45.701786s45.701786-20.504695 45.701786-45.701786V301.954612c0-25.197091-20.504695-45.701786-45.701786-45.701786zM511.739453 667.168898c-25.197091 0-45.701786 20.504695-45.701786 45.701786v45.701786c0 25.197091 20.504695 45.701786 45.701786 45.701786s45.701786-20.504695 45.701786-45.701786v-45.701786c0-25.197091-20.504695-45.701786-45.701786-45.701786z" fill="currentColor" p-id="2370"></path>
            </svg>
          </button>
        </div>
        <div class="app-title">QZ-Chat</div>
      </div>
    </header>
    
    <!-- 调试日志窗口 -->
    <div v-if="showDebugLog" 
         class="debug-window"
         :style="{
           left: windowPosition.x + 'px',
           top: windowPosition.y + 'px',
           width: windowSize.width + 'px',
           height: windowSize.height + 'px'
         }">
      <div class="debug-window__header"
           @mousedown="startDrag"
           :class="{ 'dragging': isDragging }">
        <h3>调试日志</h3>
        <div class="debug-window__actions">
          <button class="debug-window__clear-btn" @click="clearDebugLogs">清空</button>
          <button class="debug-window__close-btn" @click="toggleDebugLog">关闭</button>
        </div>
      </div>
      <div class="debug-window__content">
        <div v-for="(log, index) in debugLogs" 
             :key="index" 
             class="debug-log"
             :class="'debug-log--' + log.type">
          <span class="debug-log__time">{{ log.time }}</span>
          <span class="debug-log__message">{{ log.message }}</span>
        </div>
      </div>
      <!-- 调整大小的控制点 -->
      <div class="resize-handle resize-handle--n" @mousedown.stop="e => startResize(e, 'n')"></div>
      <div class="resize-handle resize-handle--e" @mousedown.stop="e => startResize(e, 'e')"></div>
      <div class="resize-handle resize-handle--s" @mousedown.stop="e => startResize(e, 's')"></div>
      <div class="resize-handle resize-handle--w" @mousedown.stop="e => startResize(e, 'w')"></div>
      <div class="resize-handle resize-handle--nw" @mousedown.stop="e => startResize(e, 'nw')"></div>
      <div class="resize-handle resize-handle--ne" @mousedown.stop="e => startResize(e, 'ne')"></div>
      <div class="resize-handle resize-handle--se" @mousedown.stop="e => startResize(e, 'se')"></div>
      <div class="resize-handle resize-handle--sw" @mousedown.stop="e => startResize(e, 'sw')"></div>
    </div>
    
    <!-- 菜单图标 -->
    <svg class="menu-icon" :class="{ 'rotated': isCollapsed }" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="41874" @click="toggleSidebar">
      <path d="M127.6 259h768.9c35.4 0 64.1-28.7 64.1-64.1s-28.7-64.1-64.1-64.1H127.6c-35.4 0-64.1 28.7-64.1 64.1S92.2 259 127.6 259zM896.4 765H127.6c-35.4 0-64.1 28.7-64.1 64.1s28.7 64.1 64.1 64.1h768.9c35.4 0 64.1-28.7 64.1-64.1S931.8 765 896.4 765zM127.6 576.1H512c35.4 0 64.1-28.7 64.1-64.1s-28.7-64-64.1-64H127.6c-35.4 0-64.1 28.7-64.1 64.1s28.7 64 64.1 64zM938.8 477l-159.1-88.4c-28.2-15.6-62.8 4.7-62.7 36.9v176.7c0 32.2 34.6 52.6 62.8 36.9l159.1-88.4c28.8-15.9 28.8-57.6-0.1-73.7z" p-id="41875"></path>
    </svg>
    
    <!-- 新建对话图标 -->
    <button v-if="isCollapsed" class="new-chat-icon" @click="createNewChat" title="新建对话">
      <svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
        <path d="M950.857143 585.142857H585.142857v365.714286a73.142857 73.142857 0 0 1-146.285714 0V585.142857H73.142857a73.142857 73.142857 0 0 1 0-146.285714h365.714286V73.142857a73.142857 73.142857 0 0 1 146.285714 0v365.714286h365.714286a73.142857 73.142857 0 0 1 0 146.285714z" fill="currentColor"></path>
      </svg>
    </button>
    
    <!-- 左侧边栏 -->
    <aside class="side-bar" :class="{ 'collapsed': isCollapsed }">
      <SessionList 
        @select-session="handleSessionSelect" 
        :current-session-id="currentSessionId"
        @session-deleted="handleSessionDeleted"
        ref="sessionList"
      />
    </aside>
    
    <!-- 主要内容区域 -->
    <main class="main-content" :class="{ 'expanded': isCollapsed }">
      <router-view 
        :is-collapsed="isCollapsed" 
        :selected-model="selectedModel"
        :current-session-id="currentSessionId"
        @update:current-session-id="handleSessionSelect"
      />
    </main>
  </div>
</template>

<script>
import './styles/variables.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/app.css'
import appLogic from './js/app.js'

export default appLogic
</script>
