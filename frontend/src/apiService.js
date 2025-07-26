// frontend/src/apiService.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

const apiClient = axios.create({
  baseURL: API_BASE_URL, // Should be http://34.83.108.47:5000
  headers: {
    'X-API-KEY': API_KEY,
    'Content-Type': 'application/json'
  }
});

// Use the full path from the base URL
export const getSignals = () => apiClient.get('/api/signals');
export const getRules = () => apiClient.get('/api/rules');
export const saveRule = (ruleData) => apiClient.post('/api/rules', ruleData);