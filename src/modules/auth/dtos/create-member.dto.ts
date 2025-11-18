import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  BusinessInAfricaType,
  ForProfitType,
  MembershipStatus,
  MembershipType,
} from '../../../database/entities/member.entity';

export class CreateMemberDto {
  // Authentication
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  // Company Information
  @IsString()
  companyName!: string;

  @IsOptional()
  @IsString()
  tradingAs?: string;

  @IsOptional()
  @IsString()
  website?: string;

  // Address (Head Office / Billing)
  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  // Primary Contact
  @IsOptional()
  @IsString()
  contact1Name?: string;

  @IsOptional()
  @IsString()
  contact1Title?: string;

  @IsOptional()
  @IsEmail()
  contact1Email?: string;

  @IsOptional()
  @IsString()
  contact1Phone?: string;

  // Secondary Contact
  @IsOptional()
  @IsString()
  contact2Name?: string;

  @IsOptional()
  @IsString()
  contact2Title?: string;

  @IsOptional()
  @IsEmail()
  contact2Email?: string;

  @IsOptional()
  @IsString()
  contact2Phone?: string;

  // Authorized Signatory & Billing Contact
  @IsOptional()
  @IsString()
  authorizedSignatory?: string;

  @IsOptional()
  @IsString()
  billingContactName?: string;

  @IsOptional()
  @IsString()
  billingContactTitle?: string;

  @IsOptional()
  @IsEmail()
  billingContactEmail?: string;

  @IsOptional()
  @IsString()
  billingContactPhone?: string;

  // Business Classification
  @IsOptional()
  @IsEnum(ForProfitType)
  forProfit?: ForProfitType;

  @IsOptional()
  @IsString()
  forProfitOther?: string;

  @IsOptional()
  @IsEnum(BusinessInAfricaType)
  businessInAfrica?: BusinessInAfricaType;

  @IsOptional()
  @IsString()
  businessInAfricaOther?: string;

  @IsOptional()
  @IsString()
  countriesOfBusiness?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  businessLanguages?: string[];

  @IsOptional()
  @IsString()
  businessLanguageOther?: string;

  @IsOptional()
  @IsString()
  businessCategory?: string;

  @IsOptional()
  @IsString()
  businessCategoryOther?: string;

  @IsOptional()
  @IsString()
  businessDescription?: string;

  @IsOptional()
  @IsString()
  servicesNeeded?: string;

  @IsOptional()
  @IsString()
  annualTurnover?: string;

  @IsOptional()
  @IsBoolean()
  shareFinancials?: boolean;

  @IsOptional()
  @IsBoolean()
  criminalLitigation?: boolean;

  @IsOptional()
  @IsBoolean()
  civilLitigation?: boolean;

  @IsOptional()
  @IsBoolean()
  deniedMembership?: boolean;

  @IsOptional()
  @IsBoolean()
  acknowledgeProcess?: boolean;

  @IsOptional()
  @IsBoolean()
  dataSharing?: boolean;

  @IsOptional()
  @IsString()
  signature?: string;

  // Membership Details
  @IsEnum(MembershipType)
  membershipType!: MembershipType;

  @IsOptional()
  @IsDateString()
  membershipStartDate?: string;

  @IsEnum(MembershipStatus)
  membershipStatus?: MembershipStatus;

  // Optional: if you want to pass initial sites on creation
  @IsOptional()
  @IsArray()
  sites?: Array<{
    // define MinigridSite fields as needed
    name: string;
    location: string;
    capacity?: number;
    // ... other site fields
  }>;
}
