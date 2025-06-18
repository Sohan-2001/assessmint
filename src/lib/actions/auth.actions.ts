
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

// Define return type for consistency
type AuthResponse = {
  success: boolean;
  message: string;
  role?: string;
  userId?: string;
  token?: string;
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
  // Simulate network delay only in development
  if (process.env.NODE_ENV !== "production") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: values.email },
    });

    if (!user) {
      return {
        success: false,
        message: "Authentication failed: Invalid email or password.",
      };
    }

    if (user.role !== values.role) {
      return {
        success: false,
        message: "Authentication failed: Access denied for this role.",
      };
    }

    const passwordMatch = await bcrypt.compare(values.password, user.password);
    if (!passwordMatch) {
      return {
        success: false,
        message: "Authentication failed: Invalid email or password.",
      };
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || "fallback-secret-for-dev-change-in-prod", 
      { expiresIn: "1h" },
    );

    return {
      success: true,
      message: "Signed in successfully!",
      role: user.role,
      userId: user.id,
      token,
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

    // Handle Prisma-specific errors
    // @ts-ignore // Temporarily ignore to check if prisma.PrismaClientKnownRequestError is available
    if (error && typeof error === 'object' && 'code' in error && error.constructor.name.includes('Prisma')) {
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

    // Optionally, you might want to generate a token here too if auto-login after signup is desired
    // For now, just returning success without a token for signup.
    return {
      success: true,
      message: "Account created successfully! Please sign in.", // Changed message
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
    
    // @ts-ignore // Temporarily ignore to check if prisma.PrismaClientKnownRequestError is available
    if (error && typeof error === 'object' && 'code' in error && error.constructor.name.includes('Prisma')) {
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
