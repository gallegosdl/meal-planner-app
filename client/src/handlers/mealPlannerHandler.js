import api from '../services/api';

export const mealPlannerHandler = {
  generateMealPlan: async (preferences) => {
    try {
      const response = await api.post('/api/meal-plan/generate', preferences);
      return response.data;
    } catch (error) {
      throw new Error('Failed to generate meal plan: ' + error.message);
    }
  },

  saveMealPlan: async (mealPlan) => {
    try {
      const response = await api.post('/api/meal-plan/save', mealPlan);
      return response.data;
    } catch (error) {
      throw new Error('Failed to save meal plan: ' + error.message);
    }
  },

  getUserMealPlans: async () => {
    try {
      const response = await api.get('/api/meal-plan/user');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch user meal plans: ' + error.message);
    }
  },

  updateMealPlan: async (mealPlanId, updates) => {
    try {
      const response = await api.put(`/api/meal-plan/${mealPlanId}`, updates);
      return response.data;
    } catch (error) {
      throw new Error('Failed to update meal plan: ' + error.message);
    }
  }
}; 