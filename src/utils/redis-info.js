const { RedisConnectionManager } = require('./redis-connection');

class RedisInfo {
  constructor(connectionManager) {
    this.connectionManager = connectionManager;
  }

  // Get Redis server information
  async getRedisInfo() {
    const client = await this.connectionManager.getClient();
    
    try {
      const info = await client.info();
      const dbSize = await client.dbSize();
      const connectionInfo = this.connectionManager.getConnectionInfo();
      const permissions = this.connectionManager.getPermissions();

      // Parse Redis INFO command output
      const infoLines = info.split('\r\n');
      const serverInfo = {};
      
      for (const line of infoLines) {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value !== undefined) {
            serverInfo[key] = value;
          }
        }
      }

      return {
        connection: connectionInfo,
        permissions: permissions,
        database: {
          size: dbSize
        },
        server: {
          version: serverInfo.redis_version,
          mode: serverInfo.redis_mode,
          os: serverInfo.os,
          archBits: serverInfo.arch_bits,
          uptime: serverInfo.uptime_in_seconds,
          connectedClients: serverInfo.connected_clients,
          usedMemory: serverInfo.used_memory_human,
          maxMemory: serverInfo.maxmemory_human,
          totalCommandsProcessed: serverInfo.total_commands_processed,
          instantaneousOpsPerSec: serverInfo.instantaneous_ops_per_sec,
          keyspaceHits: serverInfo.keyspace_hits,
          keyspaceMisses: serverInfo.keyspace_misses
        }
      };
    } catch (err) {
      throw new Error(`Failed to get Redis info: ${err.message}`);
    }
  }

  // Get database statistics
  async getDatabaseStats() {
    const client = await this.connectionManager.getClient();
    
    try {
      const dbSize = await client.dbSize();
      const info = await client.info('keyspace');
      
      // Parse keyspace information
      const keyspaceInfo = {};
      const infoLines = info.split('\r\n');
      
      for (const line of infoLines) {
        if (line && line.startsWith('db')) {
          const [dbName, stats] = line.split(':');
          if (dbName && stats) {
            const statPairs = stats.split(',');
            const dbStats = {};
            for (const pair of statPairs) {
              const [key, value] = pair.split('=');
              if (key && value !== undefined) {
                dbStats[key] = parseInt(value) || value;
              }
            }
            keyspaceInfo[dbName] = dbStats;
          }
        }
      }

      return {
        totalKeys: dbSize,
        databases: keyspaceInfo
      };
    } catch (err) {
      throw new Error(`Failed to get database stats: ${err.message}`);
    }
  }

  // Get memory usage information
  async getMemoryInfo() {
    const client = await this.connectionManager.getClient();
    
    try {
      const info = await client.info('memory');
      const memoryInfo = {};
      
      const infoLines = info.split('\r\n');
      for (const line of infoLines) {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value !== undefined) {
            memoryInfo[key] = value;
          }
        }
      }

      return {
        usedMemory: memoryInfo.used_memory,
        usedMemoryHuman: memoryInfo.used_memory_human,
        usedMemoryRss: memoryInfo.used_memory_rss,
        usedMemoryRssHuman: memoryInfo.used_memory_rss_human,
        usedMemoryPeak: memoryInfo.used_memory_peak,
        usedMemoryPeakHuman: memoryInfo.used_memory_peak_human,
        maxMemory: memoryInfo.maxmemory,
        maxMemoryHuman: memoryInfo.maxmemory_human,
        memFragmentationRatio: memoryInfo.mem_fragmentation_ratio
      };
    } catch (err) {
      throw new Error(`Failed to get memory info: ${err.message}`);
    }
  }

  // Get client information
  async getClientInfo() {
    const client = await this.connectionManager.getClient();
    
    try {
      const clientList = await client.clientList();
      const clients = clientList.split('\n').filter(line => line.trim()).map(line => {
        const clientInfo = {};
        const pairs = line.split(' ');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key && value !== undefined) {
            clientInfo[key] = value;
          }
        }
        return clientInfo;
      });

      return {
        totalClients: clients.length,
        clients: clients
      };
    } catch (err) {
      throw new Error(`Failed to get client info: ${err.message}`);
    }
  }

  // Test Redis connection
  async testConnection() {
    try {
      const isConnected = await this.connectionManager.testConnection();
      const connectionInfo = this.connectionManager.getConnectionInfo();
      
      return {
        connected: isConnected,
        connection: connectionInfo,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      return {
        connected: false,
        error: err.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = RedisInfo;
