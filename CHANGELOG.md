# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-15

### Added
- Initial release of MCP Redis Server
- Redis data operations (GET, SET, UPDATE, DELETE)
- Key management (CREATE, DROP, EXISTS, INFO)
- Dynamic tool list based on permissions
- Comprehensive operation logging
- Connection management with auto-reconnection
- Health checks and error handling
- Support for all Redis data types (string, list, set, hash, zset)
- TTL management for keys
- Permission control for INSERT, UPDATE, DELETE, CREATE, DROP operations
- Integration with Cursor and VS Code editors
- Multiple installation methods (global, local, npx)
- Managed startup for production environments

### Features
- ✅ Redis data operations (GET, SET, UPDATE, DELETE)
- ✅ Key management (CREATE, DROP, EXISTS, INFO)
- ✅ Dynamic tool list based on permissions
- ✅ Operation logging
- ✅ Connection management
- ✅ Auto-reconnection mechanism
- ✅ Health checks
- ✅ Error handling and recovery

### Environment Variables
- `HOST`: Redis server host (default: localhost)
- `PORT`: Redis server port (default: 6379)
- `PASSWORD`: Redis server password (optional)
- `ALLOW_INSERT`: Allow insert operations (default: true)
- `ALLOW_UPDATE`: Allow update operations (default: true)
- `ALLOW_DELETE`: Allow delete operations (default: true)
- `ALLOW_CREATE`: Allow create key operations (default: true)
- `ALLOW_DROP`: Allow drop/delete key operations (default: true)
- `MCP_LOG_DIR`: Log directory (default: ./logs)
- `MCP_LOG_FILE`: Log file name (default: mcp-redis.log)
