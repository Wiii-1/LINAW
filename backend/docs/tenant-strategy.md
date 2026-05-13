# Tenant Assignment Strategy

This document describes how tenants are assigned to users in the LINAW system.

## Overview

The LINAW backend supports multi-tenant isolation. Each user belongs to exactly one tenant, and all database operations are scoped to that tenant. Tenant assignment can happen in two ways:

1. **Firebase Custom Claims** (recommended)
2. **Default Tenant Creation** (fallback)

## Strategy 1: Firebase Custom Claims (Recommended)

### How It Works

When a user signs up, the backend checks their Firebase ID token for a `tenantId` custom claim:

```javascript
// In middleware/authenticate.js
const tenantId = decodedToken.tenantId; // From Firebase Custom Claims
```

If `tenantId` is present, the user is assigned to that tenant immediately.

### Setup

1. Configure Firebase Custom Claims before signup (see [firebase-setup.md](./firebase-setup.md))
2. Set `tenantId` in custom claims for each user:

```javascript
const admin = require('firebase-admin');
const tenantId = '550e8400-e29b-41d4-a716-446655440000'; // Your tenant UUID

await admin.auth().setCustomUserClaims(uid, {
  tenantId,
  role: 'user'
});
```

3. User signup flow:
   - POST `/api/v1/signup` with email and password
   - Backend verifies Firebase token includes `tenantId` claim
   - User is created with that `tenant_id` in database

### Advantages

- ✅ Explicit tenant assignment (no guessing)
- ✅ Tenant can be changed via Firebase Admin console
- ✅ Works for multi-tenant SaaS scenarios
- ✅ Centralized control (Firebase is source of truth)

### Disadvantages

- ⚠️ Requires Firebase Custom Claims setup before user signup
- ⚠️ Tenant change requires Firebase Admin SDK call
- ⚠️ Not suitable for single-tenant applications

## Strategy 2: Default Tenant Creation (Fallback)

### How It Works

If `tenantId` is missing from Firebase Custom Claims, the backend creates a default tenant for the user:

```javascript
// In service/application/userService.js
if (!user.tenantId) {
  tenantId = await createDefaultTenant(email);
}
```

A new tenant row is inserted into the `tenants` table with:
- `tenant_id`: Generated UUID
- `tenant_name`: User's email domain or username
- `created_at`: Current timestamp

### Enabling/Disabling

Set in `.env`:

```bash
# Enable default tenant creation
DEFAULT_TENANT_ENABLED=true

# Disable default tenant creation (will fail signup if tenantId missing)
DEFAULT_TENANT_ENABLED=false
```

### Signup Flow

1. User calls POST `/api/v1/signup`
2. Backend verifies Firebase token
3. If `tenantId` missing and `DEFAULT_TENANT_ENABLED=true`:
   - Create new tenant row in database
   - Assign user to that tenant
4. User created with auto-assigned `tenant_id`

### Advantages

- ✅ Simple setup (no pre-configuration needed)
- ✅ Works for single-tenant or tenant-per-user scenarios
- ✅ Users can signup without Firebase Custom Claims setup
- ✅ Good for early development/prototyping

### Disadvantages

- ⚠️ Creates new tenant per user (not suitable for multi-tenant SaaS)
- ⚠️ User cannot change tenants after signup
- ⚠️ Requires database migration to exist

## Comparison Table

| Feature | Firebase Custom Claims | Default Tenant Creation |
|---------|------------------------|------------------------|
| Setup Complexity | High (Firebase config needed) | Low (default behavior) |
| Multi-tenant SaaS | ✅ Yes | ❌ No |
| Tenant per User | ❌ No | ✅ Yes |
| Tenant Change | ✅ Via Firebase | ❌ Manual DB edit only |
| Signup Flow | Requires pre-configured claims | Works out-of-box |
| Best For | Multi-tenant systems | Single tenant or per-user |

## Current Implementation

The current backend uses **Strategy 2 (Default Tenant Creation)** by default:

```javascript
// In service/application/userService.js
const tenantId = user.tenantId || await this.createDefaultTenant(email);
```

This means:
- If Firebase Custom Claims include `tenantId` → Use it
- If Firebase Custom Claims omit `tenantId` → Create default tenant

## Migration Between Strategies

### From Default Tenant → Firebase Custom Claims

If you want to migrate to Firebase Custom Claims:

1. Set `DEFAULT_TENANT_ENABLED=false` in `.env`
2. Configure Firebase Custom Claims for all existing users
3. Test on staging first
4. Deploy with custom claims enabled

### From Firebase Custom Claims → Default Tenant

If you want to revert:

1. Set `DEFAULT_TENANT_ENABLED=true` in `.env`
2. Redeploy
3. New signups will follow default tenant strategy

## Recommendations

### For Single-Tenant Systems
Use **Strategy 2 (Default Tenant Creation)**:
- Set `DEFAULT_TENANT_ENABLED=true`
- Simpler setup
- No Firebase configuration needed

### For Multi-Tenant SaaS
Use **Strategy 1 (Firebase Custom Claims)**:
- Set `DEFAULT_TENANT_ENABLED=false`
- Configure Firebase Custom Claims per user/organization
- Tenant is centrally managed in Firebase

### For Development
Use **Strategy 2** for faster iteration:
- No Firebase setup needed
- Each developer gets their own tenant
- Easy to reset/rebuild database

## See Also

- [firebase-setup.md](./firebase-setup.md) — Firebase Custom Claims configuration
- [../middleware/authenticate.js](../middleware/authenticate.js) — Token validation
- [../service/application/userService.js](../service/application/userService.js) — Tenant assignment logic
