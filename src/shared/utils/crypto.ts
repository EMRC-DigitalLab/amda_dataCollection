// src/shared/utils/crypto.ts
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export class CryptoHelper {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateCustomerCode(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 999)
      .toString()
      .padStart(3, '0');
    return `AMDA-${timestamp}${random}`;
  }

  static generatePaymentReference(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 999999)
      .toString()
      .padStart(6, '0');
    return `PAY-${date}-${random}`;
  }

  static generateMeterNumber(): string {
    const random = Math.floor(Math.random() * 999999)
      .toString()
      .padStart(6, '0');
    return `MTR-${random}`;
  }
}
