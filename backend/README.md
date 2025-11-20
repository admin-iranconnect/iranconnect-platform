# IranConnect - Backend (Starter)

This is a starter Express backend for the IranConnect project.

## Quick start (development)

You can run this project with a local PostgreSQL or with Docker Compose (recommended if you don't have Postgres locally).

### Using Docker (recommended)



1. Ensure Docker is installed.
2. Run:

```
docker run --name iranconnect-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=iranconnect -p 5432:5432 -d postgres:15
```

3. Create a `.env` based on `.env.example` and point DATABASE_URL to `postgresql://postgres:postgres@localhost:5432/iranconnect`.
4. Install dependencies and run:

```
cd backend
npm install
npm run dev
```

### Using local Postgres
Create database `iranconnect` and configure `DATABASE_URL` accordingly.

## Notes
- Email sending and S3 upload are stubbed in this starter. You'll need to configure SendGrid/AWS or DigitalOcean Spaces and implement production upload and email sending logic.

نحوه ورود به خط فرمان دیتابیس (psql)

هر وقت بخوای مستقیم بری داخل PostgreSQL که داخل Docker در حال اجراست، بزن:

sudo -u postgres psql -d iranconnect

