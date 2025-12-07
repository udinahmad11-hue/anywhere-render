const express = require('express');
const cors_proxy = require('cors-anywhere');

const app = express();

// Konfigurasi CORS Anywhere
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 3000;

// Create CORS Anywhere server
const proxy = cors_proxy.createServer({
  originWhitelist: [], // Allow all origins
  requireHeader: [], // No headers required
  removeHeaders: [
    'cookie',
    'cookie2',
    'x-request-start',
    'x-request-id',
    'via',
    'connect-time',
    'total-route-time'
  ],
  redirectSameOrigin: true,
  httpProxyOptions: {
    xfwd: false,
    secure: false // Allow HTTP targets
  }
});

// Handler khusus untuk format https://render.com/https://url-target.mpd
app.get('/https://:url*', (req, res) => {
  const targetUrl = 'https://' + req.params.url + req.params[0];
  req.url = `/${targetUrl}`;
  proxy.emit('request', req, res);
});

// Handler untuk semua request lainnya
app.use((req, res) => {
  proxy.emit('request', req, res);
});

// Start server
app.listen(port, host, () => {
  console.log(`CORS Anywhere server running on ${host}:${port}`);
  console.log('Example usage:');
  console.log(`  https://your-app.onrender.com/https://example.com/video.mpd`);
});
