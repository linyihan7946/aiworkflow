<template>
  <div class="ai-chat-page">
    <div class="header">
      <button @click="$emit('navigate', 'home')" class="back-button">
        ← 返回主页
      </button>
      <h1>AI问答</h1>
    </div>
    
    <div class="chat-container">
      <!-- 聊天记录 -->
      <div class="chat-messages" v-if="messages.length > 0">
        <div 
          v-for="(message, index) in messages" 
          :key="index"
          :class="['message', message.role]"
        >
          <div class="message-content">{{ message.content }}</div>
        </div>
      </div>
      <div class="empty-state" v-else>
        <p>开始与AI对话吧！</p>
      </div>
      
      <!-- 输入区域 -->
      <div class="input-area">
        <input 
          v-model="userInput" 
          type="text" 
          placeholder="输入你的问题..."
          class="chat-input"
          @keyup.enter="sendMessage"
        >
        <button 
          @click="sendMessage" 
          class="send-button"
          :disabled="!userInput.trim() || isLoading"
        >
          <span v-if="!isLoading">发送</span>
          <span v-else>发送中...</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 定义组件的事件
defineEmits(['navigate']);

// 聊天消息类型
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// 响应式数据
const messages = ref<Message[]>([]);
const userInput = ref('');
const isLoading = ref(false);

// 发送消息方法
async function sendMessage() {
  const input = userInput.value.trim();
  if (!input || isLoading.value) return;
  
  // 添加用户消息到聊天记录
  messages.value.push({ role: 'user', content: input });
  userInput.value = '';
  isLoading.value = true;
  
  try {
    // 调用后端API
    const response = await fetch('http://localhost:3001/api/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: input,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error('API请求失败');
    }
    
    const data = await response.json();
    
    // 添加AI回复到聊天记录
    if (data.data && data.data.choices && data.data.choices.length > 0) {
      const aiResponse = data.data.choices[0].text;
      messages.value.push({ role: 'assistant', content: aiResponse });
    } else {
      throw new Error('无效的API响应');
    }
  } catch (error) {
    console.error('发送消息失败:', error);
    messages.value.push({ 
      role: 'assistant', 
      content: '抱歉，处理你的请求时出现错误，请稍后再试。'
    });
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.ai-chat-page {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 20px;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.back-button {
  background: none;
  border: none;
  color: #1976d2;
  font-size: 16px;
  cursor: pointer;
  margin-right: 20px;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.back-button:hover {
  background-color: #e3f2fd;
}

.header h1 {
  color: #333;
  font-size: 28px;
  margin: 0;
}

.chat-container {
  max-width: 800px;
  margin: 0 auto;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  min-height: 70vh;
  display: flex;
  flex-direction: column;
}

.chat-messages {
  flex: 1;
  max-height: 600px;
  overflow-y: auto;
  padding: 20px;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #666;
}

.message {
  margin-bottom: 16px;
  display: flex;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  line-height: 1.4;
}

.message.user .message-content {
  background-color: #e3f2fd;
  color: #1976d2;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-content {
  background-color: #f5f5f5;
  color: #333;
  border-bottom-left-radius: 4px;
}

.input-area {
  display: flex;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  background-color: #fafafa;
}

.chat-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 24px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.3s ease;
}

.chat-input:focus {
  border-color: #1976d2;
}

.send-button {
  margin-left: 12px;
  padding: 0 24px;
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.send-button:hover:not(:disabled) {
  background-color: #1565c0;
}

.send-button:disabled {
  background-color: #bdbdbd;
  cursor: not-allowed;
}

/* 滚动条样式 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-container {
    margin: 0 10px;
    min-height: 80vh;
  }
  
  .message-content {
    max-width: 85%;
  }
  
  .header h1 {
    font-size: 24px;
  }
}
</style>