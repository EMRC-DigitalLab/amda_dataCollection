import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateMinigridSiteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Company Information
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  yearEstablished?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  website?: string;

  // Primary Contact Information
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  primaryContactTitle?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  primaryContactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  primaryContactPhone?: string;

  // Company Address
  @IsOptional()
  @IsString()
  headOfficeAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  // AMDA Membership Details
  @IsOptional()
  @IsString()
  @MaxLength(100)
  membershipType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  membershipStartDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  membershipStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  annualDues?: string;

  @IsOptional()
  @IsString()
  countriesOfOperation?: string;

  // Business Information
  @IsOptional()
  @IsString()
  businessModel?: string;

  @IsOptional()
  @IsString()
  targetMarkets?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryTechnology?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  minigridCount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  totalCapacityInstalled?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerConnections?: string;

  // Additional Information
  @IsOptional()
  @IsString()
  companyMission?: string;

  @IsOptional()
  @IsString()
  keyProjects?: string;

  @IsOptional()
  @IsString()
  partnerships?: string;

  @IsOptional()
  @IsString()
  certifications?: string;
}

export class UpdateMinigridSiteDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Company Information
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  yearEstablished?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  website?: string;

  // Primary Contact Information
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  primaryContactTitle?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  primaryContactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  primaryContactPhone?: string;

  // Company Address
  @IsOptional()
  @IsString()
  headOfficeAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  // AMDA Membership Details
  @IsOptional()
  @IsString()
  @MaxLength(100)
  membershipType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  membershipStartDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  membershipStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  annualDues?: string;

  @IsOptional()
  @IsString()
  countriesOfOperation?: string;

  // Business Information
  @IsOptional()
  @IsString()
  businessModel?: string;

  @IsOptional()
  @IsString()
  targetMarkets?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryTechnology?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  minigridCount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  totalCapacityInstalled?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerConnections?: string;

  // Additional Information
  @IsOptional()
  @IsString()
  companyMission?: string;

  @IsOptional()
  @IsString()
  keyProjects?: string;

  @IsOptional()
  @IsString()
  partnerships?: string;

  @IsOptional()
  @IsString()
  certifications?: string;
}

// Validation schemas for manual validation if needed
export const createMinigridSiteSchema = {
  name: { required: true, type: 'string', maxLength: 255 },
  location: { required: false, type: 'string', maxLength: 255 },
  description: { required: false, type: 'string' },
  isActive: { required: false, type: 'boolean' },
  companyName: { required: false, type: 'string', maxLength: 255 },
  companyType: { required: false, type: 'string', maxLength: 100 },
  registrationNumber: { required: false, type: 'string', maxLength: 100 },
  yearEstablished: { required: false, type: 'string', maxLength: 4 },
  website: { required: false, type: 'string', format: 'url', maxLength: 255 },
  primaryContactName: { required: false, type: 'string', maxLength: 255 },
  primaryContactTitle: { required: false, type: 'string', maxLength: 100 },
  primaryContactEmail: { required: false, type: 'string', format: 'email', maxLength: 255 },
  primaryContactPhone: { required: false, type: 'string', maxLength: 50 },
  headOfficeAddress: { required: false, type: 'string' },
  city: { required: false, type: 'string', maxLength: 100 },
  state: { required: false, type: 'string', maxLength: 100 },
  country: { required: false, type: 'string', maxLength: 100 },
  postalCode: { required: false, type: 'string', maxLength: 20 },
  membershipType: { required: false, type: 'string', maxLength: 100 },
  membershipStartDate: { required: false, type: 'string', maxLength: 50 },
  membershipStatus: { required: false, type: 'string', maxLength: 50 },
  annualDues: { required: false, type: 'string', maxLength: 100 },
  countriesOfOperation: { required: false, type: 'string' },
  businessModel: { required: false, type: 'string' },
  targetMarkets: { required: false, type: 'string' },
  primaryTechnology: { required: false, type: 'string', maxLength: 255 },
  minigridCount: { required: false, type: 'string', maxLength: 50 },
  totalCapacityInstalled: { required: false, type: 'string', maxLength: 100 },
  customerConnections: { required: false, type: 'string', maxLength: 100 },
  companyMission: { required: false, type: 'string' },
  keyProjects: { required: false, type: 'string' },
  partnerships: { required: false, type: 'string' },
  certifications: { required: false, type: 'string' },
};
