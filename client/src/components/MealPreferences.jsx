import React from 'react';

const MealPreferences = ({ formData, handleChange }) => (
  <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f] min-h-[200px] h-full">
    <h2 className="text-xl font-semibold text-white mb-4">Meal Preferences</h2>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Foods You Like
        </label>
        <input
          type="text"
          value={formData.likes}
          onChange={(e) => handleChange('likes', e.target.value)}
          placeholder="e.g. Chicken, Rice, Broccoli"
          className="w-full px-4 py-2 bg-[#374151] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Foods to Avoid
        </label>
        <input
          type="text"
          value={formData.dislikes}
          onChange={(e) => handleChange('dislikes', e.target.value)}
          placeholder="e.g. Mushrooms, Seafood"
          className="w-full px-4 py-2 bg-[#374151] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
    </div>
  </div>
);

export default MealPreferences; 