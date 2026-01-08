import http from 'http'

export interface Route {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void
}
import { homeController, dataController, llmController, intentController, imageGenerateController, imageEditController } from '../controllers'

// 路由数组，用于存储所有API路由
export const routes: Route[] = []

// 辅助函数：添加路由
export const addRoute = (path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', handler: (req: http.IncomingMessage, res: http.ServerResponse) => void) => {
  routes.push({ path, method, handler })
}

// 注册路由
addRoute('/', 'GET', homeController)
addRoute('/api/data', 'GET', dataController)
addRoute('/api/llm', 'POST', llmController)
addRoute('/api/intent', 'POST', intentController)
addRoute('/api/image/generate', 'POST', imageGenerateController)
addRoute('/api/image/edit', 'POST', imageEditController)

// 路由处理器：处理所有注册的路由
export const handleRoutes = (req: http.IncomingMessage, res: http.ServerResponse) => {
  const { url, method } = req
  
  if (!url || !method) {
    res.writeHead(400)
    res.end(JSON.stringify({ message: 'Invalid request' }))
    return
  }
  
  // 查找匹配的路由
  const route = routes.find(r => r.path === url && r.method === method)
  
  if (route) {
    route.handler(req, res)
  } else {
    res.writeHead(404)
    res.end(JSON.stringify({ message: 'Not Found' }))
  }
}
