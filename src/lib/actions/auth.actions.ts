
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from 'bcryptjs';
import type { Role } from "@prisma/client";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  role: z.enum(["setter", "taker"]),
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
  role: z.enum(["setter", "taker"]),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


export async function signInAction(values: z.infer<typeof signInSchema>) {
  console.log("Attempting sign-in for email:", values.email, "role:", values.role);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

  try {
    const user = await prisma.user.findUnique({
      where: { email: values.email },
    });

    if (!user) {
      console.log("Sign-in failed: User not found for email:", values.email);
      return { success: false, message: "Invalid email or password." };
    }
    console.log("Sign-in: User found:", user.id, "Role in DB:", user.role);


    const prismaRole: Role = values.role.toUpperCase() as Role;
    if (user.role !== prismaRole) {
        console.log(`Sign-in failed: Role mismatch for user ${user.id}. Expected ${prismaRole}, got ${user.role}`);
        return { success: false, message: "Access denied for this role." };
    }

    const passwordMatch = await bcrypt.compare(values.password, user.password);
    if (!passwordMatch) {
      console.log("Sign-in failed: Password mismatch for user:", user.id);
      return { success: false, message: "Invalid email or password." };
    }

    console.log("Sign-in successful for user:", user.id);
    return { success: true, message: "Signed in successfully!", role: values.role, userId: user.id };

  } catch (error) {
    console.error("SIGN_IN_ACTION_ERROR:", error);
    return { success: false, message: "An unexpected error occurred during sign in. Check server logs for details." };
  }
}

export async function signUpAction(values: z.infer<typeof signUpSchema>) {
  console.log("Attempting sign-up for email:", values.email, "role:", values.role);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: values.email },
    });

    if (existingUser) {
      console.log("Sign-up failed: User already exists with email:", values.email);
      return { success: false, message: "User with this email already exists." };
    }

    const hashedPassword = await bcrypt.hash(values.password, 10);
    
    const prismaRole: Role = values.role.toUpperCase() as Role;

    const newUser = await prisma.user.create({
      data: {
        email: values.email,
        password: hashedPassword,
        role: prismaRole,
      },
    });

    console.log("Sign-up successful for new user:", newUser.id);
    return { success: true, message: "Account created successfully!", role: values.role, userId: newUser.id };

  } catch (error) {
    console.error("SIGN_UP_ACTION_ERROR:", error);
    return { success: false, message: "An unexpected error occurred during sign up. Check server logs for details." };
  }
}

