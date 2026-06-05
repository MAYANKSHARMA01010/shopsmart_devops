import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(/^[a-z0-9_.-]+$/i, "Username can only contain letters, numbers, underscores, dots, and hyphens")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Must contain at least one special character"),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, "Invalid phone number format")
    .optional()
    .or(z.literal("")),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(/^[a-z0-9_.-]+$/i, "Username can only contain letters, numbers, underscores, dots, and hyphens")
    .optional(),
  phone: z.string().optional().nullable(),
  avatar: z.string().url("Invalid avatar URL").optional().nullable(),
  gender: z.string().optional().nullable(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

export interface User {
  id: string;
  name: string;
  username: string | null;
  email: string;
  phone: string | null;
  avatar: string | null;
  gender: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "VENDOR" | "CUSTOMER";
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}
