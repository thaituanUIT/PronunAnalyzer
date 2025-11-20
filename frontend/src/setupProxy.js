// Source - https://stackoverflow.com/a
// Posted by josipat, modified by community. See post 'Timeline' for change history
// Retrieved 2025-11-19, License - CC BY-SA 4.0

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
    })
  );
};
