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
          <div v-if="message.role === 'user'" class="message-content">
            {{ message.content }}
          </div>
          <div v-else class="message-content ai-content">
            <div class="ai-message-wrapper" v-html="formatMessage(message.content)"></div>
          </div>
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

// 格式化消息内容，处理Markdown和代码块
function formatMessage(content: string): string {
  // 处理标题
  content = content.replace(/^# (.*$)/gim, '<h1 class="ai-title">$1</h1>');
  content = content.replace(/^## (.*$)/gim, '<h2 class="ai-subtitle">$1</h2>');
  content = content.replace(/^### (.*$)/gim, '<h3 class="ai-subsubtitle">$1</h3>');
  
  // 处理列表
  content = content.replace(/^\s*\* (.*$)/gim, '<ul class="ai-list"><li>$1</li></ul>');
  content = content.replace(/(<\/ul>\s*<ul class="ai-list">)/gi, '');
  
  // 处理代码块
  content = content.replace(/```(\w+)?\n([\s\S]*?)```/gim, (match, lang, code) => {
    const language = lang || 'plaintext';
    return `
      <div class="code-block-container">
        <div class="code-block-header">
          <span class="code-language">${language}</span>
          <button class="copy-button" onclick="copyCodeBlock(this)">
            复制
          </button>
        </div>
        <pre class="code-block"><code class="language-${language}">${code}</code></pre>
      </div>
    `;
  });
  
  // 处理段落
  content = content.replace(/^(?!<h[1-6]>)(?!<ul>)(?!<div class="code-block-container")(.*$)/gim, '<p>$1</p>');
  
  return content;
}

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

// 注册全局复制代码函数
if (typeof window !== 'undefined') {
  (window as any).copyCodeBlock = function(button: HTMLElement) {
    const codeBlock = button.closest('.code-block-container')?.querySelector('code');
    if (codeBlock) {
      const code = codeBlock.textContent || '';
      navigator.clipboard.writeText(code).then(() => {
        const originalText = button.textContent;
        button.textContent = '已复制!';
        button.classList.add('copied');
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('copied');
        }, 2000);
      }).catch(err => {
        console.error('复制失败:', err);
        button.textContent = '复制失败';
        setTimeout(() => {
          button.textContent = '复制';
        }, 2000);
      });
    }
  };
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

/* AI消息内容样式 */
.ai-content {
  max-width: 80%;
}

.ai-message-wrapper {
  line-height: 1.6;
}

/* 标题样式 */
.ai-title {
  font-size: 22px;
  font-weight: bold;
  margin: 16px 0 8px 0;
  color: #333;
}

.ai-subtitle {
  font-size: 18px;
  font-weight: bold;
  margin: 14px 0 6px 0;
  color: #444;
}

.ai-subsubtitle {
  font-size: 16px;
  font-weight: bold;
  margin: 12px 0 4px 0;
  color: #555;
}

/* 段落样式 */
.ai-message-wrapper p {
  margin: 8px 0;
  color: #333;
}

/* 列表样式 */
.ai-list {
  margin: 8px 0 8px 20px;
  padding-left: 10px;
}

.ai-list li {
  margin: 4px 0;
  color: #333;
}

/* 代码块样式 */
.code-block-container {
  margin: 12px 0;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
}

.code-block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #e9ecef;
  border-bottom: 1px solid #dee2e6;
}

.code-language {
  font-size: 12px;
  font-weight: 500;
  color: #6c757d;
  text-transform: uppercase;
}

.copy-button {
  font-size: 12px;
  padding: 4px 8px;
  background-color: #ffffff;
  color: #495057;
  border: 1px solid #ced4da;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-button:hover {
  background-color: #f8f9fa;
  border-color: #adb5bd;
}

.copy-button.copied {
  background-color: #28a745;
  color: white;
  border-color: #28a745;
}

.code-block {
  margin: 0;
  padding: 12px;
  overflow-x: auto;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  line-height: 1.4;
  background-color: #f8f9fa;
}

.code-block code {
  color: #333;
}

/* 响应式设计调整 */
@media (max-width: 768px) {
  .ai-content {
    max-width: 90%;
  }
  
  .ai-title {
    font-size: 20px;
  }
  
  .ai-subtitle {
    font-size: 16px;
  }
  
  .ai-subsubtitle {
    font-size: 14px;
  }
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