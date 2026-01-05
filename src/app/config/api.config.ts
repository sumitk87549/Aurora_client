// In development (ng serve), the proxy.conf.json forwards '/api' to 'https://aurora-e5jl.onrender.com/api'
// In production (Vercel), the app uses the API_URL environment variable to connect to the backend.

export const API_URL = (window as any).API_URL || '/api';
