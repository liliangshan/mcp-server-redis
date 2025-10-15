const { RedisConnectionManager, ALLOW_INSERT, ALLOW_UPDATE, ALLOW_DELETE } = require('./redis-connection');

class DataOperations {
  constructor(connectionManager) {
    this.connectionManager = connectionManager;
  }

  // Get data by key
  async getData(params) {
    const { key } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    const client = await this.connectionManager.getClient();
    
    try {
      const exists = await client.exists(key);
      if (!exists) {
        return {
          key: key,
          value: null,
          exists: false,
          type: null,
          ttl: null
        };
      }

      const type = await client.type(key);
      let value = null;
      let ttl = await client.ttl(key);

      // Get value based on type
      switch (type) {
        case 'string':
          value = await client.get(key);
          break;
        case 'list':
          const listLength = await client.llen(key);
          value = await client.lrange(key, 0, -1);
          break;
        case 'set':
          value = await client.smembers(key);
          break;
        case 'zset':
          value = await client.zrange(key, 0, -1, 'WITHSCORES');
          break;
        case 'hash':
          value = await client.hgetall(key);
          break;
        default:
          value = await client.get(key);
      }

      return {
        key: key,
        value: value,
        exists: true,
        type: type,
        ttl: ttl > 0 ? ttl : (ttl === -1 ? 'persistent' : 'expired')
      };
    } catch (err) {
      throw new Error(`Failed to get data: ${err.message}`);
    }
  }

  // Set/Insert data
  async setData(params) {
    if (!ALLOW_INSERT) {
      throw new Error('Insert operations are not allowed');
    }

    const { key, value, ttl, type = 'string' } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    if (value === undefined || value === null) {
      throw new Error('Missing value parameter');
    }

    const client = await this.connectionManager.getClient();
    
    try {
      let result;
      
      switch (type) {
        case 'string':
          if (ttl && ttl > 0) {
            result = await client.setEx(key, ttl, value);
          } else {
            result = await client.set(key, value);
          }
          break;
        case 'list':
          if (Array.isArray(value)) {
            await client.del(key); // Clear existing list
            if (value.length > 0) {
              result = await client.lpush(key, ...value);
            } else {
              result = await client.lpush(key, '');
            }
          } else {
            result = await client.lpush(key, value);
          }
          break;
        case 'set':
          if (Array.isArray(value)) {
            await client.del(key); // Clear existing set
            if (value.length > 0) {
              result = await client.sadd(key, ...value);
            }
          } else {
            result = await client.sadd(key, value);
          }
          break;
        case 'hash':
          if (typeof value === 'object' && value !== null) {
            await client.del(key); // Clear existing hash
            const entries = Object.entries(value);
            if (entries.length > 0) {
              result = await client.hset(key, entries.flat());
            }
          } else {
            throw new Error('Hash value must be an object');
          }
          break;
        default:
          throw new Error(`Unsupported data type: ${type}`);
      }

      // Set TTL if specified and not already set by setEx
      if (ttl && ttl > 0 && type !== 'string') {
        await client.expire(key, ttl);
      }

      return {
        key: key,
        value: value,
        type: type,
        ttl: ttl || null,
        result: result
      };
    } catch (err) {
      throw new Error(`Failed to set data: ${err.message}`);
    }
  }

  // Update data
  async updateData(params) {
    if (!ALLOW_UPDATE) {
      throw new Error('Update operations are not allowed');
    }

    const { key, value, ttl } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    if (value === undefined || value === null) {
      throw new Error('Missing value parameter');
    }

    const client = await this.connectionManager.getClient();
    
    try {
      const exists = await client.exists(key);
      if (!exists) {
        throw new Error(`Key '${key}' does not exist`);
      }

      const type = await client.type(key);
      let result;

      switch (type) {
        case 'string':
          if (ttl && ttl > 0) {
            result = await client.setEx(key, ttl, value);
          } else {
            result = await client.set(key, value);
          }
          break;
        case 'list':
          // For list, we'll replace the entire list
          await client.del(key);
          if (Array.isArray(value)) {
            if (value.length > 0) {
              result = await client.lpush(key, ...value);
            }
          } else {
            result = await client.lpush(key, value);
          }
          break;
        case 'set':
          // For set, we'll replace the entire set
          await client.del(key);
          if (Array.isArray(value)) {
            if (value.length > 0) {
              result = await client.sadd(key, ...value);
            }
          } else {
            result = await client.sadd(key, value);
          }
          break;
        case 'hash':
          // For hash, we'll replace the entire hash
          await client.del(key);
          if (typeof value === 'object' && value !== null) {
            const entries = Object.entries(value);
            if (entries.length > 0) {
              result = await client.hset(key, entries.flat());
            }
          } else {
            throw new Error('Hash value must be an object');
          }
          break;
        default:
          throw new Error(`Cannot update unsupported data type: ${type}`);
      }

      // Set TTL if specified
      if (ttl && ttl > 0) {
        await client.expire(key, ttl);
      }

      return {
        key: key,
        value: value,
        type: type,
        ttl: ttl || null,
        result: result
      };
    } catch (err) {
      throw new Error(`Failed to update data: ${err.message}`);
    }
  }

  // Delete data
  async deleteData(params) {
    if (!ALLOW_DELETE) {
      throw new Error('Delete operations are not allowed');
    }

    const { key } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    const client = await this.connectionManager.getClient();
    
    try {
      const exists = await client.exists(key);
      if (!exists) {
        return {
          key: key,
          deleted: false,
          message: 'Key does not exist'
        };
      }

      const result = await client.del(key);

      return {
        key: key,
        deleted: result > 0,
        result: result
      };
    } catch (err) {
      throw new Error(`Failed to delete data: ${err.message}`);
    }
  }

  // List keys with pattern matching
  async listKeys(params) {
    const { pattern = '*', limit = 100, offset = 0 } = params || {};

    if (typeof pattern !== 'string') {
      throw new Error('Pattern must be a string');
    }

    if (typeof limit !== 'number' || limit < 1 || limit > 10000) {
      throw new Error('Limit must be between 1 and 10000');
    }

    if (typeof offset !== 'number' || offset < 0) {
      throw new Error('Offset must be >= 0');
    }

    const client = await this.connectionManager.getClient();
    
    try {
      const keys = await client.keys(pattern);
      const totalKeys = keys.length;
      const paginatedKeys = keys.slice(offset, offset + limit);

      // Get additional info for each key
      const keyInfo = await Promise.all(
        paginatedKeys.map(async (key) => {
          const type = await client.type(key);
          const ttl = await client.ttl(key);
          return {
            key: key,
            type: type,
            ttl: ttl > 0 ? ttl : (ttl === -1 ? 'persistent' : 'expired')
          };
        })
      );

      return {
        keys: keyInfo,
        total: totalKeys,
        limit: limit,
        offset: offset,
        hasMore: offset + limit < totalKeys,
        pattern: pattern
      };
    } catch (err) {
      throw new Error(`Failed to list keys: ${err.message}`);
    }
  }
}

module.exports = DataOperations;
