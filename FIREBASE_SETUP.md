# Firebase Authentication Setup Guide

This guide explains how to set up Firebase Authentication for the AiBook project.

## Development Mode (Current Setup)

The system is currently running in **development mode** with mock Firebase authentication. This allows you to test the authentication system without full Firebase credentials.

### Development Features
- ✅ Mock user authentication (`dev-user-123`)
- ✅ Role-based access control
- ✅ Tenant isolation
- ✅ User management APIs
- ✅ Permission system
- ✅ Custom token generation

## Production Setup

To enable full Firebase authentication in production, follow these steps:

### 1. Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `aiaccount-1c845`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable the desired sign-in providers:
   - ✅ Email/Password (already enabled)
   - ✅ Google (already enabled)
   - Optional: Facebook, Twitter, GitHub, etc.

### 2. Service Account Setup

1. Go to **Project Settings** → **Service accounts**
2. Click **Generate new private key**
3. Download the JSON file
4. Extract the following values:

```json
{
  "project_id": "aiaccount-1c845",
  "client_email": "firebase-adminsdk-xxx@aiaccount-1c845.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n..."
}
```

### 3. Environment Variables

Add these environment variables to your `.env` file:

```bash
# Firebase Configuration (Required for Production)
FIREBASE_PROJECT_ID="aiaccount-1c845"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@aiaccount-1c845.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Firebase Client Configuration (For Frontend)
FIREBASE_API_KEY="AIzaSyARfz_OTYhjNn7DI89xYG-x0KxWiLU16ak"
FIREBASE_AUTH_DOMAIN="aiaccount-1c845.firebaseapp.com"
FIREBASE_STORAGE_BUCKET="aiaccount-1c845.firebasestorage.app"
FIREBASE_MESSAGING_SENDER_ID="291129507535"
FIREBASE_APP_ID="1:291129507535:web:9c8e48c7b7baf57e1d81ba"

# Environment
NODE_ENV="production"
```

### 4. Firebase Rules Setup

Configure Firestore security rules (if using Firestore):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Tenant isolation rules
    match /tenants/{tenantId}/{document=**} {
      allow read, write: if request.auth != null 
        && request.auth.token.tenantId == tenantId;
    }
    
    // User management
    match /users/{userId} {
      allow read, write: if request.auth != null 
        && (request.auth.uid == userId || request.auth.token.role == 'ADMIN');
    }
  }
}
```

## Authentication Flow

### 1. User Registration

```bash
curl -X POST "http://localhost:3000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "name": "John Doe",
    "tenantId": "your-tenant-id"
  }'
```

### 2. User Login (Frontend)

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyARfz_OTYhjNn7DI89xYG-x0KxWiLU16ak",
  authDomain: "aiaccount-1c845.firebaseapp.com",
  projectId: "aiaccount-1c845",
  storageBucket: "aiaccount-1c845.firebasestorage.app",
  messagingSenderId: "291129507535",
  appId: "1:291129507535:web:9c8e48c7b7baf57e1d81ba"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Sign in user
const userCredential = await signInWithEmailAndPassword(auth, email, password);
const idToken = await userCredential.user.getIdToken();

// Use token for API calls
const response = await fetch('/api/v1/auth/profile', {
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'x-tenant-id': 'your-tenant-id'
  }
});
```

### 3. API Authentication

Include the Firebase ID token in API requests:

```bash
curl -X GET "http://localhost:3000/api/v1/auth/profile" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "x-tenant-id: your-tenant-id"
```

## Custom Claims

The system automatically sets custom claims for users:

```javascript
{
  "tenantId": "user-tenant-id",
  "role": "USER|ADMIN|SUPER_ADMIN",
  "permissions": ["account:read", "transaction:create", ...]
}
```

## Role-Based Permissions

### SUPER_ADMIN
- Create/manage all tenants
- Full system access
- User management across tenants

### ADMIN
- Manage current tenant
- User management within tenant
- Full accounting operations

### USER
- Standard accounting operations
- Read account information
- Create/update transactions

### VIEWER
- Read-only access
- View accounts and transactions

## Development Testing

### Test Token Generation
```bash
curl -X POST "http://localhost:3000/api/v1/auth/generate-test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "test-user-123",
    "tenantId": "default",
    "role": "USER"
  }'
```

### User Management
```bash
# List users
curl -X GET "http://localhost:3000/api/v1/auth/users" \
  -H "x-tenant-id: default"

# Update user role
curl -X PUT "http://localhost:3000/api/v1/auth/users/USER_ID/role" \
  -H "Content-Type: application/json" \
  -d '{"role": "ADMIN"}'
```

## Security Notes

1. **Private Key Security**: Never commit Firebase private keys to version control
2. **Environment Variables**: Use secure environment variable management in production
3. **Token Validation**: All API endpoints validate Firebase ID tokens
4. **Tenant Isolation**: Users can only access their assigned tenant data
5. **Role Enforcement**: API endpoints check user roles and permissions

## Troubleshooting

### Common Issues

1. **"Authentication service unavailable"**
   - Check Firebase project ID is set
   - Verify environment variables
   - Ensure Firebase APIs are enabled

2. **"Invalid token"**
   - Check token expiration
   - Verify token format
   - Ensure user exists in Firebase

3. **"Insufficient permissions"**
   - Check user role and permissions
   - Verify custom claims are set
   - Ensure tenant access is granted

### Enable Firebase APIs

In Google Cloud Console, ensure these APIs are enabled:
- Identity and Access Management (IAM) API
- Firebase Admin SDK API
- Cloud Firestore API (if using Firestore)

## Next Steps

1. Configure Firebase service account for production
2. Set up frontend Firebase SDK integration
3. Implement password reset functionality
4. Add multi-factor authentication (MFA)
5. Set up Firebase Analytics for user behavior tracking 