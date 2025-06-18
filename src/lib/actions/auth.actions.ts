
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

// Define return type for consistency
type AuthResponse = {
  success: boolean;
  message: string;
  role?: string;
  userId?: string;
  // Removed token
};

// Define schemas using Prisma Role enum
const signInSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string(),
  role: z.enum([Role.SETTER, Role.TAKER]),
});

const signUpSchema = z.object({
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
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function signInAction(
  values: z.infer<typeof signInSchema>,
): Promise<AuthResponse> {
  console.log("Sign-in Action: Triggered for email:", values.email, "and role:", values.role);
  if (process.env.DATABASE_URL) {
    console.log("Sign-in Action: DATABASE_URL is accessible.");
  } else {
    console.warn("Sign-in Action: DATABASE_URL is NOT accessible in this environment.");
  }

  // Simulate network delay only in development
  if (process.env.NODE_ENV !== "production") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  try {
    console.log("Sign-in Action: Attempting to find user with email:", values.email);
    const user = await prisma.user.findUnique({
      where: { email: values.email },
    });

    if (!user) {
      console.log("Sign-in Action: User not found for email:", values.email);
      return {
        success: false,
        message: "Authentication failed: Invalid email or password.",
      };
    }
    console.log("Sign-in Action: User found. DB Role:", user.role, "Input Role:", values.role);
    console.log("Sign-in Action: User password from DB (first 10 chars):", user.password.substring(0, 10));
    console.log("Sign-in Action: Input password length:", values.password.length);


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
      // Removed token
    };
  } catch (error) {
    console.error("SIGN_IN_ACTION_ERROR: An error occurred during sign-in.");
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
    
    // Handle Prisma-specific errors with a type guard
    if (error && typeof error === 'object' && 'code' in error && typeof (error as any).code === 'string' && (error as any).constructor.name.includes('Prisma')) {
      console.error("Prisma Error Code:", (error as any).code);
      return {
        success: false,
        message: "Authentication failed: Database error occurred. Please try again later.",
      };
    }

    return {
      success: false,
      message: "Authentication failed: An unexpected error occurred. Please try again later.",
    };
  }
}

export async function signUpAction(
  values: z.infer<typeof signUpSchema>,
): Promise<AuthResponse> {
  // Simulate network delay only in development
  if (process.env.NODE_ENV !== "production") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: values.email },
    });

    if (existingUser) {
      return {
        success: false,
        message: "Authentication failed: User with this email already exists.",
      };
    }

    const hashedPassword = await bcrypt.hash(values.password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: values.email,
        password: hashedPassword,
        role: values.role,
      },
    });

    return {
      success: true,
      message: "Account created successfully! Please sign in.",
      role: newUser.role,
      userId: newUser.id,
      // Removed token
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

    if (error && typeof error === 'object' && 'code' in error && typeof (error as any).code === 'string' && (error as any).constructor.name.includes('Prisma')) {
      console.error("Prisma Error Code:", (error as any).code);
      return {
        success: false,
        message: "Authentication failed: Database error occurred. Please try again later.",
      };
    }
    
    return {
      success: false,
      message: "Authentication failed: An unexpected error occurred. Please try again later.",
    };
  }
}
