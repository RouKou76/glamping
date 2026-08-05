import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function parseDuration(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return n * multipliers[match[2]];
}

interface RefreshPayload {
  sub: string;
  sid: string;
  seq: number;
  typ: 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.authSession.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });

    const { accessToken, refreshToken } = await this.createSession(
      user.id,
      user.login,
      userAgent,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<RefreshPayload>(refreshToken, {
        secret: this.config.get('JWT_SECRET'),
      });
      if (payload.typ !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const session = await this.prisma.authSession.findUnique({
        where: { id: payload.sid },
        include: { user: { include: { role: true } } },
      });

      if (!session || session.userId !== payload.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (session.expiresAt < new Date()) {
        await this.prisma.authSession.delete({ where: { id: session.id } });
        throw new UnauthorizedException('Invalid refresh token');
      }

      const presentedHash = sha256(refreshToken);
      if (!safeCompare(presentedHash, session.refreshTokenHash)) {
        if (payload.seq < session.tokenSeq) {
          await this.prisma.authSession.deleteMany({
            where: { userId: session.userId },
          });
        }
        throw new UnauthorizedException('Invalid refresh token');
      }

      const nextSeq = session.tokenSeq + 1;
      const expiresAt = new Date(
        Date.now() + parseDuration(this.config.get('REFRESH_EXPIRES_IN', '7d')),
      );
      const newRefreshToken = await this.issueRefreshToken(
        session.userId,
        session.id,
        nextSeq,
      );

      await this.prisma.authSession.update({
        where: { id: session.id },
        data: {
          refreshTokenHash: sha256(newRefreshToken),
          tokenSeq: nextSeq,
          tokenIssuedAt: new Date(),
          expiresAt,
          lastUsedAt: new Date(),
        },
      });

      const accessToken = await this.generateAccessToken(
        session.userId,
        session.user.login,
      );

      return { accessToken, refreshToken: newRefreshToken };
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    try {
      const payload = this.jwtService.verify<RefreshPayload>(refreshToken, {
        secret: this.config.get('JWT_SECRET'),
      });
      if (payload.typ === 'refresh') {
        await this.prisma.authSession.deleteMany({
          where: { id: payload.sid, userId: payload.sub },
        });
      }
    } catch {
      // ignore invalid or expired tokens — session is revoked by rotation anyway
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      login: user.login,
      name: user.name,
      role: user.role,
    };
  }

  async revokeUserSessions(userId: string) {
    await this.prisma.authSession.deleteMany({ where: { userId } });
  }

  private async createSession(
    userId: string,
    login: string,
    userAgent?: string,
  ) {
    const sid = randomUUID();
    const accessToken = await this.generateAccessToken(userId, login);
    const refreshToken = await this.issueRefreshToken(userId, sid, 1);
    const expiresAt = new Date(
      Date.now() + parseDuration(this.config.get('REFRESH_EXPIRES_IN', '7d')),
    );

    await this.prisma.authSession.create({
      data: {
        id: sid,
        userId,
        refreshTokenHash: sha256(refreshToken),
        tokenSeq: 1,
        expiresAt,
        userAgent: userAgent || null,
      },
    });

    return { accessToken, refreshToken };
  }

  private async generateAccessToken(userId: string, login: string) {
    return this.jwtService.signAsync({ sub: userId, login });
  }

  private async issueRefreshToken(userId: string, sid: string, seq: number) {
    return this.jwtService.signAsync(
      { sub: userId, sid, seq, typ: 'refresh' },
      { expiresIn: this.config.get('REFRESH_EXPIRES_IN', '7d') },
    );
  }
}
