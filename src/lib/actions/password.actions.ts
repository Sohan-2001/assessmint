
'use server';

import { z } from 'zod';
import { query } from '@/lib/db';
import { Role } from '@/lib/types';
import type { AuthResponse } from './auth.actions';

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
      // Don't reveal if the user exists for security reasons (user enumeration).
      // Always return a positive-sounding message. The email will only be sent if they exist.
      return { success: true, message: 'If an account with this email and role exists, an OTP has been sent.' };
    }

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // NOTE: This assumes `resetPasswordToken` and `resetPasswordTokenExpiry` columns exist on the "User" table.
    await query(
      'UPDATE "User" SET "resetPasswordToken" = $1, "resetPasswordTokenExpiry" = $2 WHERE "email" = $3',
      [otp, expiry, email]
    );

    const message = `Your sign-in OTP for AssessMint is: ${otp}. It will expire in 10 minutes.`;
    const emailApiUrl = `https://sarma.pythonanywhere.com/?email=${encodeURIComponent(email)}&message=${encodeURIComponent(message)}`;
    
    // Fire-and-forget call to the email API
    fetch(emailApiUrl).catch(err => {
        // Log error but don't fail the user-facing action because of it
        console.error("Failed to send OTP email:", err);
    });

    return { success: true, message: 'If an account with this email and role exists, an OTP has been sent.' };
  } catch (error) {
    console.error('Error in sendOtpAction:', error);
    return { success: false, message: 'An unexpected error occurred. Please try again.' };
  }
}

const signInWithOtpSchema = z.object({
    email: z.string().email().trim().toLowerCase(),
    otp: z.string().length(6, 'OTP must be 6 digits.'),
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
        'SELECT "id", "role", "resetPasswordToken", "resetPasswordTokenExpiry" FROM "User" WHERE "email" = $1',
        [email]
        );

        if (userResult.rows.length === 0) {
        return { success: false, message: 'Invalid OTP or email.' };
        }

        const user = userResult.rows[0];
        
        if (user.role !== role) {
        return { success: false, message: 'Invalid OTP or email for this role.' };
        }

        if (user.resetPasswordToken !== otp || !user.resetPasswordTokenExpiry || new Date() > new Date(user.resetPasswordTokenExpiry)) {
        return { success: false, message: 'Invalid or expired OTP.' };
        }
        
        // Clear the token after successful use
        await query(
        'UPDATE "User" SET "resetPasswordToken" = NULL, "resetPasswordTokenExpiry" = NULL, "updatedAt" = NOW() WHERE "id" = $1',
        [user.id]
        );
        
        // Return a successful sign-in response
        return { 
            success: true, 
            message: 'Signed in successfully!',
            role: user.role,
            userId: user.id
        };

    } catch (error) {
        console.error('Error in signInWithOtpAction:', error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}
