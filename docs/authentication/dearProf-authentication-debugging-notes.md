# Authentication and Invitation Flow — Debugging Notes

**Project:** dearProf  
**Last updated:** 20 October 2026  
**Purpose:** Record the authentication issues investigated, the fixes applied or verified, and the checks that confirmed the flow was working.

## 1. Expected onboarding flow

1. An administrator signs in to dearProf.
2. The administrator creates a student or professor through the admin UI.
3. The frontend sends the request to the Express backend with the administrator's Supabase access token.
4. The backend creates the application user/profile and sends a Supabase invitation.
5. The invitation redirects to `http://localhost:5173/set-password`.
6. The invited user sets a password.
7. The user enters the application and can subsequently log out and log in with their email and password.

Invitations should be created through the application workflow when relying on the backend's explicit `redirectTo` option. An invitation created directly from the Supabase Dashboard may use the project's configured Site URL instead.

## 2. Issues found and resolutions

### 2.1 Invitation link redirected to the application root

**Symptom:** The invitation's redirect destination was `http://localhost:5173` instead of `/set-password`.

**Cause identified:** The invitation that produced the bare redirect was generated through the Supabase Dashboard rather than through dearProf's backend invitation function. It therefore did not use the application's explicit `redirectTo` setting.

**Relevant code:** `backend/src/services/auth-admin.service.ts`

```ts
await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
  redirectTo: 'http://localhost:5173/set-password',
});
```

**Verification:** A later invitation opened `http://localhost:5173/set-password`, and the password setup form displayed successfully.

A correct invitation link should have a destination equivalent to:

```text
redirect_to=http%3A%2F%2Flocalhost%3A5173%2Fset-password
```

Do not paste full invitation URLs into documentation or chat: they can contain single-use tokens.

### 2.2 Protected API requests returned `401 Unauthorized`

**Symptoms:**
- Requests to `/api/users` returned `401 Unauthorized`.
- Student and professor list pages remained on “Loading students...” or “Loading professors...”.
- The browser console showed failed `getUsers()` requests with status `401`.

**Cause identified:** The frontend API client was not consistently attaching the current Supabase access token to protected backend requests. The backend authentication middleware expects an `Authorization: Bearer <access_token>` header.

An example of the original `createUser()` request was:

```ts
const res = await fetch(`${API_BASE_URL}/users`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

The project already had a `getAuthHeaders()` helper that reads the Supabase session and returns the authorization header.

**Fix pattern:** Use the helper for protected requests rather than sending only the content type:

```ts
const headers = await getAuthHeaders();

const res = await fetch(`${API_BASE_URL}/users`, {
  method: 'POST',
  headers,
  body: JSON.stringify(data),
});
```

Apply the same principle to other protected endpoints, including `getUsers()`. Ensure the token exists before sending the request; do not send `Bearer undefined` or an empty bearer token.

### 2.3 Profile loading failed after the invitation flow

**Symptoms:** The app displayed “Unable to load your profile.” The console showed a failed request to `/api/users/:id`. At different points, the request failed with `401 Unauthorized` or `ERR_CONNECTION_REFUSED`.

**Related causes identified during diagnosis:**

- The backend can return `401` when the authenticated Supabase user has no matching row in the application's `public.users` table.
- A request made before the session token is available can send a missing or invalid authorization token.
- `AuthProvider` could mark loading complete before `supabase.auth.getSession()` had finished initializing.
- The backend was not accepting connections on port `3000` when `ERR_CONNECTION_REFUSED` appeared.

**Fixes and checks:**

- Keep authentication loading active until the initial session check has settled.
- Fetch the application profile only after session initialization and only when a valid access token is available.
- Pass the known session token to the profile-fetching function rather than re-reading a possibly unsettled session.
- Confirm the backend is running and listening on the configured API port.
- Confirm every invited Supabase Auth user also has a corresponding application profile in `public.users`.

**Important distinction:** `ERR_CONNECTION_REFUSED` means the browser could not connect to the backend; it is not the same as an HTTP `401`. Diagnose these separately.

### 2.4 Password setup callback handling

The diagnosis also identified a potential conflict in `SetPassword.tsx`: manually calling `exchangeCodeForSession(code)` while Supabase JS is already configured to detect and process the callback URL can result in the same single-use code being exchanged twice.

**Maintenance principle:** Let the Supabase client handle callback URL processing once. Avoid a second manual exchange of the same code. Parse Supabase callback errors from the URL so an expired or invalid invitation can be reported clearly.

The password setup page was later reached successfully. Treat this as a guardrail when maintaining the component; do not reintroduce duplicate code exchange logic.

## 3. Authentication debugging checklist

When debugging an authentication problem, check these in order:

1. **Invitation destination:** Does the invitation's `redirect_to` point to `/set-password`?
2. **Invitation source:** Was the invitation created through dearProf's backend workflow?
3. **Frontend session:** Has Supabase finished initializing the session?
4. **Request headers:** Does the protected API request contain `Authorization: Bearer <valid access token>`?
5. **Backend availability:** Is the Express server running on the expected port?
6. **Backend response:** Is the failure a connection error, `401`, `403`, or another status?
7. **Application profile:** Does the authenticated user have a matching row in `public.users`?
8. **Callback handling:** Is the invitation callback code being processed only once?
9. **End-to-end test:** Can the invited user set a password, access their profile, log out, and log back in?

Never record access tokens, refresh tokens, passwords, service-role keys, or complete invitation links in logs or documentation.

## 4. Verification performed

The following outcomes were observed during the debugging session:

- The invitation link successfully opened `/set-password`.
- The password setup form displayed.
- The browser reported `ERR_CONNECTION_REFUSED` on port `3000`; restarting the backend restored the connection.
- The user subsequently confirmed that both login and logout were working.

The final login/logout confirmation establishes that those flows worked in the local environment at that point. It does not, by itself, prove every edge case (for example, expired invitations, missing database profiles, or every role's permissions) has been tested.

## 5. Follow-up regression tests

- [ ] Create a new student from the admin UI and verify the invitation destination.
- [ ] Create a new professor from the admin UI and verify the invitation destination.
- [ ] Set a password from a fresh invitation.
- [ ] Confirm the invited user has a corresponding `public.users` profile.
- [ ] Log in and load the user's profile.
- [ ] Log out and log back in.
- [ ] Refresh a protected page while authenticated.
- [ ] Verify a missing/expired session redirects to login cleanly.
- [ ] Verify an expired invitation displays a useful error.
- [ ] Verify API calls fail gracefully if the backend is stopped.
- [ ] Verify protected API calls do not send an absent or invalid bearer token.
