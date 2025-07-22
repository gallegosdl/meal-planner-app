//src/components/BuildMealPlanWithPantryButton.jsx
import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import { getCardStyles, getTextStyles, getButtonStyles } from '../utils/styleUtils';

const BuildMealPlanWithPantryButton = ({ 
  onMealPlanGenerated, 
  cuisinePreferences, 
  formData, 
  detectedItems,
  isLoading,
  setIsLoading,
  setIsPantryModalOpen 
}) => {
  const [isBuildingWithPantry, setIsBuildingWithPantry] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { themeMode, currentTheme } = useTheme();

  // Generate theme-aware styles using the theme system PROPERLY
  const cardStyles = getCardStyles(themeMode, 'base', { layout: 'full' });
  const titleStyles = getTextStyles(themeMode, 'heading');
  const bodyStyles = getTextStyles(themeMode, 'body');
  
  // Use theme system button variants instead of inline styles
  const openPantryButtonStyles = getButtonStyles(themeMode, 'pantry_open');
  const buildButtonStyles = getButtonStyles(themeMode, 'pantry_build');

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
            background: themeMode === 'dark' ? '#1a1f2b' : '#ffffff',
            color: themeMode === 'dark' ? '#fff' : '#1f2937',
            border: themeMode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(31,41,55,0.1)',
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
            protein: formData.macros.protein || 50,
            carbs: formData.macros.carbs || 35,
            fat: formData.macros.fat || 15
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
          background: themeMode === 'dark' ? '#1a1f2b' : '#ffffff',
          color: themeMode === 'dark' ? '#fff' : '#1f2937',
          border: themeMode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(31,41,55,0.1)',
        },
      });
    } catch (error) {
      console.error('Error building meal plan with pantry:', error);
      
      if (error.response?.status === 401) {
        toast.error('Please log in to use pantry items in meal planning.', {
          duration: 4000,
          style: {
            background: themeMode === 'dark' ? '#1a1f2b' : '#ffffff',
            color: themeMode === 'dark' ? '#fff' : '#1f2937',
            border: themeMode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(31,41,55,0.1)',
          },
        });
      } else {
        toast.error('Failed to generate meal plan with pantry items. Please try again.', {
          duration: 4000,
          style: {
            background: themeMode === 'dark' ? '#1a1f2b' : '#ffffff',
            color: themeMode === 'dark' ? '#fff' : '#1f2937',
            border: themeMode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(31,41,55,0.1)',
          },
        });
      }
    } finally {
      setIsBuildingWithPantry(false);
      setIsLoading(false);
    }
  };

  return (
    <div className={cardStyles}>
      <div className="flex justify-between items-center mb-2">
        <h3 className={`text-lg font-semibold ${currentTheme.text.primary}`}>Plan with Pantry</h3>
        <button 
          onClick={() => setIsPantryModalOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={openPantryButtonStyles}
        >
          Open Pantry
        </button>
      </div>
      <p className={`text-sm ${currentTheme.text.secondary} mb-4`}>
        🍽️ Manage your pantry items and generate meal plans with them as preferred ingredients.
      </p>
      <button
        onClick={handleBuildMealPlanWithPantry}
        disabled={isBuildingWithPantry || isLoading}
        className={buildButtonStyles}
      >
        {isBuildingWithPantry ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
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