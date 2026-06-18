import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../../shared/config/database';
import { AppError } from '../../shared/utils/AppError';
import { JwtPayload } from './auth.types';
import { Role } from '@prisma/client';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

class AuthService {
  async register(data: Record<string, string>, deviceInfo?: string) {
    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      throw new AppError('Email is already registered', 409);
    }

    // Handle username derivation/check
    let username = data.username;
    if (!username) {
      const localPart = data.email.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '');
      username = localPart;

      let isUnique = false;
      let count = 0;
      while (!isUnique && count < 10) {
        const existing = await prisma.user.findUnique({ where: { username } });
        if (!existing) {
          isUnique = true;
        } else {
          const suffix = Math.floor(1000 + Math.random() * 9000);
          username = `${localPart}${suffix}`;
          count++;
        }
      }
    } else {
      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername) {
        throw new AppError('Username is already taken', 409);
      }
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    // Create user and cart in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          username,
          password: passwordHash,
          phone: data.phone,
        },
      });

      await tx.cart.create({
        data: {
          userId: newUser.id,
        },
      });

      return newUser;
    });

    const tokens = this.generateTokenPair(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken, deviceInfo);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(data: Record<string, string>, deviceInfo?: string) {
    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.identifier },
          { username: data.identifier },
        ],
      },
    });

    if (!user) {
      throw new AppError('Invalid email/username or password', 401);
    }

    // Check password
    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email/username or password', 401);
    }

    const tokens = this.generateTokenPair(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken, deviceInfo);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(rawRefreshToken: string, deviceInfo?: string) {
    try {
      jwt.verify(rawRefreshToken, REFRESH_SECRET);
    } catch {
      throw new AppError('Unauthorized: Invalid or expired refresh token', 401);
    }

    const hashed = hashToken(rawRefreshToken);
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: hashed },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      throw new AppError('Unauthorized: Invalid or expired refresh token', 401);
    }

    // Rotate refresh token (revoke the old one)
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    const tokens = this.generateTokenPair(tokenRecord.user);
    await this.saveRefreshToken(tokenRecord.userId, tokens.refreshToken, deviceInfo);

    return tokens;
  }

  async logout(rawRefreshToken: string) {
    const hashed = hashToken(rawRefreshToken);
    try {
      await prisma.refreshToken.update({
        where: { token: hashed },
        data: { isRevoked: true },
      });
    } catch {
      // If the token is not in DB or already revoked, fail gracefully for logout
    }
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return this.sanitizeUser(user);
  }

  async updateProfile(id: string, data: { name?: string; username?: string; phone?: string | null; avatar?: string | null; gender?: string | null }) {
    // If username is changing, check uniqueness
    if (data.username) {
      const existing = await prisma.user.findFirst({
        where: {
          username: data.username,
          NOT: { id },
        },
      });
      if (existing) {
        throw new AppError('Username is already taken', 409);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.username !== undefined && { username: data.username }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        ...(data.gender !== undefined && { gender: data.gender }),
      },
    });

    return this.sanitizeUser(updatedUser);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private generateTokenPair(user: { id: string; email: string; role: Role }) {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES as jwt.SignOptions['expiresIn'] });
    const refreshToken = jwt.sign(
      { id: user.id, jti: crypto.randomUUID() },
      REFRESH_SECRET,
      { expiresIn: REFRESH_EXPIRES as jwt.SignOptions['expiresIn'] }
    );

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, rawToken: string, deviceInfo?: string) {
    const hashed = hashToken(rawToken);
    
    // Parse duration (default 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: hashed,
        userId,
        expiresAt,
        deviceInfo: deviceInfo || null,
      },
    });
  }

  private sanitizeUser(user: Record<string, unknown>) {
    const sanitized = { ...user };
    delete sanitized.password;
    return sanitized;
  }
}

export default new AuthService();
