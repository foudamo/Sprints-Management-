const express = require('express');
const morgan = require('morgan');
const debug = require('debug')('server:app');
const debugHttp = require('debug')('server:http');
const debugRoute = require('debug')('server:route');
const debugError = require('debug')('server:error');
const debugHealth = require('debug')('server:health');
const os = require('os');
const process = require('process');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const logger = require('morgan');

// Trust proxy headers since we're behind ALB
app.set('trust proxy', true);

// Try to read container metadata if available
let containerMetadata = {};
try {
  if (process.env.ECS_CONTAINER_METADATA_FILE) {
    containerMetadata = JSON.parse(fs.readFileSync(process.env.ECS_CONTAINER_METADATA_FILE));
    debug('Container Metadata:', containerMetadata);
  }
} catch (err) {
  debugError('Error reading container metadata:', err);
}

// Print startup info
debug('Starting server with configuration:');
debug('NODE_ENV:', process.env.NODE_ENV);
debug('PORT:', process.env.PORT);
debug('API_PREFIX:', process.env.API_PREFIX);
debug('HOST:', process.env.HOST);
debug('Container ID:', process.env.HOSTNAME);
debug('ECS Task ID:', process.env.ECS_TASK_ID);
debug('AWS Region:', process.env.AWS_REGION);
debug('Platform:', os.platform());
debug('Architecture:', os.arch());
debug('Node Version:', process.version);
debug('Memory:', process.memoryUsage());

// Add health check middleware
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    uptime: process.uptime()
  });
});

// Add CORS middleware
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request tracing
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Backend-Host', os.hostname());
  debugHttp(`Request ID: ${requestId}`);
  debugHttp('Request from:', req.ip);
  debugHttp('User Agent:', req.get('user-agent'));
  debugHttp('Headers:', JSON.stringify(req.headers, null, 2));
  debugHttp('Query:', JSON.stringify(req.query, null, 2));
  debugHttp('Body:', JSON.stringify(req.body, null, 2));
  debugHttp('Path:', req.path);
  debugHttp('Method:', req.method);
  debugHttp('Protocol:', req.protocol);
  debugHttp('Original URL:', req.originalUrl);
  
  // Add response logging
  const oldWrite = res.write;
  const oldEnd = res.end;
  const chunks = [];
  
  res.write = function (chunk) {
    chunks.push(chunk);
    return oldWrite.apply(res, arguments);
  };
  
  res.end = function (chunk) {
    if (chunk) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString('utf8');
    debugHttp(`Response for ${requestId}:`);
    debugHttp('Status:', res.statusCode);
    debugHttp('Headers:', JSON.stringify(res.getHeaders(), null, 2));
    debugHttp('Body:', body);
    oldEnd.apply(res, arguments);
  };
  
  next();
});

// URL rewriting middleware
app.use((req, res, next) => {
  const originalUrl = req.originalUrl;
  debugRoute('Original URL:', originalUrl);
  debugRoute('Method:', req.method);
  debugRoute('Path:', req.path);
  
  // Keep original URL, no rewriting needed
  next();
});

// Enable detailed logging
app.use(logger(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms :res[content-length] bytes - :req[x-forwarded-for]'));

// Add request timing
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    debugHttp(`${req.method} ${req.originalUrl} completed in ${duration}ms with status ${res.statusCode}`);
  });
  next();
});

// Add request timing
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    debugHttp(`${req.method} ${req.originalUrl} completed in ${duration}ms with status ${res.statusCode}`);
  });
  next();
});

// Log all requests
app.use((req, res, next) => {
  debugHttp('----------------------------------------');
  debugHttp('Incoming Request:');
  debugHttp('URL:', req.url);
  debugHttp('Method:', req.method);
  debugHttp('Headers:', JSON.stringify(req.headers, null, 2));
  debugHttp('Query:', JSON.stringify(req.query, null, 2));
  debugHttp('Body:', JSON.stringify(req.body, null, 2));
  debugHttp('IP:', req.ip);
  debugHttp('Protocol:', req.protocol);
  debugHttp('Secure:', req.secure);
  debugHttp('----------------------------------------');

  // Log response
  const originalSend = res.send;
  res.send = function (body) {
    debugHttp('----------------------------------------');
    debugHttp('Outgoing Response:');
    debugHttp('Status:', res.statusCode);
    debugHttp('Headers:', JSON.stringify(res.getHeaders(), null, 2));
    debugHttp('Body:', typeof body === 'string' ? body : JSON.stringify(body, null, 2));
    debugHttp('----------------------------------------');
    return originalSend.call(this, body);
  };
  next();
});

// Add base path middleware for debugging
app.use((req, res, next) => {
  debug(`Incoming request: ${req.path}`);
  debug(`Headers: ${JSON.stringify(req.headers)}`);
  next();
});

// Add error handling middleware
app.use((err, req, res, next) => {
  debugError('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    requestId: req.requestId
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Health check endpoints
const healthResponse = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  memory: process.memoryUsage(),
  hostname: os.hostname(),
  pid: process.pid,
  nodeVersion: process.version,
  platform: os.platform(),
  arch: os.arch(),
  env: process.env.NODE_ENV,
  url: process.env.API_PREFIX || '/api',
  container: {
    id: process.env.HOSTNAME,
    taskId: process.env.ECS_TASK_ID,
    region: process.env.AWS_REGION,
    metadata: containerMetadata
  },
  network: {
    interfaces: os.networkInterfaces(),
    hostname: os.hostname()
  }
};

// Health check endpoints
app.get(['/health', '/api/health'], (req, res) => {
  // Log request details
  debugHealth('Health check requested from:', req.ip);
  debugHealth('Headers:', req.headers);
  
  // Return detailed health info
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid
  });
});

// Add OPTIONS handler for CORS preflight
app.options('*', cors());

// Add catch-all route for 404s
app.use((req, res) => {
  debugError('404 Not Found:', req.method, req.url);
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Add sprints endpoint
app.get(['/sprints', '/api/sprints'], (req, res) => {
  debug(`Sprints requested at ${req.path}`);
  debug('Request headers:', JSON.stringify(req.headers, null, 2));
  res.status(200).json([
    {
      id: 1,
      name: 'Sprint 1',
      startDate: '2024-02-01',
      endDate: '2024-02-14',
      status: 'In Progress'
    }
  ]);
});

// Add system info endpoint
app.get('/system-info', (req, res) => {
  const systemInfo = {
    hostname: os.hostname(),
    platform: os.platform(),
    cpus: os.cpus(),
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    },
    network: os.networkInterfaces(),
    uptime: os.uptime(),
    processInfo: {
      pid: process.pid,
      version: process.version,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT
    }
  };
  res.json(systemInfo);
});

app.get('/api/system-info', (req, res) => {
  const systemInfo = {
    hostname: os.hostname(),
    platform: os.platform(),
    cpus: os.cpus(),
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    },
    network: os.networkInterfaces(),
    uptime: os.uptime(),
    processInfo: {
      pid: process.pid,
      version: process.version,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT
    }
  };
  res.json(systemInfo);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  debugError('Uncaught Exception:');
  debugError('Message:', err.message);
  debugError('Stack:', err.stack);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  debugError('Unhandled Rejection at:', promise);
  debugError('Reason:', reason);
});

// Add middleware to handle /api prefix
app.use((req, res, next) => {
  // Log all incoming requests
  debug(`${req.method} ${req.originalUrl}`);
  debug('Headers:', req.headers);
  
  // Strip /api prefix if present
  if (req.originalUrl.startsWith('/api/')) {
    req.url = req.originalUrl.slice(4); // Remove /api
  }
  next();
});

// Simple health check that doesn't use /api prefix
app.get('/health', (req, res) => {
  res.status(200).send('healthy');
});

// API routes with automatic /api prefix handling
app.get(['/sprints', '/api/sprints'], (req, res) => {
  res.json([
    {
      id: 1,
      name: 'Sprint 1',
      startDate: '2024-02-01',
      endDate: '2024-02-14'
    }
  ]);
});

module.exports = app; 