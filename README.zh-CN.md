# MCP Redis 服务器

一个具有数据操作、权限控制和操作日志的 MCP Redis 服务器。

## 功能特性

- ✅ Redis 数据操作 (GET, SET, UPDATE, DELETE)
- ✅ 键管理 (CREATE, DROP, EXISTS, INFO)
- ✅ 基于权限的动态工具列表
- ✅ 操作日志记录
- ✅ 连接管理
- ✅ 自动重连机制
- ✅ 健康检查
- ✅ 错误处理和恢复

## 安装

### 全局安装 (推荐)
```bash
npm install -g @liangshanli/mcp-server-redis
```

### 本地安装
```bash
npm install @liangshanli/mcp-server-redis
```

### 从源码安装
```bash
git clone https://github.com/liliangshan/mcp-server-redis.git
cd mcp-server-redis
npm install
```

## 配置

设置环境变量：

```bash
export HOST=localhost
export PORT=6379
export PASSWORD=your_password
export ALLOW_INSERT=true
export ALLOW_UPDATE=true
export ALLOW_DELETE=true
export ALLOW_CREATE=true
export ALLOW_DROP=true
```

## 使用方法

### 1. 直接运行 (全局安装)
```bash
mcp-server-redis
```

### 2. 使用 npx (推荐)
```bash
npx @liangshanli/mcp-server-redis
```

### 3. 直接启动 (源码安装)
```bash
npm start
```

### 4. 托管启动 (生产环境推荐)
```bash
npm run start-managed
```

托管启动提供：
- 自动重启 (最多 10 次)
- 错误恢复
- 进程管理
- 日志记录

### 5. 开发模式
```bash
npm run dev
```

## 编辑器集成

### Cursor 编辑器配置

1. 在项目根目录创建 `.cursor/mcp.json` 文件：

```json
{
  "mcpServers": {
    "redis": {
      "command": "npx",
      "args": ["@liangshanli/mcp-server-redis"],
      "env": {
        "HOST": "your_host",
        "PORT": "6379",
        "PASSWORD": "your_password",
        "ALLOW_INSERT": "true",
        "ALLOW_UPDATE": "true",
        "ALLOW_DELETE": "true",
        "ALLOW_CREATE": "true",
        "ALLOW_DROP": "true"
      }
    }
  }
}
```

### VS Code 配置

1. 为 VS Code 安装 MCP 扩展
2. 创建 `.vscode/settings.json` 文件：

```json
{
  "mcp.servers": {
    "redis": {
      "command": "npx",
      "args": ["@liangshanli/mcp-server-redis"],
      "env": {
        "HOST": "your_host",
        "PORT": "6379",
        "PASSWORD": "your_password",
        "ALLOW_INSERT": "true",
        "ALLOW_UPDATE": "true",
        "ALLOW_DELETE": "true",
        "ALLOW_CREATE": "true",
        "ALLOW_DROP": "true"
      }
    }
  }
}
```

### 作为 MCP 服务器

服务器启动后通过 stdin/stdout 与 MCP 客户端通信：

```json
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18"}}
```

### 可用工具

1. **get_data**: 根据键获取数据
   ```json
   {
     "jsonrpc": "2.0",
     "id": 2,
     "method": "tools/call",
     "params": {
       "name": "get_data",
       "arguments": {
         "key": "user:123"
       }
     }
   }
   ```

2. **set_data**: 为键设置/插入数据
   ```json
   {
     "jsonrpc": "2.0",
     "id": 3,
     "method": "tools/call",
     "params": {
       "name": "set_data",
       "arguments": {
         "key": "user:123",
         "value": "张三",
         "ttl": 3600
       }
     }
   }
   ```

3. **list_keys**: 使用模式匹配列出 Redis 键
   ```json
   {
     "jsonrpc": "2.0",
     "id": 4,
     "method": "tools/call",
     "params": {
       "name": "list_keys",
       "arguments": {
         "pattern": "user:*",
         "limit": 10
       }
     }
   }
   ```

## 动态工具列表

服务器根据环境变量动态显示/隐藏工具：

### 只读工具 (始终可用)
- `get_data` - 根据键获取数据
- `list_keys` - 使用模式匹配列出键
- `exists_key` - 检查键是否存在
- `get_key_info` - 获取键信息
- `get_redis_info` - 获取 Redis 服务器信息
- `get_database_stats` - 获取数据库统计
- `get_memory_info` - 获取内存使用信息
- `test_connection` - 测试 Redis 连接
- `get_operation_logs` - 获取操作日志
- `check_permissions` - 检查当前权限
- `set_ttl` - 为键设置生存时间
- `remove_ttl` - 移除键的生存时间

### 条件工具 (基于权限)
- `set_data` - 需要 `ALLOW_INSERT=true`
- `update_data` - 需要 `ALLOW_UPDATE=true`
- `delete_data` - 需要 `ALLOW_DELETE=true`
- `create_key` - 需要 `ALLOW_CREATE=true`
- `drop_key` - 需要 `ALLOW_DROP=true`
- `rename_key` - 需要 `ALLOW_CREATE=true` 和 `ALLOW_DROP=true`

## 连接管理功能

- **自动创建**: 在 `notifications/initialized` 时自动创建 Redis 连接
- **健康检查**: 每 5 分钟检查连接状态
- **自动重连**: 连接失败时自动重连
- **连接复用**: 使用连接池提高性能
- **优雅关闭**: 服务器关闭时正确关闭连接

## 日志记录

日志文件位置: `./logs/mcp-redis.log`

记录内容：
- 所有请求和响应
- Redis 操作记录
- 错误消息
- 连接状态变化

## 错误处理

- 单个请求错误不会影响整个服务器
- 连接错误自动恢复
- 进程异常自动重启 (托管模式)

## 环境变量

| 变量 | 默认值 | 描述 |
|------|--------|------|
| HOST | localhost | Redis 主机地址 |
| PORT | 6379 | Redis 端口 |
| PASSWORD | | Redis 密码 |
| ALLOW_INSERT | true | 是否允许插入操作。设置为 'false' 禁用 |
| ALLOW_UPDATE | true | 是否允许更新操作。设置为 'false' 禁用 |
| ALLOW_DELETE | true | 是否允许删除操作。设置为 'false' 禁用 |
| ALLOW_CREATE | true | 是否允许创建键操作。设置为 'false' 禁用 |
| ALLOW_DROP | true | 是否允许删除键操作。设置为 'false' 禁用 |
| MCP_LOG_DIR | ./logs | 日志目录 |
| MCP_LOG_FILE | mcp-redis.log | 日志文件名 |

## 开发

### 项目结构
```
mcp-server-redis/
├── src/
│   ├── server-final.js        # 主服务器文件
│   └── utils/                 # 工具模块
├── bin/
│   └── cli.js                 # CLI 入口点
├── start-server.js            # 托管启动脚本
├── package.json
└── README.md
```

### 测试
```bash
npm test
```

## 快速开始

### 1. 安装包
```bash
npm install -g @liangshanli/mcp-server-redis
```

### 2. 配置环境变量
```bash
export HOST=localhost
export PORT=6379
export PASSWORD=your_password
export ALLOW_INSERT=true
export ALLOW_UPDATE=true
export ALLOW_DELETE=true
export ALLOW_CREATE=true
export ALLOW_DROP=true
```

**权限控制示例:**
```bash
# 默认: 启用所有操作
export ALLOW_INSERT=true
export ALLOW_UPDATE=true
export ALLOW_DELETE=true
export ALLOW_CREATE=true
export ALLOW_DROP=true

# 只读模式 (安全模式)
export ALLOW_INSERT=false
export ALLOW_UPDATE=false
export ALLOW_DELETE=false
export ALLOW_CREATE=false
export ALLOW_DROP=false

# 允许插入和更新，但禁用删除操作
export ALLOW_INSERT=true
export ALLOW_UPDATE=true
export ALLOW_DELETE=false
export ALLOW_CREATE=true
export ALLOW_DROP=false

# 允许除 DROP 操作外的所有操作
export ALLOW_INSERT=true
export ALLOW_UPDATE=true
export ALLOW_DELETE=true
export ALLOW_CREATE=true
export ALLOW_DROP=false
```

### 3. 运行服务器
```bash
mcp-server-redis
```

## 许可证

MIT
