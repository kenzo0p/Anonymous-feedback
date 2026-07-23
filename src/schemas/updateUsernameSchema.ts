import { z } from 'zod'
import { usernameValidation } from './signUpSchema'

export const updateUsernameSchema = z.object({
    username: usernameValidation,
})
