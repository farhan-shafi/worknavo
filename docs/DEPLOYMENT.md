# ClientFlow deployment guide

ClientFlow can remain local-only, but this setup is ready when you want a
public portfolio deployment.

## Recommended services

- Frontend: Vercel or Netlify
- API: Render or Railway
- Database: MongoDB Atlas
- Email: Gmail SMTP for testing, or Resend/Postmark SMTP for production

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
CLIENT_URL=https://your-clientflow-frontend.example
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_FROM_NAME=ClientFlow
```

The hosting provider normally supplies `PORT`; keep its provided value.

## Deploy the frontend

1. Create a Vercel or Netlify project from the same repository.
2. Set the root directory to `client`.
3. Use `npm install` as the install command.
4. Use `npm run build` as the build command.
5. Publish the `client/dist` directory.
6. Set:

```env
VITE_API_URL=https://your-clientflow-api.example/api
```

## Production checklist

- Allow the API host and your own IP in MongoDB Atlas Network Access.
- Replace both JWT secrets with unrelated random values.
- Set `CLIENT_URL` to the exact frontend origin, without a trailing slash.
- Configure SMTP and send a test report to an address you control.
- Confirm register, login, PDF download, and logout on the deployed URL.
- Never commit `.env` files, MongoDB credentials, or SMTP passwords.
