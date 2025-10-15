const { createClient } = require('redis');

// Redis connection configuration
const getRedisConfig = () => ({
  host: process.env.HOST || 'localhost',
  port: process.env.PORT ? parseInt(process.env.PORT) : 6379,
  password: process.env.PASSWORD || undefined,
});

// Permission control environment variables
const ALLOW_INSERT = process.env.ALLOW_INSERT !== 'false';
const ALLOW_UPDATE = process.env.ALLOW_UPDATE !== 'false';
const ALLOW_DELETE = process.env.ALLOW_DELETE !== 'false';
const ALLOW_CREATE = process.env.ALLOW_CREATE !== 'false';
const ALLOW_DROP = process.env.ALLOW_DROP !== 'false';

class RedisConnectionManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionConfig = getRedisConfig();
  }

  // Create Redis client
  async createClient() {
    if (this.client && this.isConnected) {
      return this.client;
    }

    try {
      const config = this.connectionConfig;
      const redisUrl = config.password 
        ? `redis://:${config.password}@${config.host}:${config.port}`
        : `redis://${config.host}:${config.port}`;

      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 60000,
          lazyConnect: true
        }
      });

      // Handle connection events
      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.error('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.error('Redis Client Ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.error('Redis Client Disconnected');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
      
      return this.client;
    } catch (err) {
      console.error('Failed to create Redis client:', err.message);
      throw new Error(`Redis connection failed: ${err.message}`);
    }
  }

  // Get Redis client (ensure connection)
  async getClient() {
    if (!this.client || !this.isConnected) {
      await this.createClient();
    }
    return this.client;
  }

  // Test connection
  async testConnection() {
    try {
      const client = await this.getClient();
      await client.ping();
      return true;
    } catch (err) {
      console.error('Redis connection test failed:', err.message);
      return false;
    }
  }

  // Close connection
  async close() {
    if (this.client) {
      try {
        await this.client.quit();
        this.isConnected = false;
        console.error('Redis connection closed');
      } catch (err) {
        console.error('Failed to close Redis connection:', err.message);
      }
    }
  }

  // Get connection info
  getConnectionInfo() {
    return {
      host: this.connectionConfig.host,
      port: this.connectionConfig.port,
      hasPassword: !!this.connectionConfig.password,
      isConnected: this.isConnected
    };
  }

  // Get permission status
  getPermissions() {
    return {
      allowInsert: ALLOW_INSERT,
      allowUpdate: ALLOW_UPDATE,
      allowDelete: ALLOW_DELETE,
      allowCreate: ALLOW_CREATE,
      allowDrop: ALLOW_DROP
    };
  }
}

module.exports = {
  RedisConnectionManager,
  getRedisConfig,
  ALLOW_INSERT,
  ALLOW_UPDATE,
  ALLOW_DELETE,
  ALLOW_CREATE,
  ALLOW_DROP
};
