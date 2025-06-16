import React from 'react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-[#252B3B] text-gray-300 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-6">
          Privacy Policy
        </h1>
        
        <p className="mb-6"><strong>Effective Date:</strong> June 16, 2025</p>

        <p className="mb-6">This privacy policy explains how the Meal Planner AI App ("we", "our", "us") handles your data.</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">1. Information Collected</h2>
          <ul className="list-disc ml-6 space-y-2">
            <li>Fitbit profile data (e.g., age, weight, gender)</li>
            <li>Activity and health metrics (e.g., steps, calories burned, heart rate zones)</li>
            <li>Preferences manually entered by you (e.g., dietary likes/dislikes, macro targets)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">2. How We Use Your Data</h2>
          <p>We use your data to generate personalized meal plans and nutritional recommendations. Data is not used for advertising or sold to third parties.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">3. Data Security</h2>
          <p>All data is encrypted during transmission. We implement basic security practices to protect your information.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">4. Third-Party Services</h2>
          <p>We may use third-party services like Fitbit APIs and Instacart integrations. Their data handling policies apply as well.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">5. Your Rights</h2>
          <p>You may request deletion of your data at any time by contacting us.</p>
        </section>

        <p className="mt-8">
          Contact: <a href="mailto:support@mealplanner.ai" className="text-blue-400 hover:text-blue-300">support@mealplanner.ai</a>
        </p>
      </div>
    </div>
  );
};

export default Privacy;
