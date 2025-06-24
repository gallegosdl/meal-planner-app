import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const BuildMealPlanWithPantryButton = ({ 
  onMealPlanGenerated, 
  cuisinePreferences, 
  formData, 
  detectedItems,
  isLoading,
  setIsLoading 
}) => {
  const [isBuildingWithPantry, setIsBuildingWithPantry] = useState(false);

  const handleBuildMealPlanWithPantry = async () => {
    try {
      setIsBuildingWithPantry(true);
      setIsLoading(true);

      // First, fetch the user's pantry items
      const pantryResponse = await api.get('/api/pantry');
      const pantryData = pantryResponse.data;
      
      // Extract all pantry item names
      const pantryItems = Object.values(pantryData)
        .flat()
        .map(item => item.item_name)
        .filter(Boolean);
      
      console.log('Building meal plan with pantry items:', pantryItems);

      if (pantryItems.length === 0) {
        toast.error('No pantry items found. Please add some items to your pantry first.', {
          duration: 4000,
          style: {
            background: '#1a1f2b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        });
        return;
      }

      const payload = {
        preferences: {
          cuisinePreferences: Object.fromEntries(
            Object.entries(cuisinePreferences).filter(([_, value]) => value > 0)
          ),
          dietGoals: formData.dietGoals || [],
          likes: pantryItems, // Use pantry items as preferred foods
          dislikes: formData.dislikes.split(',').map(item => item.trim()).filter(Boolean),
          macros: {
            protein: formData.macros.protein || 30,
            carbs: formData.macros.carbs || 40,
            fat: formData.macros.fat || 30
          },
          mealsPerWeek: {
            breakfast: formData.mealsPerWeek.breakfast || 5,
            lunch: formData.mealsPerWeek.lunch || 5,
            dinner: formData.mealsPerWeek.dinner || 5
          },
          budget: formData.budget || 75
        },
        ingredients: detectedItems || [],
        pantryItems: pantryItems // Include pantry items separately for backend processing
      };

      console.log('Sending payload with pantry items:', JSON.stringify(payload, null, 2));

      const response = await api.post('/api/generate-meal-plan', payload);
      console.log('Server response:', response);
      
      if (onMealPlanGenerated) {
        onMealPlanGenerated(response.data);
      }
      
      toast.success(`Meal Plan Generated with ${pantryItems.length} Pantry Items! Scroll down to view your Personalized Plan.`, {
        duration: 4000,
        icon: '🍽️',
        style: {
          background: '#1a1f2b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      });
    } catch (error) {
      console.error('Error building meal plan with pantry:', error);
      
      if (error.response?.status === 401) {
        toast.error('Please log in to use pantry items in meal planning.', {
          duration: 4000,
          style: {
            background: '#1a1f2b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        });
      } else {
        toast.error('Failed to generate meal plan with pantry items. Please try again.', {
          duration: 4000,
          style: {
            background: '#1a1f2b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        });
      }
    } finally {
      setIsBuildingWithPantry(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
      <h3 className="text-lg font-semibold text-white mb-2">🍽️ Build with Pantry Items</h3>
      <p className="text-sm text-gray-400 mb-4">
        Generate a meal plan using your pantry items as preferred ingredients
      </p>
      <button
        onClick={handleBuildMealPlanWithPantry}
        disabled={isBuildingWithPantry || isLoading}
        className="w-full py-3 px-4 bg-[#111827]/50 text-green-200 font-semibold border border-green-400/40 rounded-xl shadow-[0_0_8px_1px_rgba(0,255,255,0.25)] hover:bg-[#1e293b]/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 backdrop-blur"
      >
        {isBuildingWithPantry ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Building with Pantry...
          </>
        ) : (
          <>
            Build Meal Plan with Pantry Items
          </>
        )}
      </button>
    </div>
  );
};

export default BuildMealPlanWithPantryButton; 