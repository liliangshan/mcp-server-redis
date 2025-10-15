# MCP Redis Server

A MCP Redis server with data operations, permission control and operation logs.

## Features

- ✅ Redis data operations (GET, SET, UPDATE, DELETE)
- ✅ Key management (CREATE, DROP, EXISTS, INFO)
- ✅ Dynamic tool list based on permissions
- ✅ Operation logging
- ✅ Connection management
- ✅ Auto-reconnection mechanism
- ✅ Health checks
- ✅ Error handling and recovery

## Installation

### Global Installation (Recommended)
```bash
npm install -g @liangshanli/mcp-server-redis
```

### Local Installation
```bash
npm install @liangshanli/mcp-server-redis
```

### From Source
```bash
git clone https://github.com/liliangshan/mcp-server-redis.git
cd mcp-server-redis
npm install
```

## Configuration

Set environment variables:

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

## Usage

### 1. Direct Run (Global Installation)
```bash
mcp-server-redis
```

### 2. Using npx (Recommended)
```bash
npx @liangshanli/mcp-server-redis
```

### 3. Direct Start (Source Installation)
```bash
npm start
```

### 4. Managed Start (Recommended for Production)
```bash
npm run start-managed
```

Managed start provides:
- Auto-restart (up to 10 times)
- Error recovery
- Process management
- Logging

### 5. Development Mode
```bash
npm run dev
```

## Editor Integration

### Cursor Editor Configuration

1. Create `.cursor/mcp.json` file in your project root:

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

### VS Code Configuration

1. Install the MCP extension for VS Code
2. Create `.vscode/settings.json` file:

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

### As MCP Server

The server communicates with MCP clients via stdin/stdout after startup:

```json
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18"}}
```

### Available Tools

1. **get_data**: Get data by key
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

2. **set_data**: Set/insert data for a key
   ```json
   {
     "jsonrpc": "2.0",
     "id": 3,
     "method": "tools/call",
     "params": {
       "name": "set_data",
       "arguments": {
         "key": "user:123",
         "value": "John Doe",
         "ttl": 3600
       }
     }
   }
   ```

3. **list_keys**: List Redis keys with pattern matching
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

## Dynamic Tool List

The server dynamically shows/hides tools based on environment variables:

### Read-Only Tools (Always Available)
- `get_data` - Get data by key
- `list_keys` - List keys with pattern matching
- `exists_key` - Check if key exists
- `get_key_info` - Get key information
- `get_redis_info` - Get Redis server information
- `get_database_stats` - Get database statistics
- `get_memory_info` - Get memory usage information
- `test_connection` - Test Redis connection
- `get_operation_logs` - Get operation logs
- `check_permissions` - Check current permissions
- `set_ttl` - Set time to live for a key
- `remove_ttl` - Remove time to live from a key

### Conditional Tools (Based on Permissions)
- `set_data` - Requires `ALLOW_INSERT=true`
- `update_data` - Requires `ALLOW_UPDATE=true`
- `delete_data` - Requires `ALLOW_DELETE=true`
- `create_key` - Requires `ALLOW_CREATE=true`
- `drop_key` - Requires `ALLOW_DROP=true`
- `rename_key` - Requires `ALLOW_CREATE=true` AND `ALLOW_DROP=true`

## Connection Management Features

- **Auto-creation**: Automatically creates Redis connection on `notifications/initialized`
- **Health checks**: Checks connection status every 5 minutes
- **Auto-reconnection**: Automatically reconnects when connection fails
- **Connection reuse**: Uses connection pool for better performance
- **Graceful shutdown**: Properly closes connections when server shuts down

## Logging

Log file location: `./logs/mcp-redis.log`

Logged content:
- All requests and responses
- Redis operation records
- Error messages
- Connection status changes

## Error Handling

- Individual request errors don't affect the entire server
- Connection errors are automatically recovered
- Process exceptions are automatically restarted (managed mode)

## Environment Variables

| Variable | Default | Description |
|---------|---------|-------------|
| HOST | localhost | Redis host address |
| PORT | 6379 | Redis port |
| PASSWORD | | Redis password |
| ALLOW_INSERT | true | Whether to allow insert operations. Set to 'false' to disable |
| ALLOW_UPDATE | true | Whether to allow update operations. Set to 'false' to disable |
| ALLOW_DELETE | true | Whether to allow delete operations. Set to 'false' to disable |
| ALLOW_CREATE | true | Whether to allow create key operations. Set to 'false' to disable |
| ALLOW_DROP | true | Whether to allow drop/delete key operations. Set to 'false' to disable |
| MCP_LOG_DIR | ./logs | Log directory |
| MCP_LOG_FILE | mcp-redis.log | Log filename |

## Development

### Project Structure
```
mcp-server-redis/
├── src/
│   ├── server-final.js        # Main server file
│   └── utils/                 # Utility modules
├── bin/
│   └── cli.js                 # CLI entry point
├── start-server.js            # Managed startup script
├── package.json
└── README.md
```

### Testing
```bash
npm test
```

## Quick Start

### 1. Install Package
```bash
npm install -g @liangshanli/mcp-server-redis
```

### 2. Configure Environment Variables
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

**Permission Control Examples:**
```bash
# Default: Enable all operations
export ALLOW_INSERT=true
export ALLOW_UPDATE=true
export ALLOW_DELETE=true
export ALLOW_CREATE=true
export ALLOW_DROP=true

# Read-only mode (safe mode)
export ALLOW_INSERT=false
export ALLOW_UPDATE=false
export ALLOW_DELETE=false
export ALLOW_CREATE=false
export ALLOW_DROP=false

# Allow insert and update, but disable delete operations
export ALLOW_INSERT=true
export ALLOW_UPDATE=true
export ALLOW_DELETE=false
export ALLOW_CREATE=true
export ALLOW_DROP=false

# Allow everything except DROP operations
export ALLOW_INSERT=true
export ALLOW_UPDATE=true
export ALLOW_DELETE=true
export ALLOW_CREATE=true
export ALLOW_DROP=false
```

### 3. Run Server
```bash
mcp-server-redis
```

## License

MIT
