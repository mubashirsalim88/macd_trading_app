// frontend/src/apiService.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-API-KEY': API_KEY,
    'Content-Type': 'application/json'
  }
});

// ✅ NEW FUNCTION
export const getConfig = () => apiClient.get('/api/config');

export const getSignals = () => apiClient.get('/api/signals');
export const getRules = () => apiClient.get('/api/rules');
export const saveRule = (ruleData) => apiClient.post('/api/rules', ruleData);
export const updateRule = (ruleId, ruleData) => apiClient.put(`/api/rules/${ruleId}`, ruleData);
export const deleteRule = (ruleId) => apiClient.delete(`/api/rules/${ruleId}`);