import http from 'http';
import { URL } from 'url';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Cache implementation
const cache: { [key: string]: { data: any; expiry: number } } = {};
const CACHE_EXPIRY_TIME = 2 * 60 * 1000; // 2 minutes

// Create a map of service URLs
const serviceMap: { [key: string]: string } = {
  product: process.env.PRODUCT_SERVICE_URL || '',
  cart: process.env.CART_SERVICE_URL || '',
};

// Function to forward the request to the appropriate service
// @ts-ignore
const forwardRequest = async (req: http.IncomingMessage, res: http.ServerResponse, targetUrl: string) => {
  const url = new URL(req.url || '', targetUrl);

  // Check if the request is for the getProductsList endpoint and use cache
  if (req.method === 'GET' && url.pathname === '/getProductsList') {
    const cacheKey = 'getProductsList';

    // Check if we have a valid cache entry
    if (cache[cacheKey] && cache[cacheKey].expiry > Date.now()) {
      console.log('Serving from cache');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(cache[cacheKey].data));
    }

    // If no valid cache, fetch data from Product Service
    try {
      const response = await fetch(url.href, {
        method: req.method,
        headers: req.headers as Record<string, string>,
      });

      const data = await response.json();

      // Store in cache with expiry
      cache[cacheKey] = { data, expiry: Date.now() + CACHE_EXPIRY_TIME };

      res.writeHead(response.status, response.headers.raw());
      res.end(JSON.stringify(data));
    } catch (error) {
      console.error('Error forwarding request:', error);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Cannot process request' }));
    }
    return;
  }

  // Forward other requests without caching
  try {
    const response = await fetch(url.href, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
    });

    res.writeHead(response.status, response.headers.raw());
    response.body?.pipe(res);
  } catch (error) {
    console.error('Error forwarding request:', error);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Cannot process request' }));
  }
};

// Create the HTTP server
const server = http.createServer((req, res) => {
  const [_, serviceName] = req.url?.split('/') || [];

  if (serviceMap[serviceName]) {
    forwardRequest(req, res, serviceMap[serviceName]);
  } else {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Cannot process request' }));
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`BFF Service running at http://localhost:${PORT}/`);
});
