import { z } from 'zod';

export const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    created_at: z.string(),
});

export const MerchantSchema = z.object({
    id: z.string().uuid(),
    shop_domain: z.string(),
    platform: z.enum(['shopify', 'widget']),
    plan: z.string(),
});

export type User = z.infer<typeof UserSchema>;
export type Merchant = z.infer<typeof MerchantSchema>;
