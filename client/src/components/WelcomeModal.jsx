import React, { useState } from 'react';

const WelcomeModal = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#252B3B] rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-[#ffffff1a]">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Welcome to Meal Planner AI
          </h2>
          <p className="text-gray-400 mt-2">
            Your personal AI-powered nutrition assistant
          </p>
        </div>

        {/* Content */}
        <div className="space-y-4 text-gray-300">
          <section>
            <h3 className="text-lg font-semibold text-white mb-2">About Meal Planner</h3>
            <p>
              Meal Planner AI is designed to help you achieve your health and dietary goals 
              through personalized meal planning. Our AI-powered system takes into account your:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Cuisine preferences</li>
              <li>Dietary restrictions and goals</li>
              <li>Favorite foods and ingredients</li>
              <li>Foods you want to avoid</li>
              <li>Budget constraints</li>
              <li>Nutritional targets</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">Getting Started</h3>
            <div className="bg-[#1a1f2b] rounded-lg p-4">
              <p className="text-yellow-400 mb-2">⚠️ Important:</p>
              <p>
                To use Meal Planner AI, you'll need to provide your OpenAI API key. 
                This key allows our system to generate personalized meal plans using AI technology.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">Key Features</h3>
            <ul className="list-disc ml-6 space-y-1">
              <li>Personalized meal recommendations</li>
              <li>Automatic grocery lists</li>
              <li>Multiple view options (Calendar, Tiles, Detailed)</li>
              <li>Store price comparisons</li>
              <li>Recipe library</li>
              <li>Instacart integration</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-gray-400">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded bg-[#1a1f2b] border-gray-600 text-blue-500 focus:ring-blue-500"
            />
            Don't show this again
          </label>
          
          <button
            onClick={() => onClose(dontShowAgain)}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg text-white font-medium hover:from-blue-600 hover:to-indigo-600 transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal; 