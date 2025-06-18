
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
  console.log("Sign-in Action: Entered. Attempting sign-in for email:", values.email, "role:", values.role);
  console.log("Sign-in Action: DATABASE_URL_IS_SET in this environment:", !!process.env.DATABASE_URL);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

  try {
    const user = await prisma.user.findUnique({
      where: { email: values.email },
    });

    if (!user) {
      console.log("Sign-in Action: User not found for email:", values.email);
      return { success: false, message: "Invalid email or password." };
    }
    console.log("Sign-in Action: User found. ID:", user.id, "DB Role:", user.role, "Hashed PW exists:", !!user.password);


    const prismaRole: Role = values.role.toUpperCase() as Role;
    if (user.role !== prismaRole) {
        console.log(`Sign-in Action: Role mismatch for user ${user.id}. Expected ${prismaRole}, got ${user.role}`);
        return { success: false, message: "Access denied for this role." };
    }

    if (!user.password) {
        console.error("Sign-in Action: User object found but password hash is missing for user:", user.id);
        return { success: false, message: "Authentication error. Please contact support." };
    }

    console.log("Sign-in Action: About to compare password for user:", user.id);
    console.log("Sign-in Action: Password from input (length):", values.password?.length);
    
    const passwordMatch = await bcrypt.compare(values.password, user.password);
    if (!passwordMatch) {
      console.log("Sign-in Action: Password mismatch for user:", user.id);
      return { success: false, message: "Invalid email or password." };
    }

    console.log("Sign-in Action: Sign-in successful for user:", user.id);
    return { success: true, message: "Signed in successfully!", role: values.role, userId: user.id };

  } catch (error) {
    console.log("SIGN_IN_ACTION_CAUGHT_AN_ERROR"); // Simple initial log
    console.error("SIGN_IN_ACTION_ERROR --- Start of Error Details ---");
    if (error instanceof Error) {
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        console.error("Error Stack (first few lines):", error.stack ? error.stack.split('\\n').slice(0, 5).join('\\n') : "No stack available");
    } else {
        console.error("Caught error is not an instance of Error. Raw error:", error);
    }
    console.error("SIGN_IN_ACTION_ERROR --- End of Error Details ---");
    
    // This message is generic; specific details should be in server logs.
    const finalMessageToClient = "An unexpected error occurred during sign in. Please check server logs for detailed error information.";
    console.log("Sign-in Action: Returning error message to client:", finalMessageToClient);
    return { success: false, message: finalMessageToClient };
  }
}

export async function signUpAction(values: z.infer<typeof signUpSchema>) {
  console.log("Sign-up Action: Attempting sign-up for email:", values.email, "role:", values.role);
  await new Promise(resolve => setTimeout(resolve, 1000)); 

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: values.email },
    });

    if (existingUser) {
      console.log("Sign-up Action: User already exists with email:", values.email);
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

    console.log("Sign-up Action: Sign-up successful for new user:", newUser.id);
    return { success: true, message: "Account created successfully!", role: values.role, userId: newUser.id };

  } catch (error) {
    console.log("SIGN_UP_ACTION_CAUGHT_AN_ERROR");
    console.error("SIGN_UP_ACTION_ERROR --- Start of Error Details ---");
     if (error instanceof Error) {
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        console.error("Error Stack (first few lines):", error.stack ? error.stack.split('\\n').slice(0, 5).join('\\n') : "No stack available");
    } else {
        console.error("Caught error is not an instance of Error. Raw error:", error);
    }
    console.error("SIGN_UP_ACTION_ERROR --- End of Error Details ---");
    const finalMessageToClient = "An unexpected error occurred during sign up. Please check server logs for detailed error information.";
    console.log("Sign-up Action: Returning error message to client:", finalMessageToClient);
    return { success: false, message: finalMessageToClient };
  }
}
