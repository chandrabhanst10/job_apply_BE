import crypto from "node:crypto";
import { env, isProduction } from "../../config/env.js";
import { BadRequestError, ConflictError, ForbiddenError, UnauthorizedError } from "../../utils/app-error.js";
import { sha256 } from "../../utils/crypto.js";
import { signAccessToken, signPurposeToken, signRefreshToken, verifyPurposeToken, verifyRefreshToken } from "../../utils/jwt.js";
import type { UserDocument } from "./model.js";
import {
  createUser,
  createRefreshToken,
  findUserByEmail,
  findUserById,
  findActiveRefreshToken,
  findRecentlyRevokedRefreshToken,
  markEmailVerified,
  updateUserPassword,
  revokeRefreshToken,
  revokeRefreshTokenFamily,
  revokeAllRefreshTokensForUser
} from "./core/index.js";
import { auditService } from "../audit/service.js";
import { logger } from "../../config/logger.js";
import { mailService } from "../../services/mail.service.js";
import type { AuthContext } from "./types.js";

export class AuthService {
  async register(input: { name: string; email: string; password: string; termsAccepted?: boolean; privacyAccepted?: boolean; cookieAccepted?: boolean }, context: AuthContext) {
    const existing = await findUserByEmail(input.email);
    if (existing) throw new ConflictError("Email is already registered");
    const user = await createUser({ ...input, ipAddress: context.ip });
    await auditService.record({ userId: user._id.toString(), action: "auth.register", resource: "user", resourceId: user._id.toString(), ...context });
    const tokens = await this.issueTokens(user, context);
    const emailVerificationToken = signPurposeToken(user._id.toString(), "email");
    
    mailService.sendEmailVerificationEmail(user.email, emailVerificationToken).catch((err) => {
      logger.error({ err }, "Failed to send email verification email");
    });

    return { user: this.toPublicUser(user), ...tokens, emailVerificationToken };
  }

  async login(input: { email: string; password: string }, context: AuthContext) {
    const user = await findUserByEmail(input.email, true);
    if (!user || !(await user.comparePassword(input.password))) throw new UnauthorizedError("Invalid email or password");
    await auditService.record({ userId: user._id.toString(), action: "auth.login", resource: "user", resourceId: user._id.toString(), ...context });
    return { user: this.toPublicUser(user), ...(await this.issueTokens(user, context)) };
  }

  async refresh(refreshToken: string, context: AuthContext) {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = sha256(refreshToken);
    const stored = await findActiveRefreshToken(tokenHash);

    if (!stored) {
      const recentlyRevoked = await findRecentlyRevokedRefreshToken(tokenHash, 30000);
      if (recentlyRevoked) {
        const user = await findUserById(payload.sub);
        if (!user) throw new UnauthorizedError("User no longer exists");
        const accessToken = signAccessToken({ sub: user._id.toString(), email: user.email, role: user.role });
        return { accessToken, refreshToken };
      }

      await revokeRefreshTokenFamily(payload.tokenId, context.ip);
      throw new UnauthorizedError("Invalid refresh token");
    }
    const user = await findUserById(payload.sub);
    if (!user) throw new UnauthorizedError("User no longer exists");
    const familyId = stored.familyId;
    const tokenId = crypto.randomUUID();
    const accessToken = signAccessToken({ sub: user._id.toString(), email: user.email, role: user.role });
    const newRefreshToken = signRefreshToken({ sub: user._id.toString(), email: user.email, role: user.role, tokenId });
    await revokeRefreshToken(tokenHash, context.ip, sha256(newRefreshToken));
    await createRefreshToken({
      userId: user._id,
      tokenHash: sha256(newRefreshToken),
      familyId,
      expiresAt: this.refreshExpiry(),
      createdByIp: context.ip,
      userAgent: context.userAgent
    });
    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string | undefined, userId: string | undefined, context: AuthContext) {
    if (refreshToken) await revokeRefreshToken(sha256(refreshToken), context.ip);
    if (userId) await auditService.record({ userId, action: "auth.logout", resource: "user", resourceId: userId, ...context });
  }

  async verifyEmail(token: string) {
    const payload = verifyPurposeToken(token, "email");
    if (payload.purpose !== "email") throw new ForbiddenError("Invalid verification token");
    await markEmailVerified(payload.sub);
  }

  async forgotPassword(email: string) {
    const user = await findUserByEmail(email);
    if (!user) return { resetToken: null };
    const resetToken = signPurposeToken(user._id.toString(), "password-reset");

    mailService.sendPasswordResetEmail(user.email, resetToken).catch((err) => {
      logger.error({ err }, "Failed to send password reset email");
    });

    return { resetToken };
  }

  async resetPassword(token: string, password: string) {
    const payload = verifyPurposeToken(token, "password-reset");
    if (payload.purpose !== "password-reset") throw new ForbiddenError("Invalid reset token");
    await updateUserPassword(payload.sub, password);
    await revokeAllRefreshTokensForUser(payload.sub);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await findUserById(userId, true);
    if (!user || !(await user.comparePassword(currentPassword))) throw new UnauthorizedError("Current password is incorrect");
    await updateUserPassword(userId, newPassword);
    await revokeAllRefreshTokensForUser(userId);
  }

  async currentUser(userId: string) {
    const user = await findUserById(userId);
    if (!user) throw new UnauthorizedError("User no longer exists");
    return this.toPublicUser(user);
  }

  cookieOptions() {
    return { httpOnly: true, secure: isProduction || env.COOKIE_SECURE, sameSite: "lax" as const, domain: env.COOKIE_DOMAIN || undefined };
  }

  toPublicUser(user: UserDocument) {
    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      profile: user.profile,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  private async issueTokens(user: UserDocument, context: AuthContext) {
    const tokenId = crypto.randomUUID();
    const accessToken = signAccessToken({ sub: user._id.toString(), email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ sub: user._id.toString(), email: user.email, role: user.role, tokenId });
    await createRefreshToken({
      userId: user._id,
      tokenHash: sha256(refreshToken),
      familyId: tokenId,
      expiresAt: this.refreshExpiry(),
      createdByIp: context.ip,
      userAgent: context.userAgent
    });
    return { accessToken, refreshToken };
  }

  private refreshExpiry() {
    return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  }

  async oauthLogin(provider: string, code: string, context: AuthContext) {
    let email = "";
    let name = "";

    if (provider === "google") {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
        throw new BadRequestError("Google OAuth is not configured on the server.");
      }
      
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: env.GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenRes.ok) throw new UnauthorizedError("Google code exchange failed");
      const tokens = (await tokenRes.json()) as { access_token: string };

      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!userRes.ok) throw new UnauthorizedError("Google user profile fetch failed");
      const profile = (await userRes.json()) as { email: string; name: string };
      email = profile.email;
      name = profile.name || email.split("@")[0];
      
    } else if (provider === "github") {
      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.GITHUB_REDIRECT_URI) {
        throw new BadRequestError("GitHub OAuth is not configured on the server.");
      }

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          code,
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          redirect_uri: env.GITHUB_REDIRECT_URI,
        }),
      });
      if (!tokenRes.ok) throw new UnauthorizedError("GitHub code exchange failed");
      const tokens = (await tokenRes.json()) as { access_token: string };

      const userRes = await fetch("https://api.github.com/user", {
        headers: { 
          Authorization: `Bearer ${tokens.access_token}`,
          "User-Agent": "automated-job-apply"
        },
      });
      if (!userRes.ok) throw new UnauthorizedError("GitHub user profile fetch failed");
      const profile = (await userRes.json()) as { email: string | null; name: string | null; login: string };
      name = profile.name || profile.login;
      
      if (profile.email) {
        email = profile.email;
      } else {
        const emailsRes = await fetch("https://api.github.com/user/emails", {
          headers: { 
            Authorization: `Bearer ${tokens.access_token}`,
            "User-Agent": "automated-job-apply"
          },
        });
        if (emailsRes.ok) {
          const emails = (await emailsRes.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
          const primary = emails.find(e => e.primary) || emails[0];
          if (primary) email = primary.email;
        }
      }
      if (!email) throw new BadRequestError("GitHub registration failed: Email address is required.");

    } else if (provider === "linkedin") {
      if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_CLIENT_SECRET || !env.LINKEDIN_REDIRECT_URI) {
        throw new BadRequestError("LinkedIn OAuth is not configured on the server.");
      }

      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: env.LINKEDIN_REDIRECT_URI,
          client_id: env.LINKEDIN_CLIENT_ID,
          client_secret: env.LINKEDIN_CLIENT_SECRET,
        }).toString(),
      });
      if (!tokenRes.ok) throw new UnauthorizedError("LinkedIn code exchange failed");
      const tokens = (await tokenRes.json()) as { access_token: string };

      const userRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!userRes.ok) throw new UnauthorizedError("LinkedIn user profile fetch failed");
      const profile = (await userRes.json()) as { email: string; name: string; given_name?: string; family_name?: string };
      email = profile.email;
      name = profile.name || `${profile.given_name || ""} ${profile.family_name || ""}`.trim() || email.split("@")[0];

    } else {
      throw new BadRequestError(`OAuth provider "${provider}" is not supported.`);
    }

    let user = await findUserByEmail(email);
    if (!user) {
      user = await createUser({
        name,
        email,
        password: crypto.randomBytes(16).toString("hex"),
      });
      await markEmailVerified(user._id.toString());
    }

    await auditService.record({ 
      userId: user._id.toString(), 
      action: "auth.oauth_login", 
      resource: "user", 
      resourceId: user._id.toString(), 
      metadata: { provider },
      ...context 
    });

    const tokens = await this.issueTokens(user, context);
    return { user: this.toPublicUser(user), ...tokens };
  }
}

export const authService = new AuthService();
