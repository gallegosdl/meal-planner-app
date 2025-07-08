import React from 'react';
import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ user, children }) {
  console.log('[PrivateRoute] received user:', user);

  if (!user) {
    console.warn('[PrivateRoute] BLOCKED: no user');
    return <Navigate to="/auth/error" />;
  }

  // Optional: if you want to block *only* guest users
  // if (user.guest) {
  //   console.warn('[PrivateRoute] BLOCKED: guest user');
  //   return <Navigate to="/auth/error" />;
  // }

  console.log('[PrivateRoute] ALLOWED: user:', user);
  return children;
}