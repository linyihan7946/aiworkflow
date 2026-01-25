// API配置
const API_CONFIG = {
  // 基础URL，用于所有API请求
  // baseURL: 'http://localhost:3001',
  baseURL: 'https://www.aigenimage.cn:3001',
  
  // 图片相关接口
  image: {
    edit: '/api/image/edit',
    generate: '/api/image/generate',
    // 可以在这里添加更多图片相关接口
  },
  
  // 可以在这里添加更多模块的接口配置
};

export default API_CONFIG;