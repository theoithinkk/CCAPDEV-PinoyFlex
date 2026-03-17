import { connectDB } from "../model/db.js";
import { seedDatabase } from "../model/seed.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pinoyflex";
const force = process.argv.includes("--force");

async function run() {
  await connectDB(MONGODB_URI);
  await seedDatabase({ force });
  process.exit(0);
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
