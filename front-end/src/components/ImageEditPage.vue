<template>
  <div class="image-edit-section">
    <div class="page-header">
      <h2>图片编辑接口测试</h2>
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
        <label for="imageUpload">选择图片（支持多选）</label>
        <input 
          type="file" 
          accept="image/*" 
          @change="onFileChange" 
          id="imageUpload"
          multiple
        />
        <div class="file-list">
          <div 
            v-for="(file, index) in selectedFiles" 
            :key="index" 
            class="file-item"
          >
            {{ file.name }}
            <button 
              @click="removeFile(index)" 
              class="remove-button"
            >
              ×
            </button>
          </div>
          <span v-if="selectedFiles.length === 0" class="file-name">未选择图片</span>
        </div>
      </div>
      
      <div class="form-group">
        <label for="prompt">编辑说明</label>
        <textarea 
          id="prompt" 
          v-model="formData.prompt" 
          placeholder="请输入图片编辑说明"
          rows="3"
        ></textarea>
      </div>
      
      <div class="form-group">
        <label for="aspectRatio">长宽比</label>
        <select id="aspectRatio" v-model="formData.aspect_ratio">
          <option value="1:1">1:1</option>
          <option value="16:9">16:9</option>
          <option value="9:16">9:16</option>
          <option value="4:3">4:3</option>
          <option value="3:4">3:4</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="resolution">分辨率</label>
        <select id="resolution" v-model="formData.resolution">
          <option value="2K">2K</option>
          <option value="4K">4K</option>
          <option value="1080P">1080P</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="urlType">链接类型</label>
        <select id="urlType" v-model="formData.url_type">
          <option value="1">YI_API_GEMINI_2_5</option>
          <option value="2">YI_API_GEMINI_3_0</option>
        </select>
      </div>
      
      <button 
        @click="submitImage" 
        :disabled="selectedFiles.length === 0 || !formData.prompt" 
        class="submit-button"
      >
        提交编辑
      </button>
    </div>
    
    <div class="result-container" v-if="result">
      <h3>响应结果：</h3>
      <pre>{{ JSON.stringify(result, null, 2) }}</pre>
      
      <!-- 显示图片链接结果 -->
      <div v-if="result.data?.data?.length > 0" class="image-results">
        <h4>生成的图片：</h4>
        <div class="image-list">
          <div 
            v-for="(image) in result.data?.data || []" 
            class="image-item"
          >
            <img :src="image.url" :alt="`Generated Image`" />
            <p class="image-url">{{ image.url }}</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="error-container" v-if="error">
      <h3>错误信息：</h3>
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import API_CONFIG from '../config'

// 定义组件的事件
defineEmits(['navigate']);

// 图片编辑相关状态
const selectedFiles = ref<File[]>([])
const result = ref<any>(null)
const error = ref<string | null>(null)

// 加载状态
const isLoading = ref<boolean>(false)

// 图片编辑表单数据
const formData = reactive({
  images: [] as string[],
  prompt: '根据图1的菜，生成类似图2的这个菜的食材跟调料用量图。',
  aspect_ratio: '1:1',
  resolution: '4K',
  url_type: '2' // 默认使用YI_API_GEMINI_3_0
})

// 处理图片编辑的文件选择
const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedFiles.value.push(...Array.from(input.files))
  }
}

// 移除图片编辑的文件
const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

// 将文件转换为Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 提交图片编辑请求
const submitImage = async () => {
  if (selectedFiles.value.length === 0 || !formData.prompt) return
  
  result.value = null
  error.value = null
  isLoading.value = true
  
  try {
    // 将所有图片文件转换为Base64编码
    const base64Images = await Promise.all(
      selectedFiles.value.map(fileToBase64)
    )
    
    // 准备请求数据
    const requestData = {
      images: base64Images,
      prompt: formData.prompt,
      aspect_ratio: formData.aspect_ratio,
      resolution: formData.resolution,
      url_type: parseInt(formData.url_type)
    }
    
    // 构建完整的API请求URL
    const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.image.edit}`
    
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
    
    result.value = await response.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '发生未知错误'
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

/* 图片编辑部分的样式 */
.image-edit-section {
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

.form-group input[type="file"] {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.form-group textarea,
.form-group select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: Arial, sans-serif;
}

.form-group .file-list {
  margin-top: 8px;
}

.form-group .file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  margin-bottom: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f9f9f9;
  font-size: 14px;
  color: #333;
}

.form-group .remove-button {
  background-color: #ff4d4f;
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-group .remove-button:hover {
  background-color: #ff7875;
}

.form-group .file-name {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
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