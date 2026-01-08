import http, { Server } from 'http'
import { handleRoutes } from './routes/index'

const PORT = process.env['PORT'] || 3001

const server: Server = http.createServer(handleRoutes)

server.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`)
  console.log(`📌 API endpoints:`)
  console.log(`   - GET  http://localhost:${PORT}/`)
  console.log(`   - GET  http://localhost:${PORT}/api/data`)
  console.log(`   - POST http://localhost:${PORT}/api/llm`)
  console.log(`   - POST http://localhost:${PORT}/api/intent`)
  console.log(`   - POST http://localhost:${PORT}/api/image/generate`)
  console.log(`   - POST http://localhost:${PORT}/api/image/edit`)
})
