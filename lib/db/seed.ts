import { db, schema } from "./index";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  const email = "axentioialexandru95@gmail.com";
  const password = "password2026!!";

  const passwordHash = await hash(password, 12);

  // Check if user already exists
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });

  if (existing) {
    // Update password
    await db
      .update(schema.users)
      .set({ passwordHash })
      .where(eq(schema.users.email, email));
    console.log(`Updated password for: ${email}`);
  } else {
    // Create user
    await db.insert(schema.users).values({
      id: crypto.randomUUID(),
      email,
      passwordHash,
    });
    console.log(`Created user: ${email}`);
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
