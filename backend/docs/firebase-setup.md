# Firebase Custom Claims Setup

This document describes how to configure Firebase Custom Claims for use with the LINAW backend.

## Overview

The LINAW backend requires certain claims to be present in Firebase ID tokens to properly authenticate users and assign them to tenants. These claims are set using the Firebase Admin SDK and must be configured during user creation or later via your Firebase management interface.

## Required Custom Claims

Every user must have the following custom claims in their Firebase ID token:

```json
{
  "uid": "user-unique-identifier",
  "email": "user@example.com",
  "tenantId": "tenant-uuid-here",
  "role": "user"
}
```

### Claim Descriptions

| Claim | Required | Description | Example |
|-------|----------|-------------|---------|
| `uid` | Yes | User's unique Firebase UID | `"abc123xyz789"` |
| `email` | Yes | User's email address | `"john@example.com"` |
| `tenantId` | No* | Tenant UUID the user belongs to | `"550e8400-e29b-41d4-a716-446655440000"` |
| `role` | No | User's role in the system | `"user"`, `"admin"`, `"owner"` |

*`tenantId` is optional during signup. If not present, the system will create a default tenant if `DEFAULT_TENANT_ENABLED=true` in `.env`.

## Setting Custom Claims

### Method 1: During User Signup (Recommended)

Use the Firebase Admin SDK to set custom claims when creating a user:

```javascript
const admin = require('firebase-admin');

const uid = 'user-unique-id';
const tenantId = 'tenant-uuid'; // or null to use default tenant

await admin.auth().setCustomUserClaims(uid, {
  tenantId,
  role: 'user'
});
```

### Method 2: Via Firebase Console

1. Go to Firebase Console → Authentication → Users
2. Select a user and click "Custom Claims"
3. Add the following JSON:

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "role": "user"
}
```

### Method 3: Firebase Admin Dashboard or CLI

Use the Firebase Admin SDK in a script to batch-set claims:

```bash
npx firebase-admin --set-custom-claims <uid> '{"tenantId":"<uuid>","role":"user"}'
```

## Backend Validation

The backend validates these claims in `middleware/authenticate.js`:

```javascript
// Required claims
if (!decodedToken.uid) {
  throw new AppError('Missing uid claim', 401, 'INVALID_TOKEN');
}
if (!decodedToken.email) {
  throw new AppError('Missing email claim', 401, 'INVALID_TOKEN');
}

// Optional claims
const tenantId = decodedToken.tenantId;
const role = decodedToken.role || 'user';
```

## Tenant Assignment Strategy

See [tenant-strategy.md](./tenant-strategy.md) for details on how tenants are assigned during signup.

## Testing Custom Claims

To test custom claims in development:

1. Create a test user in Firebase Console
2. Set custom claims using Method 1 or 2
3. Get the user's ID token:

```javascript
const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
const token = await userCredential.user.getIdToken();
console.log(token);
```

4. Decode the token at [jwt.io](https://jwt.io) to verify custom claims are present

## Troubleshooting

### "Missing uid claim" error
- Ensure Firebase Custom Claims include `uid` field
- Verify the user's Firebase token is fresh (old tokens may not have updated claims)

### "Missing email claim" error
- Ensure Firebase Custom Claims include `email` field
- Check that `email_verified` is `true` in Firebase console

### "Invalid Token" when tenantId is missing
- If `DEFAULT_TENANT_ENABLED=true`, a default tenant will be created
- Or manually set `tenantId` custom claim for the user

## Security Considerations

1. **Never store secrets in custom claims** — use environment variables instead
2. **Use role-based access control** — check the `role` claim in authorization middleware
3. **Validate claims server-side** — always verify custom claims in backend middleware, don't trust client-side claims
4. **Rotate service accounts** — regularly rotate Firebase service account credentials
