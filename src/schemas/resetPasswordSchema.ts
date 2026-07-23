import { z } from 'zod'

export const resetPasswordSchema = z.object({
    email: z.string().email({ message: 'Invalid email address.' }),
    code: z.string().length(6, 'Reset code must be 6 digits'),
    password: z.string().min(6, { message: 'Password must be at least 6 chars.' }),
})
