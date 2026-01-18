<template>
  <div class="app-container">
    <h1>Vue3 + TypeScript + Vite</h1>
    <p>用于测试 back-end 相关接口</p>
    
    <div class="image-edit-section">
      <h2>图片编辑接口测试</h2>
      
      <div class="upload-container">
        <input 
          type="file" 
          accept="image/*" 
          @change="onFileChange" 
          id="imageUpload"
        />
        <label for="imageUpload" class="upload-button">
          {{ selectedFile ? selectedFile.name : '选择图片' }}
        </label>
        <button 
          @click="submitImage" 
          :disabled="!selectedFile" 
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
import { ref } from 'vue'

const selectedFile = ref<File | null>(null)
const result = ref<any>(null)
const error = ref<string | null>(null)

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0]
  }
}

const submitImage = async () => {
  if (!selectedFile.value) return
  
  result.value = null
  error.value = null
  
  try {
    const formData = new FormData()
    formData.append('image', selectedFile.value)
    
    const response = await fetch('/api/image/edit', {
      method: 'POST',
      body: formData
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

.upload-container {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
}

#imageUpload {
  display: none;
}

.upload-button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.upload-button:hover {
  background-color: #45a049;
}

.submit-button {
  padding: 10px 20px;
  background-color: #008CBA;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
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
}
</style>