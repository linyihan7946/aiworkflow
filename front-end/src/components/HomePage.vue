<template>
  <div class="home-page">
    <div class="button-grid">
      <button @click="$emit('navigate', 'editImage')" class="action-button edit-button">
        <h2>编辑图片</h2>
        <p>上传图片并进行编辑处理</p>
      </button>
      
      <button @click="$emit('navigate', 'generateImage')" class="action-button generate-button">
        <h2>生成图片</h2>
        <p>根据提示生成新图片</p>
      </button>
      
      <!-- 可以添加更多功能按钮 -->
      <!-- <button @click="$emit('navigate', 'otherFunction')" class="action-button">
        <h2>其他功能</h2>
        <p>其他接口测试</p>
      </button> -->
    </div>
  </div>
</template>

<script setup lang="ts">
// 定义组件的事件
defineEmits(['navigate']);
</script>

<style scoped>
/* 主页样式 */
.home-page {
  text-align: center;
  padding: 40px 0;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-top: 40px;
}

.action-button {
  background-color: white;
  border: 2px solid #008CBA;
  border-radius: 12px;
  padding: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.action-button:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.action-button h2 {
  margin: 0 0 10px;
  color: #333;
  font-size: 24px;
}

.action-button p {
  margin: 0;
  color: #666;
  font-size: 16px;
}

.edit-button {
  border-color: #4CAF50;
}

.edit-button:hover {
  background-color: #f0fff0;
}

.generate-button {
  border-color: #008CBA;
}

.generate-button:hover {
  background-color: #f0f8ff;
}
</style>