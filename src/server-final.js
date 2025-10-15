const fs = require('fs');
const path = require('path');
const { RedisConnectionManager, getRedisConfig, ALLOW_INSERT, ALLOW_UPDATE, ALLOW_DELETE, ALLOW_CREATE, ALLOW_DROP } = require('./utils/redis-connection');
const DataOperations = require('./utils/data-operations');
const KeyOperations = require('./utils/key-operations');
const RedisInfo = require('./utils/redis-info');

// In-memory log storage
const operationLogs = [];
const MAX_LOGS = 1000;

// Get log directory and filename
const getLogConfig = () => {
  const logDir = process.env.MCP_LOG_DIR || './logs';
  const logFile = process.env.MCP_LOG_FILE || 'mcp-redis.log';
  return {
    dir: logDir,
    file: logFile,
    fullPath: path.join(logDir, logFile)
  };
};

// Ensure log directory exists
const ensureLogDir = () => {
  const { dir } = getLogConfig();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Log recording function - record all requests and responses
const logRequest = (method, params, result, error = null) => {
  const logEntry = {
    id: Date.now(),
    method,
    params: JSON.stringify(params),
    result: result ? JSON.stringify(result) : null,
    error: error ? error.toString() : null,
    created_at: new Date().toISOString()
  };

  operationLogs.unshift(logEntry);
  if (operationLogs.length > MAX_LOGS) {
    operationLogs.splice(MAX_LOGS);
  }

  // Record request and response data
  const logLine = `${logEntry.created_at} | ${method} | ${logEntry.params} | ${error || 'SUCCESS'} | RESPONSE: ${logEntry.result || 'null'}\n`;

  try {
    ensureLogDir();
    const { fullPath } = getLogConfig();
    fs.appendFileSync(fullPath, logLine, 'utf8');
  } catch (err) {
    console.error('Failed to write log file:', err.message);
  }
};

// Redis operation log recording function
const logRedisOperation = (operation, key, result, error = null) => {
  const logEntry = {
    id: Date.now(),
    operation,
    key,
    result: result ? JSON.stringify(result) : null,
    error: error ? error.toString() : null,
    created_at: new Date().toISOString()
  };

  const logLine = `${logEntry.created_at} | REDIS: ${operation} | KEY: ${key} | ${error || 'SUCCESS'}\n`;

  try {
    ensureLogDir();
    const { fullPath } = getLogConfig();
    fs.appendFileSync(fullPath, logLine, 'utf8');
  } catch (err) {
    console.error('Failed to write log file:', err.message);
  }
};

// 启动日志
console.error('=== MCP Redis Server Starting ===');
console.error(`Time: ${new Date().toISOString()}`);
console.error(`Environment: ALLOW_INSERT=${ALLOW_INSERT}, ALLOW_UPDATE=${ALLOW_UPDATE}, ALLOW_DELETE=${ALLOW_DELETE}, ALLOW_CREATE=${ALLOW_CREATE}, ALLOW_DROP=${ALLOW_DROP}`);
console.error(`Redis: ${process.env.HOST || 'localhost'}:${process.env.PORT || '6379'}`);
console.error(`Password: ${process.env.PASSWORD ? '***' : 'none'}`);
console.error(`Started via: ${process.argv[1]}`);
console.error('================================');

// Final MCP Server
class FinalMCPServer {
  constructor() {
    this.name = 'redis-mcp-server';
    this.version = '1.0.0';
    this.initialized = false;
    this.connectionManager = new RedisConnectionManager();
    this.dataOperations = new DataOperations(this.connectionManager);
    this.keyOperations = new KeyOperations(this.connectionManager);
    this.redisInfo = new RedisInfo(this.connectionManager);
    this.healthCheckInterval = null;
    this.restartCount = 0;
    this.maxRestarts = 5;
  }

  // Get data by key
  async get_data(params) {
    const { key } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    try {
      const result = await this.dataOperations.getData({ key });
      logRedisOperation('GET', key, result);
      return result;
    } catch (err) {
      logRedisOperation('GET', key, null, err.message);
      throw new Error(`Failed to get data: ${err.message}`);
    }
  }

  // Set/Insert data
  async set_data(params) {
    const { key, value, ttl, type = 'string' } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    if (value === undefined || value === null) {
      throw new Error('Missing value parameter');
    }

    try {
      const result = await this.dataOperations.setData({ key, value, ttl, type });
      logRedisOperation('SET', key, result);
      return result;
    } catch (err) {
      logRedisOperation('SET', key, null, err.message);
      throw new Error(`Failed to set data: ${err.message}`);
    }
  }

  // Update data
  async update_data(params) {
    const { key, value, ttl } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    if (value === undefined || value === null) {
      throw new Error('Missing value parameter');
    }

    try {
      const result = await this.dataOperations.updateData({ key, value, ttl });
      logRedisOperation('UPDATE', key, result);
      return result;
    } catch (err) {
      logRedisOperation('UPDATE', key, null, err.message);
      throw new Error(`Failed to update data: ${err.message}`);
    }
  }

  // Delete data
  async delete_data(params) {
    const { key } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    try {
      const result = await this.dataOperations.deleteData({ key });
      logRedisOperation('DELETE', key, result);
      return result;
    } catch (err) {
      logRedisOperation('DELETE', key, null, err.message);
      throw new Error(`Failed to delete data: ${err.message}`);
    }
  }

  // List keys
  async list_keys(params) {
    const { pattern = '*', limit = 100, offset = 0 } = params || {};

    try {
      const result = await this.dataOperations.listKeys({ pattern, limit, offset });
      logRedisOperation('LIST_KEYS', pattern, { count: result.keys.length });
      return result;
    } catch (err) {
      logRedisOperation('LIST_KEYS', pattern, null, err.message);
      throw new Error(`Failed to list keys: ${err.message}`);
    }
  }

  // Create key
  async create_key(params) {
    const { key, value = '', type = 'string', ttl } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    try {
      const result = await this.keyOperations.createKey({ key, value, type, ttl });
      logRedisOperation('CREATE_KEY', key, result);
      return result;
    } catch (err) {
      logRedisOperation('CREATE_KEY', key, null, err.message);
      throw new Error(`Failed to create key: ${err.message}`);
    }
  }

  // Drop key
  async drop_key(params) {
    const { key } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    try {
      const result = await this.keyOperations.dropKey({ key });
      logRedisOperation('DROP_KEY', key, result);
      return result;
    } catch (err) {
      logRedisOperation('DROP_KEY', key, null, err.message);
      throw new Error(`Failed to drop key: ${err.message}`);
    }
  }

  // Check if key exists
  async exists_key(params) {
    const { key } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    try {
      const result = await this.keyOperations.existsKey({ key });
      logRedisOperation('EXISTS_KEY', key, result);
      return result;
    } catch (err) {
      logRedisOperation('EXISTS_KEY', key, null, err.message);
      throw new Error(`Failed to check key existence: ${err.message}`);
    }
  }

  // Get key information
  async get_key_info(params) {
    const { key } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    try {
      const result = await this.keyOperations.getKeyInfo({ key });
      logRedisOperation('GET_KEY_INFO', key, result);
      return result;
    } catch (err) {
      logRedisOperation('GET_KEY_INFO', key, null, err.message);
      throw new Error(`Failed to get key info: ${err.message}`);
    }
  }

  // Rename key
  async rename_key(params) {
    const { oldKey, newKey } = params;

    if (!oldKey || typeof oldKey !== 'string') {
      throw new Error('Missing or invalid oldKey parameter');
    }

    if (!newKey || typeof newKey !== 'string') {
      throw new Error('Missing or invalid newKey parameter');
    }

    try {
      const result = await this.keyOperations.renameKey({ oldKey, newKey });
      logRedisOperation('RENAME_KEY', `${oldKey} -> ${newKey}`, result);
      return result;
    } catch (err) {
      logRedisOperation('RENAME_KEY', `${oldKey} -> ${newKey}`, null, err.message);
      throw new Error(`Failed to rename key: ${err.message}`);
    }
  }

  // Set TTL for key
  async set_ttl(params) {
    const { key, ttl } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    if (typeof ttl !== 'number' || ttl <= 0) {
      throw new Error('TTL must be a positive number');
    }

    try {
      const result = await this.keyOperations.setTTL({ key, ttl });
      logRedisOperation('SET_TTL', key, result);
      return result;
    } catch (err) {
      logRedisOperation('SET_TTL', key, null, err.message);
      throw new Error(`Failed to set TTL: ${err.message}`);
    }
  }

  // Remove TTL from key
  async remove_ttl(params) {
    const { key } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    try {
      const result = await this.keyOperations.removeTTL({ key });
      logRedisOperation('REMOVE_TTL', key, result);
      return result;
    } catch (err) {
      logRedisOperation('REMOVE_TTL', key, null, err.message);
      throw new Error(`Failed to remove TTL: ${err.message}`);
    }
  }

  // Get Redis server information
  async get_redis_info(params) {
    try {
      const result = await this.redisInfo.getRedisInfo();
      logRedisOperation('GET_REDIS_INFO', 'server', result);
      return result;
    } catch (err) {
      logRedisOperation('GET_REDIS_INFO', 'server', null, err.message);
      throw new Error(`Failed to get Redis info: ${err.message}`);
    }
  }

  // Get database statistics
  async get_database_stats(params) {
    try {
      const result = await this.redisInfo.getDatabaseStats();
      logRedisOperation('GET_DATABASE_STATS', 'database', result);
      return result;
    } catch (err) {
      logRedisOperation('GET_DATABASE_STATS', 'database', null, err.message);
      throw new Error(`Failed to get database stats: ${err.message}`);
    }
  }

  // Get memory information
  async get_memory_info(params) {
    try {
      const result = await this.redisInfo.getMemoryInfo();
      logRedisOperation('GET_MEMORY_INFO', 'memory', result);
      return result;
    } catch (err) {
      logRedisOperation('GET_MEMORY_INFO', 'memory', null, err.message);
      throw new Error(`Failed to get memory info: ${err.message}`);
    }
  }

  // Test Redis connection
  async test_connection(params) {
    try {
      const result = await this.redisInfo.testConnection();
      logRedisOperation('TEST_CONNECTION', 'connection', result);
      return result;
    } catch (err) {
      logRedisOperation('TEST_CONNECTION', 'connection', null, err.message);
      throw new Error(`Failed to test connection: ${err.message}`);
    }
  }

  // Get operation logs
  async get_operation_logs(params) {
    const { limit = 50, offset = 0 } = params || {};

    // Validate parameters
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      throw new Error('limit parameter must be between 1-1000');
    }

    if (typeof offset !== 'number' || offset < 0) {
      throw new Error('offset parameter must be greater than or equal to 0');
    }

    // Return logs from memory
    const logs = operationLogs.slice(offset, offset + limit);

    return {
      logs: logs,
      total: operationLogs.length,
      limit: limit,
      offset: offset,
      hasMore: offset + limit < operationLogs.length
    };
  }

  // Check permissions
  async check_permissions(params) {
    const connectionInfo = this.connectionManager.getConnectionInfo();
    const permissions = this.connectionManager.getPermissions();

    return {
      permissions: permissions,
      connection: connectionInfo,
      config: {
        host: getRedisConfig().host,
        port: getRedisConfig().port,
        hasPassword: !!getRedisConfig().password
      },
      environmentVariables: {
        ALLOW_INSERT: ALLOW_INSERT,
        ALLOW_UPDATE: ALLOW_UPDATE,
        ALLOW_DELETE: ALLOW_DELETE,
        ALLOW_CREATE: ALLOW_CREATE,
        ALLOW_DROP: ALLOW_DROP
      }
    };
  }

  // Close Redis connection
  async closeConnection() {
    try {
      await this.connectionManager.close();
      console.error('Redis connection closed');
      logRequest('connection_closed', {}, { status: 'closed' }, null);
    } catch (err) {
      console.error('Failed to close Redis connection:', err.message);
      logRequest('connection_close_error', { error: err.message }, null, err.message);
    }
  }

  // Test Redis connection health
  async checkConnectionHealth() {
    try {
      return await this.connectionManager.testConnection();
    } catch (err) {
      console.error('Redis connection health check failed:', err.message);
      return false;
    }
  }

  // Ensure Redis connection
  async ensureConnection() {
    try {
      const isHealthy = await this.checkConnectionHealth();
      if (!isHealthy) {
        console.error('Redis connection unhealthy, attempting to reconnect...');
        await this.connectionManager.close();
        // Connection will be recreated on next operation
      }
    } catch (err) {
      console.error('Failed to ensure Redis connection:', err.message);
      throw err;
    }
  }

  // Handle JSON-RPC requests
  async handleRequest(request) {
    try {
      const { jsonrpc, id, method, params } = request;

      if (jsonrpc !== '2.0') {
        logRequest('Unsupported JSON-RPC version', { jsonrpc }, null, 'Unsupported JSON-RPC version');
        throw new Error('Unsupported JSON-RPC version');
      }

      let result = null;
      let error = null;

      try {
        if (method === 'initialize') {
          // If already initialized, return success but don't re-initialize
          if (!this.initialized) {
            this.initialized = true;
            
            // Record actual client information
            const clientInfo = params?.clientInfo || {};
            logRequest('initialize', { 
              protocolVersion: params?.protocolVersion || '2025-06-18', 
              capabilities: params?.capabilities || {}, 
              clientInfo: clientInfo 
            }, null, null);
          }
          
          // Build server capabilities to match client capabilities
          const serverCapabilities = {
            tools: {
              listChanged: false
            }
          };
          
          // If client supports prompts, we also support it
          if (params?.capabilities?.prompts) {
            serverCapabilities.prompts = {
              listChanged: false
            };
          }
          
          // If client supports resources, we also support it
          if (params?.capabilities?.resources) {
            serverCapabilities.resources = {
              listChanged: false
            };
          }
          
          // If client supports logging, we also support it
          if (params?.capabilities?.logging) {
            serverCapabilities.logging = {
              listChanged: false
            };
          }
          
          // If client supports roots, we also support it
          if (params?.capabilities?.roots) {
            serverCapabilities.roots = {
              listChanged: false
            };
          }
          
          result = {
            protocolVersion: params?.protocolVersion || '2025-06-18',
            capabilities: serverCapabilities,
            serverInfo: {
              name: this.name,
              version: this.version
            }
          };
        } else if (method === 'tools/list') {
          // Build tools list based on permissions
          const tools = [];
          
          // Always available tools (read-only and info)
          tools.push(
            {
              name: 'get_data',
              description: 'Get data by key from Redis',
              inputSchema: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Redis key to get data from'
                  }
                },
                required: ['key']
              }
            },
            {
              name: 'list_keys',
              description: 'List Redis keys with optional pattern matching',
              inputSchema: {
                type: 'object',
                properties: {
                  pattern: {
                    type: 'string',
                    description: 'Key pattern to match (default: *)'
                  },
                  limit: {
                    type: 'number',
                    description: 'Maximum number of keys to return (default: 100)'
                  },
                  offset: {
                    type: 'number',
                    description: 'Number of keys to skip (default: 0)'
                  }
                }
              }
            },
            {
              name: 'exists_key',
              description: 'Check if a key exists in Redis',
              inputSchema: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Redis key to check'
                  }
                },
                required: ['key']
              }
            },
            {
              name: 'get_key_info',
              description: 'Get detailed information about a key',
              inputSchema: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Redis key to get info for'
                  }
                },
                required: ['key']
              }
            },
            {
              name: 'get_redis_info',
              description: 'Get Redis server information',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            },
            {
              name: 'get_database_stats',
              description: 'Get Redis database statistics',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            },
            {
              name: 'get_memory_info',
              description: 'Get Redis memory usage information',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            },
            {
              name: 'test_connection',
              description: 'Test Redis connection',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            },
            {
              name: 'get_operation_logs',
              description: 'Get operation logs',
              inputSchema: {
                type: 'object',
                properties: {
                  limit: {
                    type: 'number',
                    description: 'Limit count, default 50'
                  },
                  offset: {
                    type: 'number',
                    description: 'Offset, default 0'
                  }
                }
              }
            },
            {
              name: 'check_permissions',
              description: 'Check Redis permissions for insert, update, delete, create and drop operations',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            }
          );

          // Conditional tools based on permissions
          if (ALLOW_INSERT) {
            tools.push({
              name: 'set_data',
              description: 'Set/insert data for a key in Redis',
              inputSchema: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Redis key to set data for'
                  },
                  value: {
                    description: 'Value to set for the key'
                  },
                  ttl: {
                    type: 'number',
                    description: 'Time to live in seconds (optional)'
                  },
                  type: {
                    type: 'string',
                    description: 'Data type: string, list, set, hash (default: string)'
                  }
                },
                required: ['key', 'value']
              }
            });
          }

          if (ALLOW_UPDATE) {
            tools.push({
              name: 'update_data',
              description: 'Update existing data for a key in Redis',
              inputSchema: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Redis key to update'
                  },
                  value: {
                    description: 'New value for the key'
                  },
                  ttl: {
                    type: 'number',
                    description: 'Time to live in seconds (optional)'
                  }
                },
                required: ['key', 'value']
              }
            });
          }

          if (ALLOW_DELETE) {
            tools.push({
              name: 'delete_data',
              description: 'Delete data by key from Redis',
              inputSchema: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Redis key to delete'
                  }
                },
                required: ['key']
              }
            });
          }

          if (ALLOW_CREATE) {
            tools.push({
              name: 'create_key',
              description: 'Create a new key in Redis',
              inputSchema: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Redis key to create'
                  },
                  value: {
                    description: 'Initial value for the key (default: empty string)'
                  },
                  type: {
                    type: 'string',
                    description: 'Data type: string, list, set, hash (default: string)'
                  },
                  ttl: {
                    type: 'number',
                    description: 'Time to live in seconds (optional)'
                  }
                },
                required: ['key']
              }
            });
          }

          if (ALLOW_DROP) {
            tools.push({
              name: 'drop_key',
              description: 'Delete a key from Redis',
              inputSchema: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Redis key to delete'
                  }
                },
                required: ['key']
              }
            });
          }

          // Rename and TTL operations require both create and drop permissions
          if (ALLOW_CREATE && ALLOW_DROP) {
            tools.push({
              name: 'rename_key',
              description: 'Rename a key in Redis',
              inputSchema: {
                type: 'object',
                properties: {
                  oldKey: {
                    type: 'string',
                    description: 'Current key name'
                  },
                  newKey: {
                    type: 'string',
                    description: 'New key name'
                  }
                },
                required: ['oldKey', 'newKey']
              }
            });
          }

          // TTL operations (always available as they don't modify data)
          tools.push(
            {
              name: 'set_ttl',
              description: 'Set time to live for a key',
              inputSchema: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Redis key to set TTL for'
                  },
                  ttl: {
                    type: 'number',
                    description: 'Time to live in seconds'
                  }
                },
                required: ['key', 'ttl']
              }
            },
            {
              name: 'remove_ttl',
              description: 'Remove time to live from a key',
              inputSchema: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Redis key to remove TTL from'
                  }
                },
                required: ['key']
              }
            }
          );

          result = {
            tools: tools,
            environment: {
              ALLOW_INSERT: ALLOW_INSERT,
              ALLOW_UPDATE: ALLOW_UPDATE,
              ALLOW_DELETE: ALLOW_DELETE,
              ALLOW_CREATE: ALLOW_CREATE,
              ALLOW_DROP: ALLOW_DROP,
              HOST: process.env.HOST || 'localhost',
              PORT: process.env.PORT || '6379',
              PASSWORD: process.env.PASSWORD ? '***' : 'none',
              serverInfo: {
                name: this.name,
                version: this.version
              }
            }
          };
        } else if (method === 'prompts/list') {
          result = {
            prompts: []
          };
        } else if (method === 'prompts/call') {
          result = {
            messages: [
              {
                role: 'assistant',
                content: [
                  {
                    type: 'text',
                    text: 'Unsupported prompts call'
                  }
                ]
              }
            ]
          };
        } else if (method === 'resources/list') {
          result = {
            resources: []
          };
        } else if (method === 'resources/read') {
          result = {
            contents: [
              {
                uri: 'error://unsupported',
                text: 'Unsupported resources read'
              }
            ]
          };
        } else if (method === 'logging/list') {
          result = {
            logs: []
          };
        } else if (method === 'logging/read') {
          result = {
            contents: [
              {
                uri: 'error://unsupported',
                text: 'Unsupported logging read'
              }
            ]
          };
        } else if (method === 'roots/list') {
          result = {
            roots: []
          };
        } else if (method === 'roots/read') {
          result = {
            contents: [
              {
                uri: 'error://unsupported',
                text: 'Unsupported roots read'
              }
            ]
          };
        } else if (method === 'tools/call') {
          const { name, arguments: args } = params || {};

          if (!name) {
            throw new Error('Missing tool name');
          }

          // Check if method exists
          if (!this[name]) {
            throw new Error(`Unknown tool: ${name}`);
          }

          result = await this[name](args || {});

          // Tool call results need to be wrapped in content
          result = {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        } else if (method === 'ping') {
          logRequest('ping', {}, { status: 'pong' }, null);
          result = { pong: true };
        } else if (method === 'shutdown') {
          result = null;
          await this.closeConnection();
          setTimeout(() => {
            process.exit(0);
          }, 100);
        } else if (method === 'notifications/initialized') {
          // Test Redis connection
          try {
            const isConnected = await this.checkConnectionHealth();
            if (isConnected) {
              console.error('Redis connection test successful');
              logRequest('redis_connection_test', { 
                host: getRedisConfig().host,
                port: getRedisConfig().port,
                hasPassword: !!getRedisConfig().password
              }, { status: 'success' }, null);
            } else {
              console.error('Redis connection test failed');
              logRequest('redis_connection_test', { 
                host: getRedisConfig().host,
                port: getRedisConfig().port,
                hasPassword: !!getRedisConfig().password
              }, null, 'Connection test failed');
            }
          } catch (err) {
            console.error('Failed to test Redis connection:', err.message);
            logRequest('redis_connection_error', { 
              error: err.message 
            }, null, err.message);
          }
        } else if (method === 'notifications/exit') {
          result = null;
          await this.closeConnection();
          process.exit(0);
        } else {
          throw new Error(`Unknown method: ${method}`);
        }
      } catch (err) {
        error = err.message;
        throw err;
      } finally {
        const safeParams = params || {};
        logRequest(method, safeParams, result, error);
      }

      // For notification methods, no response is needed
      if (method === 'notifications/initialized' || method === 'notifications/exit') {
        return null;
      }
      
      // shutdown method needs to return response
      if (method === 'shutdown') {
        return {
          jsonrpc: '2.0',
          id,
          result: null
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        result
      };
    } catch (error) {
      let errorCode = -32603; // Internal error
      let errorMessage = error.message;
      
      if (error.message.includes('Server not initialized')) {
        errorCode = -32002; // Server not initialized
      } else if (error.message.includes('Unknown method')) {
        errorCode = -32601; // Method not found
      } else if (error.message.includes('Unsupported JSON-RPC version')) {
        errorCode = -32600; // Invalid Request
      }
      logRequest('error', { error: error.message, stack: error.stack }, null, error.message);
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: errorCode,
          message: errorMessage
        }
      };
    }
  }

  // Start server
  async start() {
    console.error('MCP Redis server started');

    // Display log configuration
    const logConfig = getLogConfig();
    console.error(`Log directory: ${logConfig.dir}`);
    console.error(`Log file: ${logConfig.fullPath}`);

    // Listen to stdin
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', async (data) => {
      try {
        const lines = data.toString().trim().split('\n');

        for (const line of lines) {
          if (line.trim()) {
            try {
              const request = JSON.parse(line);
              const response = await this.handleRequest(request);
              if (response) {
                console.log(JSON.stringify(response));
              }
            } catch (requestError) {
              console.error('Error processing individual request:', requestError.message);
              const errorResponse = {
                jsonrpc: '2.0',
                id: null,
                error: {
                  code: -32603,
                  message: `Internal error: ${requestError.message}`
                }
              };
              console.log(JSON.stringify(errorResponse));
            }
          }
        }
      } catch (error) {
        console.error('Error processing data:', error.message);
        logRequest('data_processing_error', { error: error.message }, null, error.message);
      }
    });

    // Handle process signals
    process.on('SIGTERM', async () => {
      console.error('Received SIGTERM signal, shutting down server...');
      logRequest('SIGTERM', { signal: 'SIGTERM' }, { status: 'shutting_down' }, null);
      await this.closeConnection();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.error('Received SIGINT signal, shutting down server...');
      logRequest('SIGINT', { signal: 'SIGINT' }, { status: 'shutting_down' }, null);
      await this.closeConnection();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      logRequest('uncaughtException', { error: error.message, stack: error.stack }, null, error.message);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Promise rejection:', reason);
      logRequest('unhandledRejection', { reason: reason.toString(), promise: promise.toString() }, null, reason.toString());
      process.exit(1);
    });

    // Record server startup
    logRequest('server_start', {
      name: this.name,
      version: this.version,
      logDir: logConfig.dir,
      logFile: logConfig.fullPath
    }, { status: 'started' }, null);

    // Start periodic health checks
    this.startHealthCheck();
  }

  // Periodic health check
  startHealthCheck() {
    // Check Redis connection health every 5 minutes
    setInterval(async () => {
      try {
        const isHealthy = await this.checkConnectionHealth();
        if (!isHealthy) {
          console.error('Redis connection unhealthy, attempting to reconnect...');
          await this.ensureConnection();
        }
      } catch (err) {
        console.error('Health check failed:', err.message);
        logRequest('health_check_error', { error: err.message }, null, err.message);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
}

// Start server
async function main() {
  console.error('Starting MCP Redis server...');
  const server = new FinalMCPServer();
  await server.start();
  console.error('MCP Redis server started successfully');
}

main().catch(error => {
  console.error(error);
  logRequest('main', { error: error.message, stack: error.stack }, null, error.message);
  process.exit(1);
});
