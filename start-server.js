#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Get the path to the server file
const serverPath = path.join(__dirname, 'src', 'server-final.js');

console.error('Starting MCP Redis server...');

// Start the server
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  cwd: process.cwd()
});

// Handle process signals
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down...');
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down...');
  server.kill('SIGTERM');
  process.exit(0);
});

// Handle server exit
server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Server exited with code ${code}`);
    process.exit(code);
  }
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
