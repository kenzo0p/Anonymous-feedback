import { z } from 'zod'

export const updatePromptSchema = z.object({
    prompt: z
        .string()
        .max(150, { message: 'Prompt must be 150 characters or fewer.' }),
})
