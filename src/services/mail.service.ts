import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    if (env.SMTP_HOST && env.SMTP_PORT) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER && env.SMTP_PASS ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        } : undefined,
      });
      this.isConfigured = true;
      logger.info("Nodemailer SMTP transport initialized successfully");
    } else {
      // Fallback to local sendmail command built into macOS
      this.transporter = nodemailer.createTransport({
        sendmail: true,
        newline: "unix",
        path: "/usr/sbin/sendmail",
      });
      this.isConfigured = true;
      logger.info("Nodemailer local sendmail transport initialized successfully");
    }
  }

  async sendMail(options: { to: string; subject: string; text: string; html: string }) {
    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: env.SMTP_FROM || '"Automated Job Apply" <noreply@localhost>',
          ...options,
        });
        logger.info({ to: options.to, subject: options.subject }, "Email sent successfully");
      } catch (error) {
        logger.error({ err: error, to: options.to }, "Failed to send email");
        throw error;
      }
    } else {
      // Mock logger fallback for local development preview
      logger.info(
        `[MOCK EMAIL SENT]\nTo: ${options.to}\nSubject: ${options.subject}\nContent:\n${options.text}`
      );
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${env.CLIENT_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    const text = `You requested a password reset. Please click on the link to reset your password: ${resetUrl}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Please click the button below to reset your password:</p>
        <div style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #64748b; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;

    await this.sendMail({
      to: email,
      subject: "Reset your Password - Automated Job Apply",
      text,
      html,
    });
  }

  async sendEmailVerificationEmail(email: string, token: string) {
    const verificationUrl = `${env.CLIENT_URL || "http://localhost:3000"}/verify-email?token=${token}`;
    const text = `Please verify your email address by clicking on this link: ${verificationUrl}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2>Confirm your email address</h2>
        <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
        <div style="margin: 24px 0;">
          <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Confirm Email</a>
        </div>
        <p style="color: #64748b; font-size: 12px;">If you didn't register on our website, you can safely ignore this email.</p>
      </div>
    `;

    await this.sendMail({
      to: email,
      subject: "Confirm your Email - Automated Job Apply",
      text,
      html,
    });
  }
}

export const mailService = new MailService();
