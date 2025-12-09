# Authentication System Overview

Audiograph supports multiple authentication methods through Supabase Auth, providing flexibility for users to sign in using their preferred method.

## Supported Authentication Methods

### 1. Password-based Authentication
- **Sign Up**: Users can create an account with email and password
- **Sign In**: Users can sign in with their credentials
- **Email Confirmation**: Optional email verification for new accounts
- **Password Reset**: Users can reset forgotten passwords via email

### 2. Magic Link Authentication
- **Passwordless**: Users receive a one-time sign-in link via email
- **No password management**: Secure authentication without remembering passwords
- **Automatic expiry**: Links expire after use or timeout

### 3. Google OAuth
- **Single Sign-On**: Sign in with Google account
- **No password needed**: Uses Google's authentication
- **Quick setup**: One-click authentication

### 4. Spotify OAuth
- **Music platform integration**: Sign in with Spotify account
- **Extended permissions**: Access to user's listening history and library
- **Seamless experience**: Direct integration with music data

## Quick Start

### For Users

1. **Navigate to Sign In**: Go to `/sign-in`
2. **Choose Authentication Method**:
   - Click **Continue with Google** or **Continue with Spotify** for OAuth
   - Enter email and password, then click **Sign in with password**
   - Or click **Use magic link instead** for passwordless sign-in
3. **New User?**: Click **Sign up** to create an account

### For Developers

1. **Set up Supabase**: Follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
2. **Configure OAuth**: Follow [OAUTH_SETUP.md](./OAUTH_SETUP.md)
3. **Test locally**: Run `npm run dev` and test all authentication flows

## Authentication Flow

### Sign In Flow
```
User visits /sign-in
    ↓
User selects authentication method
    ↓
    ├─ Password: Enter credentials → Sign in → Redirect to /dashboard
    ├─ Magic Link: Enter email → Check inbox → Click link → Redirect to /dashboard
    ├─ Google OAuth: Authorize with Google → Redirect to /dashboard
    └─ Spotify OAuth: Authorize with Spotify → Redirect to /dashboard
```

### Sign Up Flow
```
User visits /sign-up
    ↓
User selects registration method
    ↓
    ├─ Password: Enter email + password → Confirm email (optional) → Sign in
    ├─ Google OAuth: Authorize with Google → Auto sign-in → Redirect to /dashboard
    └─ Spotify OAuth: Authorize with Spotify → Auto sign-in → Redirect to /dashboard
```

## File Structure

### Authentication Pages
- [`/src/app/sign-in/page.tsx`](../src/app/sign-in/page.tsx) - Sign in page with multiple auth methods
- [`/src/app/sign-up/page.tsx`](../src/app/sign-up/page.tsx) - Sign up page for new users
- [`/src/app/auth/callback/route.ts`](../src/app/auth/callback/route.ts) - OAuth callback handler

### Authentication Components
- [`/src/components/auth/auth-button-group.tsx`](../src/components/auth/auth-button-group.tsx) - Auth status display and sign-out button

### Supabase Configuration
- [`/src/lib/supabaseClient.ts`](../src/lib/supabaseClient.ts) - Browser-side Supabase client
- [`/src/lib/supabase/server.ts`](../src/lib/supabase/server.ts) - Server-side Supabase client

### Protected Routes
- [`/src/app/dashboard/layout.tsx`](../src/app/dashboard/layout.tsx) - Protected dashboard
- [`/src/app/upload/layout.tsx`](../src/app/upload/layout.tsx) - Protected upload page

## Features

### Current Features
- ✅ Multiple authentication methods (Password, Magic Link, Google, Spotify)
- ✅ Email verification (configurable)
- ✅ Protected routes with automatic redirect
- ✅ Session management with cookies
- ✅ OAuth callback handling
- ✅ Sign out functionality
- ✅ Real-time auth state tracking
- ✅ Error handling with user-friendly messages
- ✅ Loading states for better UX
- ✅ Responsive design for mobile and desktop

### Security Features
- ✅ Row Level Security (RLS) policies
- ✅ Secure session storage in HTTP-only cookies
- ✅ JWT token authentication
- ✅ Automatic token refresh
- ✅ CSRF protection
- ✅ Email confirmation for signups (optional)
- ✅ Secure OAuth flow

## Configuration

### Supabase Auth Settings

Configure in Supabase Dashboard → Authentication → Settings:

| Setting | Recommended Value | Description |
|---------|------------------|-------------|
| Site URL | `https://yourdomain.com` | Your production URL |
| Redirect URLs | `https://yourdomain.com/auth/callback` | Allowed redirect URLs after auth |
| JWT expiry | `3600` (1 hour) | Token expiration time |
| Email confirmations | `Enabled` | Require email verification |
| Email change confirmations | `Enabled` | Require confirmation for email changes |
| Refresh token rotation | `Enabled` | Rotate refresh tokens for security |

### OAuth Providers Configuration

Each OAuth provider requires configuration in Supabase:

**Google OAuth**:
- Client ID from Google Cloud Console
- Client Secret from Google Cloud Console
- Redirect URI: `https://your-project.supabase.co/auth/v1/callback`

**Spotify OAuth**:
- Client ID from Spotify Developer Dashboard
- Client Secret from Spotify Developer Dashboard
- Redirect URI: `https://your-project.supabase.co/auth/v1/callback`
- Scopes: `user-read-email user-library-read user-read-recently-played`

See [OAUTH_SETUP.md](./OAUTH_SETUP.md) for detailed setup instructions.

## API Usage

### Sign In with Password
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
})
```

### Sign Up with Password
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    emailRedirectTo: 'https://yourdomain.com/auth/callback',
  },
})
```

### Sign In with Magic Link
```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: 'https://yourdomain.com/auth/callback',
  },
})
```

### Sign In with OAuth
```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google', // or 'spotify'
  options: {
    redirectTo: 'https://yourdomain.com/auth/callback',
  },
})
```

### Sign Out
```typescript
const { error } = await supabase.auth.signOut()
```

### Get Current User
```typescript
const { data: { user } } = await supabase.auth.getUser()
```

### Get Current Session
```typescript
const { data: { session } } = await supabase.auth.getSession()
```

### Listen to Auth Changes
```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    console.log(event, session)
  }
)

// Don't forget to unsubscribe when component unmounts
subscription.unsubscribe()
```

## Testing Authentication

### Manual Testing Checklist

- [ ] **Password Sign Up**
  - [ ] Create account with valid email and password
  - [ ] Verify email confirmation (if enabled)
  - [ ] Check user appears in Supabase Auth Users

- [ ] **Password Sign In**
  - [ ] Sign in with correct credentials
  - [ ] Test incorrect password error
  - [ ] Test non-existent user error
  - [ ] Verify redirect to dashboard

- [ ] **Magic Link**
  - [ ] Request magic link
  - [ ] Check email delivery
  - [ ] Click magic link in email
  - [ ] Verify sign-in and redirect

- [ ] **Google OAuth**
  - [ ] Click "Continue with Google"
  - [ ] Authorize with Google
  - [ ] Verify redirect and sign-in
  - [ ] Check user in Supabase

- [ ] **Spotify OAuth**
  - [ ] Click "Continue with Spotify"
  - [ ] Authorize with Spotify
  - [ ] Grant required permissions
  - [ ] Verify redirect and sign-in
  - [ ] Check user in Supabase

- [ ] **Sign Out**
  - [ ] Click sign out button
  - [ ] Verify redirect to sign-in page
  - [ ] Verify session cleared

- [ ] **Protected Routes**
  - [ ] Try accessing /dashboard without auth (should redirect)
  - [ ] Try accessing /upload without auth (should redirect)
  - [ ] Access after signing in (should work)

### Automated Testing

```bash
# Run all tests
npm test

# Run auth-specific tests (if implemented)
npm test -- auth

# Run E2E tests with Playwright/Cypress
npm run test:e2e
```

## Troubleshooting

### Common Issues

**Issue**: "Invalid redirect URL"
- **Solution**: Check redirect URLs in Supabase Auth Settings match your callback URL

**Issue**: OAuth provider shows "access_denied"
- **Solution**: Verify OAuth credentials are correct and redirect URIs match

**Issue**: Email confirmations not arriving
- **Solution**: Check spam folder, verify Supabase email settings, check logs

**Issue**: Session not persisting
- **Solution**: Check cookies are enabled, verify environment variables are set

**Issue**: Protected routes not working
- **Solution**: Verify session management in layout files, check auth state

See [OAUTH_SETUP.md](./OAUTH_SETUP.md) for detailed troubleshooting.

## Security Best Practices

### Production Checklist

- [ ] Enable HTTPS for all pages
- [ ] Configure proper CORS settings
- [ ] Enable email confirmations for signups
- [ ] Set secure JWT expiry times
- [ ] Enable refresh token rotation
- [ ] Review and tighten RLS policies
- [ ] Keep OAuth client secrets secure
- [ ] Set up rate limiting
- [ ] Enable logging and monitoring
- [ ] Regular security audits

### Environment Variables

**Never commit these to version control:**
- OAuth Client Secrets
- `SUPABASE_SERVICE_ROLE_KEY`

**Safe to expose (but keep in .env):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Migration from Magic Link Only

If you previously had only magic link authentication:

1. **Existing users**: Can continue using magic links
2. **OAuth users**: Will create new accounts (unless email matches)
3. **Password users**: New accounts for password-based auth
4. **Account linking**: Consider implementing account linking if needed

## Future Enhancements

Potential improvements for the authentication system:

- [ ] Password reset functionality
- [ ] Account linking (merge OAuth and password accounts)
- [ ] Multi-factor authentication (MFA)
- [ ] Social login with additional providers (GitHub, Twitter, Apple)
- [ ] Session management UI (view active sessions)
- [ ] Login history and security logs
- [ ] Email change functionality
- [ ] Account deletion
- [ ] Profile management

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Authentication Best Practices](https://nextjs.org/docs/authentication)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## Support

For authentication issues:
1. Check [OAUTH_SETUP.md](./OAUTH_SETUP.md) troubleshooting section
2. Review Supabase Auth logs in dashboard
3. Check browser console for client-side errors
4. Review server logs for API errors
5. Consult [Supabase Community](https://github.com/supabase/supabase/discussions)
