const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CORS Proxy Server is running!',
    usage: 'GET /proxy/https://example.com/video.mpd',
    status: 'active'
  });
});

// Simple proxy endpoint
app.get('/proxy/*', async (req, res) => {
  try {
    const targetUrl = req.url.replace('/proxy/', '');
    
    // Validate URL
    if (!targetUrl.startsWith('http')) {
      return res.status(400).json({
        error: 'Invalid URL. Must start with http:// or https://'
      });
    }

    // Create proxy middleware
    const proxy = createProxyMiddleware({
      target: targetUrl,
      changeOrigin: true,
      followRedirects: true,
      pathRewrite: {
        '^/proxy/': '' // Remove /proxy/ prefix
      },
      onProxyReq: (proxyReq, req, res) => {
        // Remove/replace headers
        proxyReq.removeHeader('referer');
        proxyReq.removeHeader('origin');
        proxyReq.setHeader('user-agent', 'Mozilla/5.0 CORS-Proxy');
      },
      onProxyRes: (proxyRes, req, res) => {
        // Add CORS headers
        proxyRes.headers['access-control-allow-origin'] = '*';
        proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        proxyRes.headers['access-control-allow-headers'] = '*';
        
        // Remove problematic headers
        delete proxyRes.headers['content-security-policy'];
        delete proxyRes.headers['x-frame-options'];
      },
      timeout: 30000 // 30 seconds timeout
    });

    return proxy(req, res);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Proxy failed',
      message: error.message
    });
  }
});

// Handle direct URL access (your requested format)
app.get('/https/:url(*)', (req, res) => {
  const fullUrl = `https://${req.params.url}`;
  
  // Redirect to proxy endpoint
  res.redirect(`/proxy/${fullUrl}`);
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test URL: http://localhost:${PORT}/`);
  console.log(`Example: http://localhost:${PORT}/proxy/https://example.com/video.mpd`);
});
