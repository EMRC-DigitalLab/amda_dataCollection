export interface VerificationResult {
  success: boolean;
  message: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    country: string;
    isVerified: boolean;
    verifiedAt?: Date | null;
  };
  verifiedBy?: string;
  verifiedAt?: Date | null;
}
