"use server";

import { z } from "zod";

// Simulate a database of users
const mockUsers = {
  setter: [{ email: "setter@example.com", password: "password123" }],
  taker: [{ email: "taker@example.com", password: "password123" }],
};

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  role: z.enum(["setter", "taker"]),
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string(),
  role: z.enum(["setter", "taker"]),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


export async function signInAction(values: z.infer<typeof signInSchema>) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const userExists = mockUsers[values.role].find(
    (user) => user.email === values.email && user.password === values.password
  );

  if (userExists) {
    return { success: true, message: "Signed in successfully!", role: values.role };
  } else {
    return { success: false, message: "Invalid email or password." };
  }
}

export async function signUpAction(values: z.infer<typeof signUpSchema>) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const userAlreadyExists = mockUsers[values.role].find(
    (user) => user.email === values.email
  );

  if (userAlreadyExists) {
    return { success: false, message: "User with this email already exists." };
  }

  // Simulate adding user to DB
  mockUsers[values.role].push({ email: values.email, password: values.password });
  console.log(`New user signed up (${values.role}):`, values.email);

  return { success: true, message: "Account created successfully!", role: values.role };
}
