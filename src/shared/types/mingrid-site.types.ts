export class MinigridSideResponseDto {
  id!: string;
  name!: string;
  location?: string;
  description?: string;
  isActive!: boolean;

  // Company Information
  companyName?: string;
  companyType?: string;
  registrationNumber?: string;
  yearEstablished?: string;
  website?: string;

  // Primary Contact Information
  primaryContactName?: string;
  primaryContactTitle?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;

  // Company Address
  headOfficeAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;

  // AMDA Membership Details
  membershipType?: string;
  membershipStartDate?: string;
  membershipStatus?: string;
  annualDues?: string;
  countriesOfOperation?: string;

  // Business Information
  businessModel?: string;
  targetMarkets?: string;
  primaryTechnology?: string;
  minigridCount?: string;
  totalCapacityInstalled?: string;
  customerConnections?: string;

  // Additional Information
  companyMission?: string;
  keyProjects?: string;
  partnerships?: string;
  certifications?: string;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
}
