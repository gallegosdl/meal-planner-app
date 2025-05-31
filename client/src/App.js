import React from 'react';
import { Toaster } from 'react-hot-toast';
import MealPlannerForm from './components/MealPlannerForm';

function App() {
  return (
    <div className="App">
      <MealPlannerForm />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#2A3142',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#4ade80',
              secondary: '#2A3142',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#2A3142',
            },
          },
        }}
      />
    </div>
  );
}

export default App; 