
"use server";

import { z } from "zod";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import { Role } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';

export type AuthResponse = {
  success: boolean;
  message: string;
  role?: string;
  userId?: string;
};

const signInSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string(),
  role: z.enum([Role.SETTER, Role.TAKER]),
});

const signUpSchema = z
  .object({
    email: z.string().email().trim().toLowerCase(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        "Password must include uppercase, lowercase, number, and special character.",
      ),
    confirmPassword: z.string(),
    role: z.enum([Role.SETTER, Role.TAKER]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function signInAction(
  values: z.infer<typeof signInSchema>,
): Promise<AuthResponse> {
  console.log("Sign-in Action: Triggered for email:", values.email, "and role:", values.role);
  if (process.env.DATABASE_URL) {
    console.log("Sign-in Action: DATABASE_URL is accessible from env.");
  } else {
    console.warn("Sign-in Action: DATABASE_URL is NOT accessible in this environment.");
    return { success: false, message: "Server configuration error: DATABASE_URL not found."};
  }

  if (process.env.NODE_ENV !== "production") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  try {
    console.log("Sign-in Action: Attempting to find user with email:", values.email);
    const userResult = await query('SELECT "id", "email", "password", "role" FROM "User" WHERE "email" = $1', [
      values.email,
    ]);

    if (userResult.rows.length === 0) {
      console.log("Sign-in Action: User not found for email:", values.email);
      return {
        success: false,
        message: "Authentication failed: Invalid email or password.",
      };
    }
    const user = userResult.rows[0];
    console.log("Sign-in Action: User found. DB Role:", user.role, "Input Role:", values.role);


    if (user.role !== values.role) {
      console.log("Sign-in Action: Role mismatch.");
      return {
        success: false,
        message: "Authentication failed: Access denied for this role.",
      };
    }

    const passwordMatch = await bcrypt.compare(values.password, user.password);
    console.log("Sign-in Action: Password match result:", passwordMatch);

    if (!passwordMatch) {
      console.log("Sign-in Action: Password does not match.");
      return {
        success: false,
        message: "Authentication failed: Invalid email or password.",
      };
    }

    console.log("Sign-in Action: Sign-in successful for user ID:", user.id);
    return {
      success: true,
      message: "Signed in successfully!",
      role: user.role,
      userId: user.id,
    };
  } catch (error) {
    console.error("SIGN_IN_ACTION_ERROR --- Start of Error Details ---");
    if (error instanceof Error) {
      console.error("Error Name:", error.name);
      console.error("Error Message:", error.message);
      console.error(
        "Error Stack (first few lines):",
        error.stack ? error.stack.split("\n").slice(0, 5).join("\n") : "No stack available",
      );
    } else {
      console.error("Caught error is not an instance of Error. Raw error:", error);
    }
    console.error("SIGN_IN_ACTION_ERROR --- End of Error Details ---");

    return {
      success: false,
      message: "Authentication failed: An unexpected error occurred. Please try again later.",
    };
  }
}

export async function signUpAction(
  values: z.infer<typeof signUpSchema>,
): Promise<AuthResponse> {
  console.log("========= SIGN-UP SERVER ACTION CALLED (auth.actions.ts) =========");
  console.log("Sign-up Action: Values received:", values);

  if (!process.env.DATABASE_URL) {
    console.warn("Sign-up Action: DATABASE_URL environment variable is not set.");
    return { success: false, message: "Server configuration error: DATABASE_URL not found."};
  } else {
    console.log("Sign-up Action: DATABASE_URL is accessible.");
  }
  
  if (process.env.NODE_ENV !== "production") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  try {
    console.log("Sign-up Action: Checking for existing user with email:", values.email);
    const existingUserResult = await query('SELECT "id" FROM "User" WHERE "email" = $1', [values.email]);

    if (existingUserResult.rows.length > 0) {
      console.log("Sign-up Action: User with email already exists:", values.email);
      return {
        success: false,
        message: "Authentication failed: User with this email already exists.",
      };
    }
    console.log("Sign-up Action: No existing user found. Proceeding with hashing password.");

    const hashedPassword = await bcrypt.hash(values.password, 10);
    const newUserId = uuidv4();
    console.log("Sign-up Action: Password hashed. New User ID:", newUserId, ". Attempting to create user with role:", values.role);

    const newUserResult = await query(
      'INSERT INTO "User" ("id", "email", "password", "role", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING "id", "role"',
      [newUserId, values.email, hashedPassword, values.role],
    );

    if (newUserResult.rows.length === 0) {
        console.error("Sign-up Action: User creation failed, no ID returned from INSERT.");
        throw new Error("User creation failed at database level (no rows returned).");
    }
    const newUser = newUserResult.rows[0];
    console.log("Sign-up Action: User created successfully. ID:", newUser.id, "Role:", newUser.role);

    return {
      success: true,
      message: "Account created successfully! Please sign in.",
      role: newUser.role,
      userId: newUser.id,
    };
  } catch (error) {
    console.error("SIGN_UP_ACTION_ERROR --- Start of Error Details ---");
    if (error instanceof Error) {
      console.error("Error Name:", error.name);
      console.error("Error Message:", error.message);
      console.error(
        "Error Stack (first few lines):",
        error.stack ? error.stack.split("\n").slice(0, 5).join("\n") : "No stack available",
      );
    } else {
      console.error("Caught error is not an instance of Error. Raw error:", error);
    }
    console.error("SIGN_UP_ACTION_ERROR --- End of Error Details ---");

    return {
      success: false,
      message: "Authentication failed: An unexpected error occurred during sign-up. Please try again later.",
    };
  }
}
