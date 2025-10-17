# OAuth Setup Guide - Google & Spotify

This guide explains how to set up Google and Spotify OAuth authentication for Audiograph.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Google OAuth Setup](#google-oauth-setup)
- [Spotify OAuth Setup](#spotify-oauth-setup)
- [Configure Supabase Auth](#configure-supabase-auth)
- [Testing OAuth](#testing-oauth)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- A Supabase project set up (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
- Google Cloud account (for Google OAuth)
- Spotify Developer account (for Spotify OAuth)
- Your Audiograph application running locally or deployed

## Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Enter project details:
   - **Project Name**: `Audiograph` (or your preferred name)
   - **Organization**: Leave as default or select your organization
4. Click **Create**

### Step 2: Configure OAuth Consent Screen

1. In the left sidebar, navigate to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: `Audiograph`
   - **User support email**: Your email address
   - **App logo**: (Optional) Upload your app logo
   - **Application home page**: `https://yourdomain.com` (or `http://localhost:3000` for dev)
   - **Authorized domains**: Add your domain (e.g., `yourdomain.com`)
   - **Developer contact information**: Your email address
5. Click **Save and Continue**
6. **Scopes**: Click **Add or Remove Scopes**
   - Add: `../auth/userinfo.email`
   - Add: `../auth/userinfo.profile`
   - Add: `openid`
7. Click **Update** then **Save and Continue**
8. **Test users** (for development):
   - Click **Add Users**
   - Add your test email addresses
   - Click **Save and Continue**
9. Click **Back to Dashboard**

### Step 3: Create OAuth Client Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Application type**: **Web application**
4. Fill in the details:
   - **Name**: `Audiograph Web Client`
   - **Authorized JavaScript origins**:
     - For development: `http://localhost:3000`
     - For production: `https://yourdomain.com`
   - **Authorized redirect URIs**:
     - For development: `http://localhost:54321/auth/v1/callback`
     - For production: `https://your-project.supabase.co/auth/v1/callback`

     > **Note**: Replace `your-project` with your actual Supabase project reference ID

5. Click **Create**
6. **Save your credentials**:
   - Copy the **Client ID** (starts with something like `123456789-abc...apps.googleusercontent.com`)
   - Copy the **Client Secret**
   - Keep these secure!

### Step 4: Configure Google OAuth in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list and click to expand
5. Enable the toggle: **Enable Google provider**
6. Fill in the credentials:
   - **Client ID**: Paste your Google Client ID
   - **Client Secret**: Paste your Google Client Secret
7. Copy the **Callback URL** shown (should be `https://your-project.supabase.co/auth/v1/callback`)
8. Verify this matches the redirect URI in your Google Cloud Console
9. Click **Save**

---

## Spotify OAuth Setup

### Step 1: Create Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **Create app**
4. Fill in the app details:
   - **App name**: `Audiograph`
   - **App description**: `Music listening history tracker and analytics`
   - **Website**: `https://yourdomain.com` (or leave empty for dev)
   - **Redirect URIs**:
     - For development: `http://localhost:54321/auth/v1/callback`
     - For production: `https://your-project.supabase.co/auth/v1/callback`

     > **Note**: You can add multiple redirect URIs by clicking **Add** after each one

   - **Which API/SDKs are you planning to use?**: Select **Web API**
5. Check the box: **I understand and agree to Spotify's Terms of Service and Design Guidelines**
6. Click **Save**

### Step 2: Get Spotify Credentials

1. In your app dashboard, you'll see your app overview
2. Click **Settings** (top right)
3. **Save your credentials**:
   - Copy the **Client ID**
   - Click **View client secret** and copy the **Client Secret**
   - Keep these secure!

### Step 3: Configure Spotify OAuth in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Spotify** in the list and click to expand
5. Enable the toggle: **Enable Spotify provider**
6. Fill in the credentials:
   - **Client ID**: Paste your Spotify Client ID
   - **Client Secret**: Paste your Spotify Client Secret
7. Copy the **Callback URL** shown (should be `https://your-project.supabase.co/auth/v1/callback`)
8. Verify this matches the redirect URI in your Spotify app settings
9. Click **Save**

---

## Configure Supabase Auth

### Enable Email/Password Authentication

1. In your Supabase Dashboard, go to **Authentication** → **Providers**
2. Find **Email** in the list
3. Ensure the toggle is **enabled**
4. Configure email settings:
   - **Enable email confirmations**: ☑️ Enabled (recommended for production)
   - **Enable email change confirmations**: ☑️ Enabled (recommended)
   - **Secure email change**: ☑️ Enabled (recommended)
5. Click **Save**

### Configure Email Templates (Optional)

1. Navigate to **Authentication** → **Email Templates**
2. Customize templates for:
   - **Confirm signup**: Sent when a user signs up
   - **Magic Link**: Sent for passwordless sign-in
   - **Change Email Address**: Sent when email is changed
   - **Reset Password**: Sent when password reset is requested

### Configure Auth Settings

1. Navigate to **Authentication** → **Settings**
2. Configure the following:
   - **Site URL**: Your production URL (e.g., `https://yourdomain.com`)
   - **Redirect URLs**: Add allowed redirect URLs after authentication:
     - `http://localhost:3000/auth/callback` (development)
     - `https://yourdomain.com/auth/callback` (production)
   - **JWT expiry**: Default is 3600 seconds (1 hour) - adjust as needed
   - **Refresh token rotation**: ☑️ Enabled (recommended)
   - **Reuse interval**: 10 seconds (default)

---

## Testing OAuth

### Test Google OAuth

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/sign-in`

3. Click **Continue with Google**

4. You should be redirected to Google's sign-in page

5. Sign in with a Google account (must be added as a test user if app is not published)

6. Grant permissions when prompted

7. You should be redirected back to your app at `/dashboard` (or the `next` parameter if specified)

8. Verify the user appears in **Authentication** → **Users** in your Supabase dashboard

### Test Spotify OAuth

1. Navigate to `http://localhost:3000/sign-in`

2. Click **Continue with Spotify**

3. You should be redirected to Spotify's authorization page

4. Sign in with your Spotify account

5. Grant permissions:
   - Read your email address
   - Access your library
   - Access your recently played tracks

6. You should be redirected back to your app

7. Verify the user appears in Supabase **Authentication** → **Users**

### Test Password Authentication

1. Navigate to `http://localhost:3000/sign-up`

2. Enter your email and a password (minimum 6 characters)

3. Click **Create account**

4. Check your email for a confirmation link (if email confirmations are enabled)

5. Click the confirmation link

6. Navigate to `http://localhost:3000/sign-in`

7. Enter your email and password

8. Click **Sign in with password**

9. You should be redirected to `/dashboard`

### Test Magic Link Authentication

1. Navigate to `http://localhost:3000/sign-in`

2. Enter your email

3. Click **Use magic link instead**

4. Click **Send magic link**

5. Check your email for the sign-in link

6. Click the link in your email

7. You should be redirected to your app and signed in

---

## Troubleshooting

### Google OAuth Issues

#### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI in your request doesn't match what's configured in Google Cloud Console

**Solution**:
1. Check your Supabase project URL
2. Verify the redirect URI in Google Cloud Console matches exactly:
   - `https://your-project.supabase.co/auth/v1/callback`
3. Ensure there are no trailing slashes
4. Save changes and wait a few minutes for propagation

#### Error: "access_denied"

**Cause**: User denied permissions or app is not verified

**Solution**:
- For development: Add test users in Google Cloud Console → OAuth consent screen → Test users
- For production: Submit your app for verification if you need more than 100 users

#### Error: "invalid_client"

**Cause**: Client ID or Client Secret is incorrect

**Solution**:
1. Verify credentials in Google Cloud Console → Credentials
2. Copy and paste again into Supabase (watch for extra spaces)
3. Regenerate credentials if needed

### Spotify OAuth Issues

#### Error: "invalid_client"

**Cause**: Client ID or Client Secret is incorrect

**Solution**:
1. Verify credentials in Spotify Developer Dashboard → Settings
2. Copy and paste again into Supabase
3. Ensure Client Secret is the full secret, not truncated

#### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI doesn't match what's configured in Spotify

**Solution**:
1. Go to Spotify Developer Dashboard → Your App → Settings
2. Verify redirect URIs include:
   - `https://your-project.supabase.co/auth/v1/callback`
3. Click **Save**
4. Wait a few minutes for changes to propagate

#### Scopes Not Working

**Cause**: Requested scopes in the application don't match what Spotify expects

**Solution**:
- The app requests these scopes: `user-read-email user-library-read user-read-recently-played`
- Verify these are valid and your app has permission to use them
- Adjust scopes in the sign-in code if needed ([sign-in/page.tsx](../src/app/sign-in/page.tsx))

### Password Authentication Issues

#### Email Confirmations Not Arriving

**Solution**:
1. Check spam folder
2. Verify Supabase email settings in **Authentication** → **Settings**
3. Check Supabase email logs: **Authentication** → **Logs**
4. For development, you can disable email confirmations temporarily

#### Password Too Short Error

**Solution**:
- Supabase requires minimum 6 characters
- The application enforces this in the sign-up form
- Update validation if you need a different requirement

#### "User already registered"

**Solution**:
- Try signing in instead of signing up
- Use password reset if you forgot your password
- Check if the user exists in **Authentication** → **Users**

### General Auth Issues

#### Session Not Persisting

**Solution**:
1. Check browser cookies are enabled
2. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
3. Clear browser cache and cookies
4. Check for CORS issues in browser console

#### Redirect Loop

**Cause**: Auth callback isn't handling sessions correctly

**Solution**:
1. Check [auth/callback/route.ts](../src/app/auth/callback/route.ts)
2. Verify the callback URL is correct in provider settings
3. Check browser console for errors
4. Clear sessions and try again

#### "Invalid token" Error

**Solution**:
1. Token may have expired (default: 1 hour)
2. Sign out and sign in again
3. Check Supabase Auth settings for JWT expiry
4. Verify system time is correct

---

## Security Best Practices

### Production Checklist

- [ ] Enable email confirmations for password signups
- [ ] Use HTTPS for all redirect URIs
- [ ] Keep Client Secrets secure (never commit to version control)
- [ ] Regularly rotate OAuth credentials
- [ ] Monitor authentication logs in Supabase
- [ ] Set up rate limiting for authentication endpoints
- [ ] Configure proper CORS settings
- [ ] Review and restrict OAuth scopes to minimum required
- [ ] Enable MFA for admin accounts
- [ ] Set up monitoring/alerts for suspicious auth activity

### Environment Variables Security

Never commit these to version control:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public, but should be in .env)
- `SUPABASE_SERVICE_ROLE_KEY` (highly sensitive!)
- OAuth Client Secrets

Use `.env.local` for local development and environment variables in your hosting provider for production.

---

## Next Steps

After completing OAuth setup:

1. **Test all authentication flows** thoroughly
2. **Configure user roles** if needed (Supabase Auth → Users)
3. **Set up email templates** for branding
4. **Enable additional providers** if desired (GitHub, Twitter, etc.)
5. **Monitor authentication logs** regularly
6. **Set up error tracking** for auth failures

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Spotify OAuth Documentation](https://developer.spotify.com/documentation/general/guides/authorization/)
- [Next.js Authentication Patterns](https://nextjs.org/docs/authentication)

## Support

If you encounter issues:
1. Check the Supabase Auth logs: **Authentication** → **Logs**
2. Review browser console for client-side errors
3. Check server logs for API errors
4. Consult [Supabase Community](https://github.com/supabase/supabase/discussions)
