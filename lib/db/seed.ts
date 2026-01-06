import { db, schema } from "./index";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;

  if (!email || !password) {
    console.log("No SEED_EMAIL/SEED_PASSWORD set, skipping seed");
    return;
  }

  const passwordHash = await hash(password, 12);

  // Check if user already exists
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });

  if (existing) {
    // Update password and ensure admin
    await db
      .update(schema.users)
      .set({ passwordHash, isAdmin: true })
      .where(eq(schema.users.email, email));
    console.log(`Updated password for admin: ${email}`);
  } else {
    // Create admin user
    await db.insert(schema.users).values({
      id: crypto.randomUUID(),
      email,
      passwordHash,
      isAdmin: true,
    });
    console.log(`Created admin user: ${email}`);
  }
}

seed()
  .then(() => {
    console.log("Seed complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
