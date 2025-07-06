'use server';

import { z } from 'zod';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { Role } from '@/lib/types';

// Helper to generate a 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address.').trim().toLowerCase(),
  role: z.enum([Role.SETTER, Role.TAKER]),
});

export async function sendOtpAction(values: z.infer<typeof sendOtpSchema>): Promise<{ success: boolean; message: string }> {
  const validation = sendOtpSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: 'Invalid email.' };
  }

  const { email, role } = validation.data;

  try {
    const userResult = await query('SELECT "id", "role" FROM "User" WHERE "email" = $1', [email]);

    if (userResult.rows.length === 0 || userResult.rows[0].role !== role) {
      // Don't reveal if the user exists.
      return { success: true, message: 'If an account with this email exists, an OTP has been sent.' };
    }

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // NOTE: This assumes `resetPasswordToken` and `resetPasswordTokenExpiry` columns exist on the "User" table.
    await query(
      'UPDATE "User" SET "resetPasswordToken" = $1, "resetPasswordTokenExpiry" = $2 WHERE "email" = $3',
      [otp, expiry, email]
    );

    const message = `Your password reset OTP for AssessMint is: ${otp}. It will expire in 10 minutes.`;
    const emailApiUrl = `https://sarma.pythonanywhere.com/?email=${encodeURIComponent(email)}&message=${encodeURIComponent(message)}`;
    
    // Fire-and-forget call to the email API
    fetch(emailApiUrl).catch(err => {
        // Log error but don't fail the user-facing action because of it
        console.error("Failed to send OTP email:", err);
    });

    return { success: true, message: 'If an account with this email exists, an OTP has been sent.' };
  } catch (error) {
    console.error('Error in sendOtpAction:', error);
    return { success: false, message: 'An unexpected error occurred. Please try again.' };
  }
}

const resetPasswordSchema = z
  .object({
    email: z.string().email().trim().toLowerCase(),
    otp: z.string().length(6, 'OTP must be 6 digits.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

export async function resetPasswordAction(values: z.infer<typeof resetPasswordSchema>): Promise<{ success: boolean; message: string }> {
  const validation = resetPasswordSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: validation.error.flatten().fieldErrors.password?.[0] || validation.error.flatten().fieldErrors.confirmPassword?.[0] || 'Invalid data.' };
  }
  
  const { email, otp, password } = validation.data;

  try {
    const userResult = await query(
      'SELECT "id", "resetPasswordToken", "resetPasswordTokenExpiry" FROM "User" WHERE "email" = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return { success: false, message: 'Invalid OTP or email.' };
    }

    const user = userResult.rows[0];

    if (user.resetPasswordToken !== otp || !user.resetPasswordTokenExpiry || new Date() > new Date(user.resetPasswordTokenExpiry)) {
      return { success: false, message: 'Invalid or expired OTP.' };
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);

    await query(
      'UPDATE "User" SET "password" = $1, "resetPasswordToken" = NULL, "resetPasswordTokenExpiry" = NULL, "updatedAt" = NOW() WHERE "id" = $2',
      [hashedPassword, user.id]
    );
    
    return { success: true, message: 'Password has been reset successfully. Please sign in.' };

  } catch (error) {
    console.error('Error in resetPasswordAction:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
