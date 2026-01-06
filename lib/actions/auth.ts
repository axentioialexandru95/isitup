"use server";

import { signIn, signOut, auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { hash } from "bcryptjs";
import { eq, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  email?: string; // Preserve email on failed login
};

// Check if registration is allowed (first user or admin is logged in)
export async function canRegister(): Promise<{ allowed: boolean; isFirstUser: boolean }> {
  const [userCount] = await db.select({ count: count() }).from(schema.users);
  const isFirstUser = userCount.count === 0;

  if (isFirstUser) {
    return { allowed: true, isFirstUser: true };
  }

  // Check if current user is admin
  const session = await auth();
  if (!session?.user?.id) {
    return { allowed: false, isFirstUser: false };
  }

  const currentUser = await db.query.users.findFirst({
    where: eq(schema.users.id, session.user.id),
  });

  return { allowed: currentUser?.isAdmin === true, isFirstUser: false };
}

export async function register(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  // Check if registration is allowed
  const { allowed, isFirstUser } = await canRegister();
  if (!allowed) {
    return {
      error: "Registration is disabled. Contact an administrator.",
    };
  }

  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = registerSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, password } = parsed.data;

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });

  if (existingUser) {
    return {
      error: "An account with this email already exists",
    };
  }

  // Create user (first user becomes admin)
  const passwordHash = await hash(password, 12);
  const id = crypto.randomUUID();

  await db.insert(schema.users).values({
    id,
    email,
    passwordHash,
    isAdmin: isFirstUser, // First user is admin
  });

  // Sign in the user and redirect
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    // Rethrow redirect errors (these are expected)
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }
    return { error: "Failed to sign in" };
  }

  return {};
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      email: rawData.email,
    };
  }

  try {
    await signIn("credentials", {
      email: rawData.email,
      password: rawData.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    // AuthError is thrown for invalid credentials
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      // This is actually a redirect, not an error - rethrow it
      throw error;
    }
    return {
      error: "Invalid email or password",
      email: rawData.email,
    };
  }

  return {};
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
