require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Logging
app.use(morgan('combined'));


// Swagger docs
try {
  const swaggerDoc = YAML.load(path.join(__dirname, '../../swagger.yaml'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
    customCss: '.swagger-ui .topbar { background-color: #0f172a; }',
    customSiteTitle: 'XWZ Parking API Docs',
  }));
} catch (e) {
  console.log('Swagger YAML not found, skipping docs');
}

const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const PARKING_URL = process.env.PARKING_SERVICE_URL || 'http://localhost:5002';
const ENTRY_URL = process.env.ENTRY_SERVICE_URL || 'http://localhost:5003';
const REPORT_URL = process.env.REPORT_SERVICE_URL || 'http://localhost:5004';

const proxyOptions = (target, pathRewrite) => ({
  target,
  changeOrigin: true,
  pathRewrite,
  on: {
    error: (err, req, res) => {
      console.error(`Proxy error to ${target}:`, err.message);
      res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    },
  },
});

// Routes
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '' },
  timeout: 60000,
  proxyTimeout: 60000,
  on: {
    error: (err, req, res) => {
      console.error(`Proxy error to ${AUTH_URL}:`, err.message);
      console.error(`Request path: ${req.path}`);
      console.error(`Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
      if (!res.headersSent) {
        res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      }
    },
    proxyReq: (proxyReq, req, res) => {
      console.log(`Proxying ${req.method} ${req.path} to ${AUTH_URL}`);
      console.log(`Original URL: ${req.originalUrl}`);
      console.log(`Path after rewrite: ${req.path.replace('/api/auth', '')}`);
    },
    proxyRes: (proxyRes, req, res) => {
      console.log(`Response from ${AUTH_URL}: ${proxyRes.statusCode}`);
    },
  },
}));
app.use('/api/parkings', createProxyMiddleware({
  target: PARKING_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/parkings': '' },
  on: {
    error: (err, req, res) => {
      console.error(`Proxy error to ${PARKING_URL}:`, err.message);
      res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    },
  },
}));
app.use('/api/entries', createProxyMiddleware({
  target: ENTRY_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/entries': '' },
  on: {
    error: (err, req, res) => {
      console.error(`Proxy error to ${ENTRY_URL}:`, err.message);
      res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    },
  },
}));
app.use('/api/reports', createProxyMiddleware({
  target: REPORT_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/reports': '' },
  on: {
    error: (err, req, res) => {
      console.error(`Proxy error to ${REPORT_URL}:`, err.message);
      res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    },
  },
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: {
      auth: AUTH_URL,
      parking: PARKING_URL,
      entry: ENTRY_URL,
      report: REPORT_URL,
    },
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'XWZ Parking Management System - API Gateway',
    version: '1.0.0',
    docs: '/api/docs',
    health: '/health',
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📚 Swagger docs: http://localhost:${PORT}/api/docs`);
});
