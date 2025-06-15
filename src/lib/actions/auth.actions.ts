"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from 'bcryptjs';
import type { Role } from "@prisma/client"; // Import Prisma's Role enum

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  role: z.enum(["setter", "taker"]), // Keep lowercase for consistency with AuthContext
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
  role: z.enum(["setter", "taker"]), // Keep lowercase for consistency
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


export async function signInAction(values: z.infer<typeof signInSchema>) {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

  try {
    const user = await prisma.user.findUnique({
      where: { email: values.email },
    });

    if (!user) {
      return { success: false, message: "Invalid email or password." };
    }

    // Ensure role matches. Prisma's Role enum is uppercase.
    const prismaRole: Role = values.role.toUpperCase() as Role;
    if (user.role !== prismaRole) {
        return { success: false, message: "Access denied for this role." };
    }

    const passwordMatch = await bcrypt.compare(values.password, user.password);
    if (!passwordMatch) {
      return { success: false, message: "Invalid email or password." };
    }

    // Important: Do not send user object or password back to client
    return { success: true, message: "Signed in successfully!", role: values.role };

  } catch (error) {
    console.error("Sign in error:", error);
    return { success: false, message: "An unexpected error occurred during sign in." };
  }
}

export async function signUpAction(values: z.infer<typeof signUpSchema>) {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: values.email },
    });

    if (existingUser) {
      return { success: false, message: "User with this email already exists." };
    }

    const hashedPassword = await bcrypt.hash(values.password, 10);
    
    // Map role to Prisma's uppercase Role enum
    const prismaRole: Role = values.role.toUpperCase() as Role;

    const newUser = await prisma.user.create({
      data: {
        email: values.email,
        password: hashedPassword,
        role: prismaRole,
      },
    });

    // Important: Do not send user object or password back to client
    return { success: true, message: "Account created successfully!", role: values.role };

  } catch (error) {
    console.error("Sign up error:", error);
    return { success: false, message: "An unexpected error occurred during sign up." };
  }
}
