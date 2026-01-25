# 构建阶段
FROM node:18-alpine AS build

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制项目文件
COPY . .

# 构建项目
RUN npm run build

# 生产阶段
FROM node:18-alpine AS production

# 设置工作目录
WORKDIR /app

# 复制构建产物
COPY --from=build /app/dist ./dist

# 复制 package.json
COPY package*.json ./

# 安装生产依赖
RUN npm install --production

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["npm", "start"]