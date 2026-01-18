<template>
  <div class="app-container">
    <h1>Vue3 + TypeScript + Vite</h1>
    <p>用于测试 back-end 相关接口</p>
    
    <div class="image-edit-section">
      <h2>图片编辑接口测试</h2>
      
      <div class="input-container">
        <div class="form-group">
          <label for="imageUpload">选择图片</label>
          <input 
            type="file" 
            accept="image/*" 
            @change="onFileChange" 
            id="imageUpload"
          />
          <span class="file-name">{{ selectedFile ? selectedFile.name : '未选择图片' }}</span>
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
          :disabled="!selectedFile || !formData.prompt" 
          class="submit-button"
        >
          提交编辑
        </button>
      </div>
      
      <div class="result-container" v-if="result">
        <h3>响应结果：</h3>
        <pre>{{ JSON.stringify(result, null, 2) }}</pre>
      </div>
      
      <div class="error-container" v-if="error">
        <h3>错误信息：</h3>
        <p>{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import API_CONFIG from './config'

const selectedFile = ref<File | null>(null)
const result = ref<any>(null)
const error = ref<string | null>(null)

// 表单数据
const formData = reactive({
  images: [] as string[],
  prompt: '',
  aspect_ratio: '1:1',
  resolution: '2K',
  url_type: '1' // 默认使用YI_API_GEMINI_2_5
})

// 处理文件选择
const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0]
  }
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

const submitImage = async () => {
  if (!selectedFile.value || !formData.prompt) return
  
  result.value = null
  error.value = null
  
  try {
    // 将图片文件转换为Base64编码
    const base64Image = await fileToBase64(selectedFile.value)
    
    // 准备请求数据
    const requestData = {
      images: [base64Image],
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
  }
}
</script>

<style scoped>
.app-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.image-edit-section {
  margin-top: 30px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
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

.form-group .file-name {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}

.form-group textarea {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: Arial, sans-serif;
  resize: vertical;
}

.form-group select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
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

.result-container, .error-container {
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

pre {
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
  font-size: 14px;
}
</style>