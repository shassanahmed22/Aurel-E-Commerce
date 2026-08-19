import { z } from "zod";

export const addressSchema = z.object({
  fullName: z.string().min(1).max(200),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  region: z.string().max(100).optional(),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2),
  phone: z.string().max(30).optional(),
});

export const checkoutRequestSchema = z.object({
  email: z.string().email(),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(10),
      })
    )
    .min(1)
    .max(20),
  shippingAddress: addressSchema,
  couponCode: z.string().max(50).optional(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
