import axios from 'axios';
import { supabase } from './supabase';

// Backend API base URL - change this to your deployed backend
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for image uploads
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

export interface AnalyzeFoodRequest {
  image: string; // base64 encoded
  metadata?: {
    timestamp?: string;
    location?: string;
  };
}

export interface AnalyzeFoodResponse {
  food_item: string;
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  confidence_score?: number;
  image_url?: string;
}

export interface DailySummaryResponse {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  goal_calories: number;
  goal_protein: number;
  goal_carbs: number;
  goal_fat: number;
  meal_count: number;
  meals: any[];
}

class ApiService {
  async analyzeFood(data: AnalyzeFoodRequest): Promise<AnalyzeFoodResponse> {
    try {
      const response = await api.post('/analyze-food', data);
      return response.data;
    } catch (error) {
      console.error('Error analyzing food:', error);
      throw error;
    }
  }

  async getDailySummary(date: string): Promise<DailySummaryResponse> {
    try {
      const response = await api.get(`/summary?date=${date}`);
      return response.data;
    } catch (error) {
      console.error('Error getting daily summary:', error);
      throw error;
    }
  }

  async getMeals(startDate?: string, endDate?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const response = await api.get(`/meals?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error getting meals:', error);
      throw error;
    }
  }

  async addWeight(weight: number, date: string): Promise<void> {
    try {
      await api.post('/weight', { weight, date });
    } catch (error) {
      console.error('Error adding weight:', error);
      throw error;
    }
  }

  async getWeights(startDate?: string, endDate?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const response = await api.get(`/weights?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error getting weights:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
export { api };