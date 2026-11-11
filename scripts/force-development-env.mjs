// Load before the server module graph so dotenv, the database adapter,
// security middleware, and Vite all see a consistent development environment.
// This keeps `npm run dev` from accidentally serving a stale production dist/
// when NODE_ENV=production is inherited from a shell or local .env file.
process.env.NODE_ENV = 'development';
