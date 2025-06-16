import React from 'react';

const Terms = () => {
  return (
    <div className="w-full p-4 sm:p-8 text-base sm:text-lg text-gray-300">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Terms of Service
        </h1>
        <p className="mb-4 sm:mb-6"><strong>Effective Date:</strong> June 16, 2025</p>
        <p className="mb-4 sm:mb-6">Welcome to the Meal Planner AI App. By accessing or using this application, you agree to be bound by the following terms and conditions:</p>
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2 sm:mb-4">1. Usage</h2>
          <p>This app is provided as-is, intended for personal use to generate meal plans based on Fitbit activity, dietary preferences, and macro goals. We do not guarantee accuracy or completeness of nutrition information.</p>
        </section>
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2 sm:mb-4">2. Data</h2>
          <p>Your Fitbit activity data is used solely to generate personalized meal suggestions. We do not share or sell your data to third parties.</p>
        </section>
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2 sm:mb-4">3. No Medical Advice</h2>
          <p>This app does not provide medical advice. Consult a healthcare professional before making any changes to your diet or exercise routine.</p>
        </section>
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2 sm:mb-4">4. Changes</h2>
          <p>We may update these terms at any time. Continued use of the application constitutes acceptance of the new terms.</p>
        </section>
        <p className="mt-6 sm:mt-8">
          If you have questions about these terms, contact: <a href="mailto:support@mealplanner.ai" className="text-blue-400 hover:text-blue-300 break-all">support@mealplanner.ai</a>
        </p>
      </div>
    </div>
  );
};

export default Terms;
