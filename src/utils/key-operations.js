const { RedisConnectionManager, ALLOW_CREATE, ALLOW_DROP } = require('./redis-connection');

class KeyOperations {
  constructor(connectionManager) {
    this.connectionManager = connectionManager;
  }

  // Create a new key
  async createKey(params) {
    if (!ALLOW_CREATE) {
      throw new Error('Create key operations are not allowed');
    }

    const { key, value = '', type = 'string', ttl } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    const client = await this.connectionManager.getClient();
    
    try {
      // Check if key already exists
      const exists = await client.exists(key);
      if (exists) {
        throw new Error(`Key '${key}' already exists`);
      }

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
            result = await client.lpush(key, ...value);
          } else {
            result = await client.lpush(key, value);
          }
          break;
        case 'set':
          if (Array.isArray(value)) {
            result = await client.sadd(key, ...value);
          } else {
            result = await client.sadd(key, value);
          }
          break;
        case 'hash':
          if (typeof value === 'object' && value !== null) {
            const entries = Object.entries(value);
            if (entries.length > 0) {
              result = await client.hset(key, entries.flat());
            } else {
              result = await client.hset(key, 'placeholder', '');
            }
          } else {
            throw new Error('Hash value must be an object');
          }
          break;
        default:
          throw new Error(`Unsupported key type: ${type}`);
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
        created: true,
        result: result
      };
    } catch (err) {
      throw new Error(`Failed to create key: ${err.message}`);
    }
  }

  // Drop/Delete a key
  async dropKey(params) {
    if (!ALLOW_DROP) {
      throw new Error('Drop key operations are not allowed');
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
          dropped: false,
          message: 'Key does not exist'
        };
      }

      const result = await client.del(key);

      return {
        key: key,
        dropped: result > 0,
        result: result
      };
    } catch (err) {
      throw new Error(`Failed to drop key: ${err.message}`);
    }
  }

  // Check if key exists
  async existsKey(params) {
    const { key } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    const client = await this.connectionManager.getClient();
    
    try {
      const exists = await client.exists(key);
      const type = exists ? await client.type(key) : null;
      const ttl = exists ? await client.ttl(key) : null;

      return {
        key: key,
        exists: exists === 1,
        type: type,
        ttl: ttl > 0 ? ttl : (ttl === -1 ? 'persistent' : 'expired')
      };
    } catch (err) {
      throw new Error(`Failed to check key existence: ${err.message}`);
    }
  }

  // Get key information
  async getKeyInfo(params) {
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
          exists: false,
          type: null,
          ttl: null,
          size: null
        };
      }

      const type = await client.type(key);
      const ttl = await client.ttl(key);
      let size = null;

      // Get size based on type
      switch (type) {
        case 'string':
          size = await client.strlen(key);
          break;
        case 'list':
          size = await client.llen(key);
          break;
        case 'set':
          size = await client.scard(key);
          break;
        case 'zset':
          size = await client.zcard(key);
          break;
        case 'hash':
          size = await client.hlen(key);
          break;
      }

      return {
        key: key,
        exists: true,
        type: type,
        ttl: ttl > 0 ? ttl : (ttl === -1 ? 'persistent' : 'expired'),
        size: size
      };
    } catch (err) {
      throw new Error(`Failed to get key info: ${err.message}`);
    }
  }

  // Rename key
  async renameKey(params) {
    if (!ALLOW_CREATE || !ALLOW_DROP) {
      throw new Error('Rename operations require both create and drop permissions');
    }

    const { oldKey, newKey } = params;

    if (!oldKey || typeof oldKey !== 'string') {
      throw new Error('Missing or invalid oldKey parameter');
    }

    if (!newKey || typeof newKey !== 'string') {
      throw new Error('Missing or invalid newKey parameter');
    }

    const client = await this.connectionManager.getClient();
    
    try {
      const exists = await client.exists(oldKey);
      if (!exists) {
        throw new Error(`Source key '${oldKey}' does not exist`);
      }

      const newKeyExists = await client.exists(newKey);
      if (newKeyExists) {
        throw new Error(`Target key '${newKey}' already exists`);
      }

      await client.rename(oldKey, newKey);

      return {
        oldKey: oldKey,
        newKey: newKey,
        renamed: true
      };
    } catch (err) {
      throw new Error(`Failed to rename key: ${err.message}`);
    }
  }

  // Set TTL for key
  async setTTL(params) {
    const { key, ttl } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    if (typeof ttl !== 'number' || ttl <= 0) {
      throw new Error('TTL must be a positive number');
    }

    const client = await this.connectionManager.getClient();
    
    try {
      const exists = await client.exists(key);
      if (!exists) {
        throw new Error(`Key '${key}' does not exist`);
      }

      const result = await client.expire(key, ttl);

      return {
        key: key,
        ttl: ttl,
        set: result === 1
      };
    } catch (err) {
      throw new Error(`Failed to set TTL: ${err.message}`);
    }
  }

  // Remove TTL from key
  async removeTTL(params) {
    const { key } = params;

    if (!key || typeof key !== 'string') {
      throw new Error('Missing or invalid key parameter');
    }

    const client = await this.connectionManager.getClient();
    
    try {
      const exists = await client.exists(key);
      if (!exists) {
        throw new Error(`Key '${key}' does not exist`);
      }

      const result = await client.persist(key);

      return {
        key: key,
        ttlRemoved: result === 1
      };
    } catch (err) {
      throw new Error(`Failed to remove TTL: ${err.message}`);
    }
  }
}

module.exports = KeyOperations;
