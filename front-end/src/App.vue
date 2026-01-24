<template>
  <div class="app-container">
    <!-- 根据当前页面状态渲染不同的组件 -->
    <HomePage 
      v-if="currentPage === 'home'"
      @navigate="navigateToPage"
    />
    
    <ImageEditPage 
      v-if="currentPage === 'editImage'"
      @navigate="navigateToPage"
    />
    
    <ImageGeneratePage 
      v-if="currentPage === 'generateImage'"
      @navigate="navigateToPage"
    />
    
    <AIChatPage 
      v-if="currentPage === 'aiChat'"
      @navigate="navigateToPage"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import HomePage from './components/HomePage.vue'
import ImageEditPage from './components/ImageEditPage.vue'
import ImageGeneratePage from './components/ImageGeneratePage.vue'
import AIChatPage from './components/AIChatPage.vue'

// 当前页面状态
const currentPage = ref('home') // 'home', 'editImage', 'generateImage', 'aiChat'

// 页面导航函数
const navigateToPage = (pageName: string) => {
  currentPage.value = pageName
}
</script>

<style scoped>
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}
</style>