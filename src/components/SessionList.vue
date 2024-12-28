<!-- 会话列表组件 -->
<template>
  <div class="session-list">
    <!-- 顶部栏 -->
    <div class="session-list__header">
      <button class="session-list__new" @click="createNewSession" title="新建会话">
        <svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path d="M950.857143 585.142857H585.142857v365.714286a73.142857 73.142857 0 0 1-146.285714 0V585.142857H73.142857a73.142857 73.142857 0 0 1 0-146.285714h365.714286V73.142857a73.142857 73.142857 0 0 1 146.285714 0v365.714286h365.714286a73.142857 73.142857 0 0 1 0 146.285714z" fill="currentColor"></path>
        </svg>
      </button>
    </div>

    <!-- 会话列表 -->
    <div class="session-list__items" ref="sessionList">
      <template v-for="(group, groupName) in groupedSessions" :key="groupName">
        <div class="session-group__title">{{ groupName }}</div>
        <div v-for="session in group" 
             :key="session.id" 
             class="session-item"
             :class="{ 'active': currentSessionId === session.id }"
             :data-id="session.id"
             @click="selectSession(session.id)">
          <div class="session-item__content">
            <div class="session-item__title" 
                 :contenteditable="editingSessionId === session.id"
                 @blur="handleBlur($event, session)"
                 @click.stop="handleTitleClick($event, session)"
                 @keydown.enter.prevent="$event.target.blur()"
                 ref="titleEditor">
              {{ editingSessionId === session.id ? session.title : session.title.slice(0, 10) }}
            </div>
          </div>
          
          <!-- 操作按钮 -->
          <div class="session-item__actions">
            <button class="action-btn" @click.stop="startEditTitle(session.id)" title="重命名">
              <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                <path d="M496 368H224l-2.4 0.08a32 32 0 0 0-29.504 29.408L192 400v224l0.08 2.4a32 32 0 0 0 29.408 29.504L224 656h272v96H224l-4-0.064a128 128 0 0 1-123.936-123.952L96 624V400l0.064-4a128 128 0 0 1 123.952-123.936L224 272h272v96z m160 496a48 48 0 0 1-96 0V160a48 48 0 0 1 96 0v704z m96-720a48 48 0 0 1-48 48H512a48 48 0 0 1 0-96h192a48 48 0 0 1 48 48z m0 736a48 48 0 0 1-48 48H512a48 48 0 0 1 0-96h192a48 48 0 0 1 48 48z m176-256a128 128 0 0 1-124 127.936L800 752h-80v-96h80a32 32 0 0 0 31.92-29.6L832 624V400a32 32 0 0 0-29.6-31.92L800 368h-80v-96h80a128 128 0 0 1 127.936 124L928 400v224z" fill="currentColor"></path>
              </svg>
            </button>
            <button class="action-btn" @click.stop="deleteSession(session.id)" title="删除">
              <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                <path d="M896 256a21.333333 21.333333 0 0 1 21.333333 21.333333v42.666667a21.333333 21.333333 0 0 1-21.333333 21.333333h-85.333333v469.333334c0 47.530667-40.96 83.114667-89.322667 85.226666L716.8 896H307.2c-48.768 0-91.221333-34.133333-93.738667-80.917333L213.333333 810.666667V341.333333H128a21.333333 21.333333 0 0 1-21.333333-21.333333v-42.666667a21.333333 21.333333 0 0 1 21.333333-21.333333h768z m-170.666667 85.333333H298.666667v466.965334l0.853333 0.597333a14.592 14.592 0 0 0 5.418667 1.642667L307.2 810.666667h409.6a15.893333 15.893333 0 0 0 7.68-1.770667l0.853333-0.618667V341.333333z m-277.333333 106.666667a21.333333 21.333333 0 0 1 21.333333 21.333333v213.333334a21.333333 21.333333 0 0 1-21.333333 21.333333h-42.666667a21.333333 21.333333 0 0 1-21.333333-21.333333V469.333333a21.333333 21.333333 0 0 1 21.333333-21.333333h42.666667z m170.666667 0a21.333333 21.333333 0 0 1 21.333333 21.333333v213.333334a21.333333 21.333333 0 0 1-21.333333 21.333333h-42.666667a21.333333 21.333333 0 0 1-21.333333-21.333333V469.333333a21.333333 21.333333 0 0 1 21.333333-21.333333h42.666667z m0-320a21.333333 21.333333 0 0 1 21.333333 21.333333v42.666667a21.333333 21.333333 0 0 1-21.333333 21.333333H405.333333a21.333333 21.333333 0 0 1-21.333333-21.333333V149.333333a21.333333 21.333333 0 0 1 21.333333-21.333333h213.333334z" fill="currentColor"></path>
              </svg>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="delete-confirm">
      <div class="delete-confirm__content">
        <p>确定要删除这个会话吗？</p>
        <div class="delete-confirm__actions">
          <button class="delete-confirm__btn delete-confirm__btn--cancel" @click="cancelDelete">取消</button>
          <button class="delete-confirm__btn delete-confirm__btn--confirm" @click="confirmDelete">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import '../styles/session-list.css'
import sessionLogic from '../js/session-list.js'

export default sessionLogic
</script> 