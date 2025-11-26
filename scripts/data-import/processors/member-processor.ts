// processors/member-processor.ts - Create or update Member records

import { Member } from '../../../src/database/entities/member.entity';
import { MemberRepository } from '../../../src/database/repositories/auth/member.repository';
import { MemberCreationData } from '../types';
import { DEFAULT_MEMBER_DATA } from '../config';
import { logger } from '../utils/logger';
import { DataSource } from 'typeorm';

export class MemberProcessor {
  private memberRepository: MemberRepository;

  constructor(dataSource: DataSource) {
    this.memberRepository = new MemberRepository(dataSource);
  }

  /**
   * Process member - create if doesn't exist, otherwise return existing
   */
  async processMember(memberName: string): Promise<Member> {
    logger.section('STEP 2: PROCESSING MEMBER');
    logger.info(`Processing member: ${memberName}`);

    try {
      // Generate member data
      const memberData = this.generateMemberData(memberName);

      // Check if member exists by company name
      let member = await this.memberRepository.findByCompanyName(memberName);

      if (member) {
        logger.info(`Member already exists: ${member.companyName} (ID: ${member.id})`);
        return member;
      }

      // Check by email
      member = await this.memberRepository.findByEmail(memberData.email);

      if (member) {
        logger.info(`Member found by email: ${member.companyName} (ID: ${member.id})`);
        return member;
      }

      // Create new member
      logger.info('Creating new member...');
      member = await this.memberRepository.create(memberData as any);

      logger.success(`Member created successfully: ${member.companyName} (ID: ${member.id})`);
      logger.separator();

      return member;
    } catch (error: any) {
      logger.error('Failed to process member', {
        memberName,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Generate member data with simulated values for missing fields
   */
  private generateMemberData(companyName: string): MemberCreationData {
    // Generate email in format: dev-a@amda.com, dev-b@amda.com, etc.
    const abbreviation = this.generateCompanyAbbreviation(companyName);
    const email = `${abbreviation}@amda.com`;
    const registrationNumber = `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const country = this.extractCountryFromName(companyName) || 'Tanzania';

    return {
      companyName,
      email,
      registrationNumber,
      membershipType: DEFAULT_MEMBER_DATA.membershipType,
      billingAddress: DEFAULT_MEMBER_DATA.billingAddress,
      city: DEFAULT_MEMBER_DATA.city,
      country,
      postalCode: DEFAULT_MEMBER_DATA.postalCode,
      website: DEFAULT_MEMBER_DATA.website,
      contact1Name: `${companyName} Representative`,
      contact1Title: DEFAULT_MEMBER_DATA.contact1Title,
      contact1Email: email,
      contact1Phone: `+1-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
    };
  }

  /**
   * Generate company abbreviation for email (dev-a, dev-b, etc.)
   */
  private generateCompanyAbbreviation(companyName: string): string {
    // Extract first word and first letter of second word if exists
    const words = companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/);

    if (words.length >= 2) {
      // e.g., "Dev A" -> "dev-a"
      return `${words[0]}-${words[1].charAt(0)}`;
    } else if (words.length === 1) {
      // e.g., "DevCompany" -> "dev"
      return words[0].substring(0, 10);
    }

    // Fallback
    return companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10);
  }

  /**
   * Try to extract country from company name
   */
  private extractCountryFromName(companyName: string): string | null {
    const countries = ['Tanzania', 'Kenya', 'Uganda', 'Rwanda', 'Benin', 'Nigeria', 'Ghana'];
    const nameLower = companyName.toLowerCase();

    for (const country of countries) {
      if (nameLower.includes(country.toLowerCase())) {
        return country;
      }
    }

    return null;
  }
}
