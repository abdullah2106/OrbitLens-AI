import axios from 'axios';

// All API requests go through the Vite dev-server proxy (vite.config.js).
// The proxy rule '/api' rewrites to '' before forwarding to http://localhost:8000,
// so FastAPI receives the original path (e.g. /upload/sample, /anomalies).
//
// Using a fixed '/api' baseURL means this works unconditionally -- no dependency
// on VITE_API_URL being defined or the .env file being loaded before the dev
// server starts.
const client = axios.create({
  baseURL: '/api',
});

export default client;
