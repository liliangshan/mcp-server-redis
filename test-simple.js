#!/usr/bin/env node

// Simple test script for MCP Redis Server
const { RedisConnectionManager } = require('./src/utils/redis-connection');
const DataOperations = require('./src/utils/data-operations');
const KeyOperations = require('./src/utils/key-operations');
const RedisInfo = require('./src/utils/redis-info');

async function testRedisConnection() {
  console.log('Testing Redis connection...');
  
  try {
    const connectionManager = new RedisConnectionManager();
    const isConnected = await connectionManager.testConnection();
    
    if (isConnected) {
      console.log('✅ Redis connection successful');
      
      // Test basic operations
      const dataOps = new DataOperations(connectionManager);
      const keyOps = new KeyOperations(connectionManager);
      const redisInfo = new RedisInfo(connectionManager);
      
      // Test set and get
      console.log('Testing set_data...');
      await dataOps.setData({ key: 'test:key', value: 'Hello Redis!' });
      console.log('✅ set_data successful');
      
      console.log('Testing get_data...');
      const result = await dataOps.getData({ key: 'test:key' });
      console.log('✅ get_data successful:', result.value);
      
      // Test key operations
      console.log('Testing exists_key...');
      const exists = await keyOps.existsKey({ key: 'test:key' });
      console.log('✅ exists_key successful:', exists.exists);
      
      // Test Redis info
      console.log('Testing get_redis_info...');
      const info = await redisInfo.getRedisInfo();
      console.log('✅ get_redis_info successful:', info.server.version);
      
      // Clean up
      console.log('Cleaning up test data...');
      await dataOps.deleteData({ key: 'test:key' });
      console.log('✅ Cleanup successful');
      
      await connectionManager.close();
      console.log('✅ All tests passed!');
      
    } else {
      console.log('❌ Redis connection failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
testRedisConnection();
