import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import Layout from '../components/Layout';

// Views
import MealPlanner from '../views/MealPlanner';
import RecipeLibrary from '../views/RecipeLibrary';
import Profile from '../views/Profile';
import OAuthError from '../components/OAuthError';

const AppRouter = ({ user }) => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/auth/error" element={<OAuthError />} />
      
      {/* Protected routes - all wrapped in Layout */}
      <Route element={<Layout />}>
        <Route path="/" element={
          <PrivateRoute user={user}>
            <MealPlanner />
          </PrivateRoute>
        } />
        <Route path="/recipes" element={
          <PrivateRoute user={user}>
            <RecipeLibrary />
          </PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute user={user}>
            <Profile />
          </PrivateRoute>
        } />
      </Route>
    </Routes>
  );
};

export default AppRouter; 