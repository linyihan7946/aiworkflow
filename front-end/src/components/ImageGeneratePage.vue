<template>
  <div class="image-generate-section">
    <div class="page-header">
      <h2>图片生成接口测试</h2>
      <button @click="$emit('navigate', 'home')" class="back-button">返回主页</button>
    </div>
    
    <!-- 进度条 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-container">
        <div class="spinner"></div>
        <p>正在处理请求，请稍候...</p>
      </div>
    </div>
    
    <div class="input-container">
      <div class="form-group">
        <label for="generatePrompt">生成说明</label>
        <textarea 
          id="generatePrompt" 
          v-model="generateFormData.prompt" 
          placeholder="请输入图片生成说明"
          rows="3"
        ></textarea>
      </div>
      
      <div class="form-group">
        <label for="generateResolution">分辨率</label>
        <select id="generateResolution" v-model="generateFormData.resolution">
          <option value="2K">2K</option>
          <option value="4K">4K</option>
          <option value="1080P">1080P</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="generateUrlType">链接类型</label>
        <select id="generateUrlType" v-model="generateFormData.url_type">
          <option value="1">YI_API_GEMINI_2_5</option>
          <option value="2">YI_API_GEMINI_3_0</option>
        </select>
      </div>
      
      <button 
        @click="submitGenerate" 
        :disabled="!generateFormData.prompt" 
        class="submit-button"
      >
        提交生成
      </button>
    </div>
    
    <div class="result-container" v-if="generateResult">
      <h3>响应结果：</h3>
      <pre>{{ JSON.stringify(generateResult, null, 2) }}</pre>
      
      <!-- 显示图片链接结果 -->
      <div v-if="generateResult.data?.data?.length > 0" class="image-results">
        <h4>生成的图片：</h4>
        <div class="image-list">
          <div 
            v-for="(image) in generateResult.data?.data || []" 
            class="image-item"
          >
            <img :src="image.url" :alt="`Generated Image`" />
            <p class="image-url">{{ image.url }}</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="error-container" v-if="generateError">
      <h3>错误信息：</h3>
      <p>{{ generateError }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import API_CONFIG from '../config'

// 定义组件的事件
defineEmits(['navigate']);

// 图片生成相关状态
const generateResult = ref<any>(null)
const generateError = ref<string | null>(null)

// 加载状态
const isLoading = ref<boolean>(false)

// 图片生成表单数据
const generateFormData = reactive({
  prompt: '',
  resolution: '4K',
  url_type: '2' // 默认使用YI_API_GEMINI_3_0
})

// 提交图片生成请求
const submitGenerate = async () => {
  if (!generateFormData.prompt) return
  
  generateResult.value = null
  generateError.value = null
  isLoading.value = true
  
  try {
    // 准备请求数据
    const requestData = {
      prompt: generateFormData.prompt,
      resolution: generateFormData.resolution,
      url_type: parseInt(generateFormData.url_type)
    }
    
    // 构建完整的API请求URL
    const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.image.generate}`
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    generateResult.value = await response.json()
  } catch (err) {
    generateError.value = err instanceof Error ? err.message : '发生未知错误'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* 页面标题和返回按钮 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.back-button {
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.back-button:hover {
  background-color: #e0e0e0;
}

/* 图片生成部分的样式 */
.image-generate-section {
  margin-top: 30px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: white;
}

.input-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-weight: bold;
  font-size: 14px;
  color: #333;
}

.form-group textarea,
.form-group select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: Arial, sans-serif;
}

.submit-button {
  padding: 12px 24px;
  background-color: #008CBA;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
  align-self: flex-start;
}

.submit-button:hover:not(:disabled) {
  background-color: #007B9A;
}

.submit-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

/* 加载状态样式 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-container {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #008CBA;
  border-radius: 50%;
  margin: 0 auto 15px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 结果显示样式 */
.result-container,
.error-container {
  margin-top: 20px;
  padding: 15px;
  border-radius: 4px;
}

.result-container {
  background-color: #f0f8ff;
  border: 1px solid #b3d9ff;
}

.error-container {
  background-color: #fff0f0;
  border: 1px solid #ffb3b3;
}

.image-results {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.image-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 10px;
}

.image-item {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background-color: white;
}

.image-item img {
  width: 100%;
  height: auto;
  display: block;
}

.image-item .image-url {
  padding: 10px;
  font-size: 12px;
  color: #333;
  word-break: break-all;
}

pre {
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
  font-size: 14px;
}
</style>