import { z } from 'zod'

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, { message: 'Current password is required.' }),
        newPassword: z.string().min(6, { message: 'Password must be at least 6 chars.' }),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match.",
        path: ['confirmPassword'],
    })
