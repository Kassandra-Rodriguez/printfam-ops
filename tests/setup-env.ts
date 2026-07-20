import { config } from "dotenv";

// Tests run outside Next.js, which normally loads .env.local automatically.
config({ path: ".env.local" });
