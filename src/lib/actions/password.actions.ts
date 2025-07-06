
'use server';

import { z } from 'zod';
import { query } from '@/lib/db';
import { Role } from '@/lib/types';
import type { AuthResponse } from './auth.actions';
import { hash, compare } from 'bcryptjs';

// Helper to generate a 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address.').trim().toLowerCase(),
});

export async function sendOtpAction(email: string, role: Role): Promise<{ success: boolean; message: string }> {
  const validation = sendOtpSchema.safeParse({ email });
  if (!validation.success) {
    return { success: false, message: 'Invalid email address provided.' };
  }

  if (!role || (role !== Role.SETTER && role !== Role.TAKER)) {
      return { success: false, message: 'A valid user role must be specified.' };
  }

  try {
    const userResult = await query('SELECT "id", "role" FROM "User" WHERE "email" = $1', [email]);

    if (userResult.rows.length === 0 || userResult.rows[0].role !== role) {
      return { success: true, message: 'If an account with this email and role exists, an OTP will be sent.' };
    }

    const otp = generateOtp();
    const hashedOtp = await hash(otp, 10); // Hash the OTP before storing
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store the hashed OTP and expiry in the database
    await query(
      'UPDATE "User" SET "resetPasswordToken" = $1, "resetPasswordTokenExpiry" = $2 WHERE "email" = $3',
      [hashedOtp, expiry, email]
    );

    // "Fire-and-forget" the API call to send the plain text OTP
    const url = 'https://sendgmail-bgty.onrender.com/send-email';
    
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        host: 'smtp.gmail.com',
        to: email,
        subject: 'Your AssessMint Sign-in OTP',
        body: `Your one-time password is: ${otp}\n\nThis code will expire in 10 minutes.`,
      }),
    }).catch(error => {
      console.error("Failed to send verification email (fire-and-forget):", error);
    });

    return { success: true, message: 'An OTP has been sent to your email address. It will expire in 10 minutes.' };

  } catch (error) {
    console.error('Error in sendOtpAction:', error);
    return { success: false, message: 'An unexpected server error occurred. Please try again.' };
  }
}

const signInWithOtpSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  otp: z.string().length(6, 'OTP must be 6 digits.').regex(/^\d{6}$/, 'OTP must contain only digits.'),
  role: z.enum([Role.SETTER, Role.TAKER]),
});

export async function signInWithOtpAction(values: z.infer<typeof signInWithOtpSchema>): Promise<AuthResponse> {
  const validation = signInWithOtpSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: validation.error.flatten().fieldErrors.otp?.[0] || 'Invalid data.' };
  }

  const { email, otp, role } = validation.data;

  try {
    const userResult = await query(
      'SELECT "id", "role", "resetPasswordToken", "resetPasswordTokenExpiry" FROM "User" WHERE LOWER("email") = LOWER($1)',
      [email]
    );

    if (userResult.rows.length === 0) {
      return { success: false, message: 'Invalid OTP or email.' };
    }

    const user = userResult.rows[0];

    if (user.role !== role) {
      return { success: false, message: 'Invalid OTP or email for this role.' };
    }
    
    if (!user.resetPasswordToken) {
      return { success: false, message: 'Invalid or expired OTP.' };
    }

    const isOtpValid = await compare(otp, user.resetPasswordToken);
    if (!isOtpValid || !user.resetPasswordTokenExpiry || new Date() > new Date(user.resetPasswordTokenExpiry)) {
      return { success: false, message: 'Invalid or expired OTP.' };
    }

    await query(
      'UPDATE "User" SET "resetPasswordToken" = NULL, "resetPasswordTokenExpiry" = NULL, "updatedAt" = NOW() WHERE "id" = $1',
      [user.id]
    );

    return {
      success: true,
      message: 'Signed in successfully!',
      role: user.role,
      userId: user.id,
    };
  } catch (error: any) {
    console.error('Error in signInWithOtpAction:', {
      error: error.message,
      stack: error.stack,
      email,
    });
    if (error.code === 'ECONNREFUSED') {
      return { success: false, message: 'Database connection error. Please try again later.' };
    }
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
