import http from 'http'
import { Server } from 'http'
import { addRoute, handleRoutes } from './routes/index.js'
import { homeController, dataController } from './controllers/index.js'

const PORT = process.env['PORT'] || 3000

// 注册路由
addRoute('/', 'GET', homeController)
addRoute('/api/data', 'GET', dataController)

const server: Server = http.createServer(handleRoutes)

server.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`)
  console.log(`📌 API endpoints:`)
  console.log(`   - GET http://localhost:${PORT}/`)
  console.log(`   - GET http://localhost:${PORT}/api/data`)
})
