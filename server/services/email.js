// This is a stub for email functionality
// TODO: Implement actual email sending with a service like SendGrid or AWS SES

/**
 * Send a verification email to a user
 * @param {string} email - The user's email address
 * @param {string} token - The verification token
 * @returns {Promise<void>}
 */
const sendVerificationEmail = async (email, token) => {
  // For now, just log the verification link
  console.log('Verification email would be sent to:', email);
  console.log('Verification token:', token);
  console.log('Verification link would be:', `http://localhost:3000/verify/${token}`);
  
  // Return a resolved promise since we're not actually sending an email
  return Promise.resolve();
};

module.exports = {
  sendVerificationEmail
}; 