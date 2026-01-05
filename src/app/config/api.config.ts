// In development (ng serve), the proxy.conf.json forwards '/api' to 'http://localhost:8081/api'
// In production (bundled), the app is served from the same origin, so '/api' works natively.

export const API_URL = '/api';
