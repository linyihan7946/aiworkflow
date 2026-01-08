import http from 'http'

export const homeController = (_req: http.IncomingMessage, res: http.ServerResponse) => {
  res.setHeader('Content-Type', 'application/json')
  res.writeHead(200)
  res.end(JSON.stringify({
    message: 'Hello, Node.js + Vite + TypeScript Backend!',
    timestamp: new Date().toISOString(),
    status: 'running'
  }))
}

export const dataController = (_req: http.IncomingMessage, res: http.ServerResponse) => {
  res.setHeader('Content-Type', 'application/json')
  res.writeHead(200)
  res.end(JSON.stringify({
    data: [1, 2, 3, 4, 5],
    message: 'API endpoint working!'
  }))
}
