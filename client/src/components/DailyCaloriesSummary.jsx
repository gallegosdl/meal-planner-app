import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const DailyCaloriesSummary = ({ calorieStats }) => {
  const { themeMode, currentTheme } = useTheme();

  return (
    <div className="h-full">
      {/* Calorie Summary Section */}
      {(calorieStats.meals > 0 || calorieStats.totalBurned > 0) ? (
        <div className="space-y-4 h-full">
          {/* Summary Text */}
          <div className={`${currentTheme.backgrounds.primary.elevated} rounded-lg p-4 border ${currentTheme.borders.primary}`}>
            <p className={`${currentTheme.text.secondary} text-sm leading-relaxed`}>
              <span className={`font-bold ${currentTheme.text.primary}`}>Daily Summary:</span> You consumed{' '}
              <span className="text-blue-400">{calorieStats.meals} cal</span> and burned{' '}
              <span className="text-green-400">{calorieStats.totalBurned} cal</span>{' '}
              ({calorieStats.fitbit > 0 && <span>{calorieStats.fitbit} Fitbit</span>}
              {calorieStats.fitbit > 0 && calorieStats.strava > 0 && ' + '}
              {calorieStats.strava > 0 && <span>{calorieStats.strava} Strava</span>}), resulting in a{' '}
              <span className={`${calorieStats.net < 0 ? 'text-red-400' : 'text-yellow-400'} font-medium`}>
                {calorieStats.net < 0 ? 'Deficit' : 'Surplus'} of {Math.abs(calorieStats.net)} cal
              </span> for today.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className={`w-full h-2 ${currentTheme.backgrounds.secondary.base} rounded-full overflow-hidden`}>
              <div 
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (calorieStats.meals / calorieStats.target) * 100)}%` }}
              />
            </div>
            {/* FIXED PROGRESS BAR TEXT VISIBILITY */}
            <p className={`text-xs text-right font-medium ${themeMode === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              Meals: {((calorieStats.meals / calorieStats.target) * 100).toFixed(0)}% of target
            </p>
          </div>

          {/* Stats Grid - IMPROVED CONTRAST */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className={`${currentTheme.backgrounds.secondary.elevated} rounded-lg p-3 border ${themeMode === 'light' ? 'border-gray-200' : 'border-transparent'}`}>
              <p className={`text-xs font-medium ${themeMode === 'light' ? 'text-gray-600' : currentTheme.text.caption}`}>Meals</p>
              <p className="text-lg font-medium text-blue-400">{calorieStats.meals} cal</p>
            </div>
            <div className={`${currentTheme.backgrounds.secondary.elevated} rounded-lg p-3 border ${themeMode === 'light' ? 'border-gray-200' : 'border-transparent'}`}>
              <p className={`text-xs font-medium ${themeMode === 'light' ? 'text-gray-600' : currentTheme.text.caption}`}>Burned</p>
              <p className="text-lg font-medium text-green-400">{calorieStats.totalBurned} cal</p>
            </div>
            <div className={`${currentTheme.backgrounds.secondary.elevated} rounded-lg p-3 border ${themeMode === 'light' ? 'border-gray-200' : 'border-transparent'}`}>
              <p className={`text-xs font-medium ${themeMode === 'light' ? 'text-gray-600' : currentTheme.text.caption}`}>Net</p>
              <p className={`text-lg font-medium ${calorieStats.net < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                {calorieStats.net} cal
              </p>
            </div>
            <div className={`${currentTheme.backgrounds.secondary.elevated} rounded-lg p-3 border ${themeMode === 'light' ? 'border-gray-200' : 'border-transparent'}`}>
              <p className={`text-xs font-medium ${themeMode === 'light' ? 'text-gray-600' : currentTheme.text.caption}`}>Target Balance</p>
              <p className="text-lg font-medium text-purple-400">{calorieStats.balance} cal</p>
            </div>
          </div>

          {/* Insight Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-blue-400 text-xl">💡</span>
              <div>
                <p className="text-sm text-blue-400 font-medium">Daily Insight</p>
                <p className={`text-sm ${currentTheme.text.secondary} mt-1`}>
                  {calorieStats.net < 0 ? (
                    <>You're in a {Math.abs(calorieStats.net)} cal deficit today. This may lead to ~{(Math.abs(calorieStats.net) / 3500 * 1).toFixed(2)} lbs weight loss if maintained.</>
                  ) : (
                    <>You're in a {calorieStats.net} cal surplus today. Consider {calorieStats.net > 500 ? 'increasing' : 'maintaining'} your activity level to meet your goals.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center px-6">
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl p-8 border border-blue-500/20">
            <div className="text-4xl mb-4">🏃‍♂️ 📊</div>
            <h3 className={`text-xl font-semibold ${currentTheme.text.primary} mb-3`}>Ready to Start Your Journey?</h3>
            <p className={`${currentTheme.text.secondary} text-sm leading-relaxed mb-6`}>
              Time to turn those goals into reality! Generate your meal plan and connect your fitness trackers to see your daily metrics come to life.
            </p>
            <div className={`space-y-3 text-sm ${currentTheme.text.secondary}`}>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Generate a meal plan to track your nutrition</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Connect Fitbit or Strava to log your activities</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Watch your daily metrics transform!</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyCaloriesSummary; 