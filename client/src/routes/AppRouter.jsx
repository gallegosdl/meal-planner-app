import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MealPlannerForm from '../components/MealPlannerForm';
import OAuthError from '../components/OAuthError';
import FitbitDisplay from '../components/FitbitDisplay';
import StravaDisplay from '../components/StravaDisplay';

export default function AppRouter({ user, setUser, handleLogout }) {
  return (
    <Routes>
      <Route path="/auth/error" element={<OAuthError />} />
      
      <Route
        path="/"
        element={
          <MealPlannerForm
            user={user}
            setUser={setUser}
            handleLogout={handleLogout}
          />
        }
      />
      
      <Route
        path="/fitbit"
        element={<FitbitDisplay user={user} />}
      />
      
      <Route
        path="/strava"
        element={<StravaDisplay user={user} />}
      />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
