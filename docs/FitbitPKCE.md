# Fitbit OAuth 2.0 with PKCE Implementation Guide

## Overview
This document explains our implementation of OAuth 2.0 with PKCE (Proof Key for Code Exchange) for Fitbit authentication. PKCE adds an extra layer of security to the OAuth flow, particularly important for mobile and native applications.

## PKCE Generation
First, we generate the PKCE code verifier and challenge. The code verifier is a random string that will be used to prove we're the same app when exchanging the authorization code for tokens.

```javascript
function generatePKCE() {
  // Generate a random code verifier (high-entropy cryptographic random string)
  const code_verifier = crypto.randomBytes(32).toString('base64url');
  
  // Create code challenge using SHA256 (required by Fitbit OAuth2)
  const code_challenge = crypto
    .createHash('sha256')
    .update(code_verifier)
    .digest('base64url');
  
  return { code_verifier, code_challenge };
}
```

### How it works:
1. `code_verifier`: A random 32-byte string encoded in base64url
2. `code_challenge`: SHA256 hash of the verifier, also in base64url
3. We store the `code_verifier` in the session for later use

## Authorization Request
When initiating the OAuth flow, we include the code challenge in the authorization request:

```javascript
router.get('/auth', (req, res) => {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const redirectUri = 'http://localhost:3001/api/fitbit/callback';
  
  // Generate PKCE values
  const { code_verifier, code_challenge } = generatePKCE();

  // Store in session for later verification
  req.session.oauth = {
    state: crypto.randomBytes(32).toString('hex'),
    code_verifier,
    timestamp: Date.now()
  };

  // Construct authorization URL with PKCE parameters
  const authUrl = `https://www.fitbit.com/oauth2/authorize?` + 
    `response_type=code&` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scopes.join(' '))}&` +
    `state=${state}&` +
    `code_challenge=${code_challenge}&` +
    `code_challenge_method=S256&` +
    `prompt=consent`;

  res.json({ authUrl });
});
```

### Key Parameters:
- `code_challenge`: The hashed verifier
- `code_challenge_method=S256`: Specifies we're using SHA256
- `state`: Anti-CSRF token
- `prompt=consent`: Forces consent screen display

## Token Exchange
After the user authorizes, we exchange the authorization code for tokens using the original code verifier:

```javascript
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  const { code_verifier } = req.session.oauth;

  // Exchange code for tokens using PKCE verification
  const tokenResponse = await axios.post('https://api.fitbit.com/oauth2/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier  // Proves we're the same app that initiated the flow
    }).toString(),
    {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  const {
    access_token,
    refresh_token,
    expires_in,
    scope
  } = tokenResponse.data;
});
```

### Security Features:
1. **State Validation**: Prevents CSRF attacks
2. **PKCE Verification**: Prevents authorization code interception attacks
3. **Session Expiry**: OAuth session data expires after 5 minutes
4. **Secure Storage**: Tokens stored in server-side session

## Frontend Integration
The frontend handles the OAuth popup and message passing:

```javascript
const handleFitbitLogin = async () => {
  // Get auth URL from backend
  const response = await axios.get('/api/fitbit/auth', { 
    withCredentials: true
  });

  // Open popup for authorization
  const width = 600;
  const height = 800;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;
  
  const popup = window.open(
    response.data.authUrl,
    'Fitbit Authorization',
    `width=${width},height=${height},left=${left},top=${top}`
  );

  // Handle popup closure
  const pollTimer = setInterval(() => {
    if (!popup || popup.closed) {
      clearInterval(pollTimer);
      if (!fitbitData) {
        setLoading(false);
        setError('Authorization was cancelled');
      }
    }
  }, 500);
};
```

## Security Best Practices
1. Use HTTPS in production
2. Validate all OAuth parameters
3. Implement proper session management
4. Store tokens securely
5. Use state parameter to prevent CSRF
6. Implement token refresh mechanism
7. Handle errors gracefully

## Error Handling
The implementation includes comprehensive error handling:
- Invalid/expired sessions
- Authorization failures
- Network errors
- Token validation errors
- User cancellation

## References
- [Fitbit OAuth 2.0 Documentation](https://dev.fitbit.com/build/reference/web-api/authorization/)
- [OAuth 2.0 with PKCE](https://oauth.net/2/pkce/)
- [RFC 7636: PKCE](https://tools.ietf.org/html/rfc7636) 