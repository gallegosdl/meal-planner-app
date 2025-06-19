import React from 'react';

function FitbitSuccess() {
  const params = new URLSearchParams(window.location.search);
  const profile = params.get('profile') ? JSON.parse(decodeURIComponent(params.get('profile'))) : null;

  if (!profile) return <div>No profile data found.</div>;

  return (
    <div>
      <h2>Fitbit Profile</h2>
      <img src={profile.avatar} alt="Fitbit avatar" />
      <p><strong>Name:</strong> {profile.displayName}</p>
      <p><strong>Member Since:</strong> {profile.memberSince}</p>
      <p><strong>Age:</strong> {profile.age}</p>
      <p><strong>Gender:</strong> {profile.gender}</p>
    </div>
  );
}

export default FitbitSuccess;
