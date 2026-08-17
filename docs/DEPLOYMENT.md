# WorkNavo deployment guide

WorkNavo can remain local-only, but this setup is ready when you want a
public portfolio deployment.

## Recommended services

- Frontend: Vercel or Netlify
- API: Render or Railway
- Database: MongoDB Atlas
- Email: Resend direct API for testing/production, or SMTP as a fallback
- Product analytics: PostHog
- Payments: not connected yet. During beta, owners can switch Free, Team, and
  Pro manually from Settings to test feature locks.

## Deploy the API

1. Create a new web service from this repository.
2. Set the root directory to the repository root.
3. Use `npm install` as the install command.
4. Use `npm run build --workspace shared && npm run build --workspace server`
   as the build command.
5. Use `npm start --workspace server` as the start command.
6. Add the server environment variables:

```env
NODE_ENV=production
PORT=5050
MONGO_URI=mongodb+srv://...
JWT_ACCESS_SECRET=use-a-random-secret-at-least-32-characters-long
JWT_REFRESH_SECRET=use-a-different-random-secret-at-least-32-characters
CLIENT_URL=https://your-worknavo-frontend.example
SCHEDULE_RUNNER_SECRET=use-a-random-secret-for-scheduled-jobs
RESEND_API_KEY=re_...
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@your-verified-domain.example
SMTP_FROM_NAME=WorkNavo
```

The hosting provider normally supplies `PORT`; keep its provided value.
When `RESEND_API_KEY` is set, WorkNavo sends email through the Resend API and
does not need `SMTP_HOST`, `SMTP_USER`, or `SMTP_PASS`.

## Deploy the frontend

1. Create a Vercel or Netlify project from the same repository.
2. Set the root directory to `client`.
3. Use `npm install` as the install command.
4. Use `npm run build` as the build command.
5. Publish the `client/dist` directory.
6. Set:

```env
VITE_API_URL=https://your-worknavo-api.example/api
VITE_POSTHOG_KEY=phc_your_posthog_project_key
VITE_POSTHOG_HOST=https://us.i.posthog.com
VITE_POSTHOG_DISABLED=false
```

For Railway, add these variables to the frontend service's Variables tab, then
deploy the staged changes. If Railway builds the client and server from a
single service, add the `VITE_POSTHOG_*` variables to that service before
building.

## Production checklist

- Allow the API host and your own IP in MongoDB Atlas Network Access.
- Replace both JWT secrets with unrelated random values.
- Set `CLIENT_URL` to the exact frontend origin, without a trailing slash.
- Protect the scheduled-report runner with a unique `SCHEDULE_RUNNER_SECRET`.
- Configure Resend or SMTP and send a test report to an address you control.
- Confirm register, login, PDF download, and logout on the deployed URL.
- Confirm PostHog receives `page_view`, `signup_completed`,
  `login_completed`, `plan_selected`, `timer_started`, `timer_stopped`,
  `worklog_created`, `project_created`, `member_invited`, `report_created`,
  `report_downloaded`, `invoice_created`, `invoice_downloaded`, and
  `analytics_csv_downloaded` events.
- Confirm plan switching in Settings:
  - Free blocks Analytics, Expenses, proof tracking, scheduled reports, and
    Team-only work-log rules.
  - Team unlocks Analytics, CSV export, and work-log rules.
  - Pro unlocks Expenses, proof tracking, and scheduled reports.
- Add a real payment provider later before charging customers.
- Never commit `.env` files, MongoDB credentials, SMTP passwords, or Resend API
  keys.
