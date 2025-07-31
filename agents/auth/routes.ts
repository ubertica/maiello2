// Agent: Auth - Enhanced Authentication with JWT and Email Recovery

import type { Express, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import crypto from "crypto";

const prisma = new PrismaClient();

// Environment variables with defaults
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "30d";
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

// Validation schemas
const RegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(['user', 'admin']).default('user')
});

const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

const ForgotPasswordSchema = z.object({
  email: z.string().email("Valid email is required")
});

const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters")
});

// JWT utility functions
export function generateTokens(userId: number) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
}

export function verifyToken(token: string): { userId: number; type: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Token utilities for password reset
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware for JWT authentication
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'access') {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  (req as any).userId = decoded.userId;
  next();
}

// Middleware for admin-only routes
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Error in requireAdmin middleware:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Email sending function (placeholder - implement with your email service)
async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`;
  
  console.log(`Password reset email would be sent to ${email} with URL: ${resetUrl}`);
  
  // TODO: Implement actual email sending with SendGrid, Nodemailer, etc.
  // Example with SendGrid:
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  const msg = {
    to: email,
    from: process.env.FROM_EMAIL,
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link expires in 1 hour.</p>
    `
  };
  
  await sgMail.send(msg);
  */
}

export function registerAuthRoutes(app: Express) {
  // Register new user
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = RegisterSchema.parse(req.body);

      // Check if username or email already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: data.username },
            { email: data.email }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          error: existingUser.username === data.username 
            ? "Username already exists" 
            : "Email already registered"
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          username: data.username,
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: data.role
        },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      });

      // Generate tokens
      const tokens = generateTokens(user.id);

      res.status(201).json({
        message: "User registered successfully",
        user,
        ...tokens
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Login user
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const data = LoginSchema.parse(req.body);

      // Find user
      const user = await prisma.user.findUnique({
        where: { username: data.username }
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password
      const isValidPassword = await comparePasswords(data.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate tokens
      const tokens = generateTokens(user.id);

      // Return user data without password
      const { password, ...userWithoutPassword } = user;

      res.json({
        message: "Login successful",
        user: userWithoutPassword,
        ...tokens
      });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Refresh access token
  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: "Refresh token required" });
      }

      const decoded = verifyToken(refreshToken);
      if (!decoded || decoded.type !== 'refresh') {
        return res.status(403).json({ error: "Invalid refresh token" });
      }

      // Generate new tokens
      const tokens = generateTokens(decoded.userId);

      res.json(tokens);
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get current user profile
  app.get("/api/auth/profile", authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update user profile
  app.put("/api/auth/profile", authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { name, email } = req.body;

      // Check if email is already taken by another user
      if (email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email,
            NOT: { id: userId }
          }
        });

        if (existingUser) {
          return res.status(400).json({ error: "Email already in use" });
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(email && { email })
        },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      });

      res.json({
        message: "Profile updated successfully",
        user
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Change password
  app.post("/api/auth/change-password", authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const data = ChangePasswordSchema.parse(req.body);

      // Get current user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const isValidPassword = await comparePasswords(data.currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(data.newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Forgot password
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const data = ForgotPasswordSchema.parse(req.body);

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: data.email }
      });

      // Always return success message for security (don't reveal if email exists)
      if (!user) {
        return res.json({ message: "If the email exists, a reset link has been sent" });
      }

      // Generate reset token
      const resetToken = generateResetToken();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token to user (you might want to create a separate table for this)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          // Note: You'll need to add these fields to your User model in Prisma
          resetToken,
          resetTokenExpiry
        } as any
      });

      // Send reset email
      await sendPasswordResetEmail(user.email!, resetToken);

      res.json({ message: "If the email exists, a reset link has been sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Reset password
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const data = ResetPasswordSchema.parse(req.body);

      // Find user with valid reset token
      const user = await prisma.user.findFirst({
        where: {
          resetToken: data.token,
          resetTokenExpiry: {
            gt: new Date() // Token not expired
          }
        } as any
      });

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(data.password);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        } as any
      });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Logout (client-side should clear tokens)
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    // In a more sophisticated setup, you might maintain a blacklist of tokens
    res.json({ message: "Logged out successfully" });
  });

  // Validate token (for client-side verification)
  app.get("/api/auth/validate", authenticateToken, (req: Request, res: Response) => {
    res.json({ valid: true, userId: (req as any).userId });
  });
}

export default {
  registerAuthRoutes,
  authenticateToken,
  requireAdmin,
  hashPassword,
  comparePasswords,
  generateTokens,
  verifyToken
};