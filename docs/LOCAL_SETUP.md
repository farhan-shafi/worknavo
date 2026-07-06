# WorkNavo local setup

Use this guide if you want to run WorkNavo locally and push the code to your
own GitHub repository.

## 1. Install prerequisites

Make sure you have:

- Node.js 20 or newer
- npm 10 or newer
- A MongoDB Atlas account
- A GitHub account

## 2. Get the code

If you have not cloned the repository yet:

```bash
git clone https://github.com/farhan-shafi/clientflow.git
cd clientflow
```

If you are already inside the project folder, you can skip this step.

## 3. Install dependencies

```bash
npm install
```

## 4. Create the environment files

Copy the example file into the server and client folders:

```bash
cp .env.example server/.env
cp .env.example client/.env
```

Then edit them.

### `server/.env`

For local development, start with:

```env
PORT=5050
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_ACCESS_SECRET=replace-with-at-least-32-random-characters
JWT_REFRESH_SECRET=replace-with-a-different-32-character-secret
CLIENT_URL=http://localhost:5173
RESEND_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_FROM_NAME=WorkNavo
```

If you want email delivery to work locally, either add `RESEND_API_KEY` plus
`SMTP_FROM`, or fill in the SMTP values with a real mail provider/testing inbox
service. When `RESEND_API_KEY` is present, SMTP host/user/password are not used.

### `client/.env`

For local development:

```env
VITE_API_URL=/api
```

## 5. Create the MongoDB Atlas database

1. Create a free cluster in MongoDB Atlas.
2. Create a database user and give it access to your cluster.
3. Add your own IP address in Network Access.
4. Copy the connection string into `server/.env` as `MONGO_URI`.

## 6. Start the app locally

```bash
npm run dev
```

Then open:

- Frontend: `http://localhost:5173`
- API: `http://localhost:5050/api`

## 7. Seed demo data

If you want a ready-made workspace with sample users and records:

```bash
npm run seed:demo
```

Demo login:

```text
Email: demo@worknavo.local
Password: DemoPass123
```

## 8. Migrate legacy freelancer data

If you already had older freelancer data in the database, run:

```bash
npm run migrate:organizations
```

This creates solo organizations for existing users and preserves their current
records.

## 9. Push the code to GitHub

If you created your own repo on GitHub, connect this local project to it:

```bash
git remote add origin https://github.com/farhan-shafi/clientflow.git
git branch -M main
git add .
git commit -m "Initial WorkNavo implementation"
git push -u origin main
```

If you already have a remote or branch name, adjust those commands to match
your repo.

## 10. Optional Cloudinary setup

Cloudinary is not wired into the app yet. If image uploads are added later, the
server will need:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

You do not need these values for the current codebase.
