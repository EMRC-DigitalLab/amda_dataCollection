import * as ExcelJS from 'exceljs';
import { FormStatus } from '../../../database/entities/form.entity';
import { Member, MembershipStatus } from '../../../database/entities/member.entity';
import { MemberRepository } from '../../../database/repositories/auth/member.repository';
import { UserRepository } from '../../../database/repositories/auth/user.repository';
import { FormRepository } from '../../../database/repositories/forms/form.repository';
import { AppError } from '../../../shared/middleware/error.middleware';
import { IMember, IMemberService } from '../interfaces/member.interface';

export class MemberService implements IMemberService {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly userRepository: UserRepository,
    private readonly formRepository: FormRepository
  ) {}

  async getAllMembers(): Promise<Member[]> {
    return await this.memberRepository.findAll();
  }

  async getMemberById(id: string): Promise<Member> {
    const member = await this.memberRepository.findById(id);
    if (!member) {
      throw new AppError(`Member with ID ${id} not found`, 404);
    }
    return member;
  }

  async getMemberByUserId(userId: string): Promise<Member> {
    const member = await this.memberRepository.findByUserId(userId);
    if (!member) {
      throw new AppError(`Member for user ID ${userId} not found`, 404);
    }
    return member;
  }

  async getMemberByEmail(email: string): Promise<Member> {
    const member = await this.memberRepository.findByEmail(email);
    if (!member) {
      throw new AppError(`Member with email ${email} not found`, 404);
    }
    return member;
  }

  async createMember(memberData: IMember): Promise<IMember> {
    console.log(memberData, 'this is member data');

    // Check if user already has a member profiled
    const existingMemberByCompanyName = await this.memberRepository.findByCompanyName(
      memberData.companyName
    );
    if (existingMemberByCompanyName) {
      throw new AppError('User already has a member profile', 409);
    }

    // Check if email already exists
    const existingMemberByEmail = await this.memberRepository.findByEmail(memberData.email!);
    if (existingMemberByEmail) {
      throw new AppError('Member with this email already exists', 409);
    }

    const memberToCreate: Partial<Member | any> = {
      ...memberData,
      // membershipStartDate: new Date(memberData.membershipStartDate),
    };

    return await this.memberRepository.create(memberToCreate);
  }

  async updateMember(id: string, memberData: Partial<IMember>): Promise<IMember> {
    const existingMember = await this.getMemberById(id);

    // Check if email is being updated and if it already exists
    if (memberData.email && memberData.email !== existingMember.email) {
      const memberWithEmail = await this.memberRepository.findByEmail(memberData.email);
      if (memberWithEmail && memberWithEmail.id !== id) {
        throw new AppError('Member with this email already exists', 409);
      }
    }

    // Check if registration number is being updated and if it already exists
    if (
      memberData.registrationNumber &&
      memberData.registrationNumber !== existingMember.registrationNumber
    ) {
      const memberWithRegNo = await this.memberRepository.findByRegistrationNumber(
        memberData.registrationNumber
      );
      if (memberWithRegNo && memberWithRegNo.id !== id) {
        throw new AppError('Member with this registration number already exists', 409);
      }
    }

    // @ts-ignore

    const updateData: Partial<Member> = { ...memberData };

    // Convert date string to Date object if provided
    if (memberData.membershipStartDate) {
      updateData.membershipStartDate = new Date(memberData.membershipStartDate);
    }

    const updatedMember = await this.memberRepository.update(id, updateData);
    if (!updatedMember) {
      throw new AppError(`Member with ID ${id} not found`, 404);
    }

    return updatedMember;
  }

  async deleteMember(id: string): Promise<void> {
    const member = await this.getMemberById(id);
    const deleted = await this.memberRepository.delete(id);
    if (!deleted) {
      throw new AppError(`Failed to delete member with ID ${id}`, 500);
    }
  }

  async getMembersByStatus(status: MembershipStatus): Promise<Member[]> {
    return await this.memberRepository.findByMembershipStatus(status);
  }

  async getMembersByCountry(country: string): Promise<Member[]> {
    return await this.memberRepository.findByCountry(country);
  }

  async searchMembers(query: string): Promise<Member[]> {
    return await this.memberRepository.searchMembers(query);
  }

  async updateMemberStatus(id: string, status: MembershipStatus): Promise<IMember> {
    return await this.updateMember(id, { membershipStatus: status });
  }

  // NEW VERIFICATION METHODS
  async verifyMember(id: string, adminId?: string): Promise<Member> {
    const member = await this.getMemberById(id);

    // Use the entity method to mark as verified
    member.markAsVerified(adminId);

    const updatedMember = await this.memberRepository.update(id, {
      isVerified: member.isVerified,
      verifiedAt: member.verifiedAt,
      verifiedByAdminId: member.verifiedByAdminId,
    });

    if (!updatedMember) {
      throw new AppError(`Failed to verify member with ID ${id}`, 500);
    }

    return updatedMember;
  }

  async unverifyMember(id: string): Promise<Member> {
    const member = await this.getMemberById(id);

    // Use the entity method to mark as unverified
    member.markAsUnverified();

    const updatedMember = await this.memberRepository.update(id, {
      isVerified: member.isVerified,
      verifiedAt: member.verifiedAt,
      verifiedByAdminId: member.verifiedByAdminId,
    });

    if (!updatedMember) {
      throw new AppError(`Failed to unverify member with ID ${id}`, 500);
    }

    return updatedMember;
  }

  async getAllMembersWithVerificationStatus(): Promise<{
    verified: Member[];
    unverified: Member[];
    total: number;
    verifiedCount: number;
    unverifiedCount: number;
  }> {
    const allMembers = await this.memberRepository.findAll();

    const verified = allMembers.filter(member => member.isVerified);
    const unverified = allMembers.filter(member => !member.isVerified);

    return {
      verified,
      unverified,
      total: allMembers.length,
      verifiedCount: verified.length,
      unverifiedCount: unverified.length,
    };
  }

  async getVerifiedMembers(): Promise<Member[]> {
    return await this.memberRepository.findByVerificationStatus(true);
  }

  async getUnverifiedMembers(): Promise<Member[]> {
    return await this.memberRepository.findByVerificationStatus(false);
  }

  async getMembersWithFilters(filters: {
    status?: MembershipStatus;
    country?: string;
    membershipType?: string;
    search?: string;
    isVerified?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    members: Member[];
    total?: number;
    totalPages?: number;
    currentPage?: number;
  }> {
    if (filters.page && filters.limit) {
      const result = await this.memberRepository.findWithPagination(filters.page, filters.limit);
      return {
        ...result,
        currentPage: filters.page,
      };
    }

    const members = await this.memberRepository.findMembersWithFilters(filters);
    return { members };
  }

  async validateMembershipData(data: Partial<Member>): Promise<void> {
    if (data.email) {
      const existingMember = await this.memberRepository.findByEmail(data.email);
      if (existingMember) {
        throw new AppError('Email already exists', 409);
      }
    }

    if (data.registrationNumber) {
      const existingMember = await this.memberRepository.findByRegistrationNumber(
        data.registrationNumber
      );
      if (existingMember) {
        throw new AppError('Registration number already exists', 409);
      }
    }
  }

  async exportMembersToExcel(filters: {
    status?: MembershipStatus;
    country?: string;
    membershipType?: string;
    isVerified?: boolean;
  }): Promise<Buffer> {
    try {
      // Fetch members with their minigrid sites
      const members = await this.memberRepository.findMembersWithSites(filters);

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'AMDA System';
      workbook.created = new Date();

      // Create Members Sheet
      const membersSheet = workbook.addWorksheet('Members', {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
      });

      // Define Members columns
      membersSheet.columns = [
        { header: 'Member ID', key: 'memberId', width: 15 },
        { header: 'Company Name', key: 'companyName', width: 30 },
        { header: 'Trading As', key: 'tradingAs', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Website', key: 'website', width: 30 },
        { header: 'Country', key: 'country', width: 20 },
        { header: 'City', key: 'city', width: 20 },
        { header: 'Billing Address', key: 'billingAddress', width: 40 },
        { header: 'Postal Code', key: 'postalCode', width: 15 },
        { header: 'Registration Number', key: 'registrationNumber', width: 20 },
        { header: 'Contact 1 Name', key: 'contact1Name', width: 25 },
        { header: 'Contact 1 Title', key: 'contact1Title', width: 25 },
        { header: 'Contact 1 Email', key: 'contact1Email', width: 30 },
        { header: 'Contact 1 Phone', key: 'contact1Phone', width: 20 },
        { header: 'Contact 2 Name', key: 'contact2Name', width: 25 },
        { header: 'Contact 2 Title', key: 'contact2Title', width: 25 },
        { header: 'Contact 2 Email', key: 'contact2Email', width: 30 },
        { header: 'Contact 2 Phone', key: 'contact2Phone', width: 20 },
        { header: 'Authorized Signatory', key: 'authorizedSignatory', width: 25 },
        { header: 'Billing Contact Name', key: 'billingContactName', width: 25 },
        { header: 'Billing Contact Email', key: 'billingContactEmail', width: 30 },
        { header: 'Billing Contact Phone', key: 'billingContactPhone', width: 20 },
        { header: 'For Profit', key: 'forProfit', width: 15 },
        { header: 'Business In Africa', key: 'businessInAfrica', width: 20 },
        { header: 'Countries of Business', key: 'countriesOfBusiness', width: 40 },
        { header: 'Business Languages', key: 'businessLanguages', width: 30 },
        { header: 'Business Category', key: 'businessCategory', width: 25 },
        { header: 'Business Description', key: 'businessDescription', width: 50 },
        { header: 'Services Needed', key: 'servicesNeeded', width: 40 },
        { header: 'Annual Turnover', key: 'annualTurnover', width: 20 },
        { header: 'Membership Type', key: 'membershipType', width: 20 },
        { header: 'Membership Status', key: 'membershipStatus', width: 20 },
        { header: 'Membership Start Date', key: 'membershipStartDate', width: 20 },
        { header: 'Is Verified', key: 'isVerified', width: 15 },
        { header: 'Verified At', key: 'verifiedAt', width: 20 },
        { header: 'Total Sites', key: 'totalSites', width: 15 },
        { header: 'Created At', key: 'createdAt', width: 20 },
      ];

      // Style header row
      membersSheet.getRow(1).font = { bold: true, size: 12 };
      membersSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      membersSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Add member data
      members.forEach(member => {
        membersSheet.addRow({
          memberId: member.memberId,
          companyName: member.companyName,
          tradingAs: member.tradingAs,
          email: member.email,
          website: member.website,
          country: member.country,
          city: member.city,
          billingAddress: member.billingAddress,
          postalCode: member.postalCode,
          registrationNumber: member.registrationNumber,
          contact1Name: member.contact1Name,
          contact1Title: member.contact1Title,
          contact1Email: member.contact1Email,
          contact1Phone: member.contact1Phone,
          contact2Name: member.contact2Name,
          contact2Title: member.contact2Title,
          contact2Email: member.contact2Email,
          contact2Phone: member.contact2Phone,
          authorizedSignatory: member.authorizedSignatory,
          billingContactName: member.billingContactName,
          billingContactEmail: member.billingContactEmail,
          billingContactPhone: member.billingContactPhone,
          forProfit: member.forProfit,
          businessInAfrica: member.businessInAfrica,
          countriesOfBusiness: member.countriesOfBusiness,
          businessLanguages: Array.isArray(member.businessLanguages)
            ? member.businessLanguages.join(', ')
            : member.businessLanguages,
          businessCategory: member.businessCategory,
          businessDescription: member.businessDescription,
          servicesNeeded: member.servicesNeeded,
          annualTurnover: member.annualTurnover,
          membershipType: member.membershipType,
          membershipStatus: member.membershipStatus,
          membershipStartDate: member.membershipStartDate
            ? new Date(member.membershipStartDate).toLocaleDateString()
            : '',
          isVerified: member.isVerified ? 'Yes' : 'No',
          verifiedAt: member.verifiedAt ? new Date(member.verifiedAt).toLocaleDateString() : '',
          totalSites: member.sites?.length || 0,
          createdAt: new Date(member.createdAt).toLocaleDateString(),
        });
      });

      // Create Minigrid Sites Sheet
      const sitesSheet = workbook.addWorksheet('Minigrid Sites', {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
      });

      // Define Sites columns
      sitesSheet.columns = [
        { header: 'Site ID', key: 'siteId', width: 15 },
        { header: 'Site Name', key: 'name', width: 30 },
        { header: 'Member ID', key: 'memberId', width: 15 },
        { header: 'Company Name', key: 'companyName', width: 30 },
        { header: 'Country', key: 'country', width: 20 },
        { header: 'Region', key: 'region', width: 20 },
        { header: 'District', key: 'district', width: 20 },
        { header: 'Village', key: 'village', width: 20 },
        { header: 'Latitude', key: 'lat', width: 15 },
        { header: 'Longitude', key: 'lon', width: 15 },
        { header: 'Commissioning Date', key: 'commissioningDate', width: 20 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Generation Type', key: 'generationType', width: 25 },
        { header: 'Installed Capacity (kW)', key: 'installedCapacityKw', width: 20 },
        { header: 'Peak Load (kW)', key: 'peakLoadKw', width: 15 },
        { header: 'Connected Customers', key: 'connectedCustomers', width: 20 },
        { header: 'Residential Customers', key: 'customerMixResidential', width: 20 },
        { header: 'Commercial Customers', key: 'customerMixCommercial', width: 20 },
        { header: 'Productive Customers', key: 'customerMixProductive', width: 20 },
        { header: 'Tariff Model', key: 'tariffModel', width: 30 },
        { header: 'License No', key: 'licenseNo', width: 20 },
        { header: 'Developer', key: 'developer', width: 25 },
        { header: 'Year Added', key: 'yearAdded', width: 15 },
        { header: 'Created At', key: 'createdAt', width: 20 },
      ];

      // Style header row
      sitesSheet.getRow(1).font = { bold: true, size: 12 };
      sitesSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' },
      };
      sitesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Add site data
      members.forEach(member => {
        if (member.sites && member.sites.length > 0) {
          member.sites.forEach(site => {
            sitesSheet.addRow({
              siteId: site.siteId,
              name: site.name,
              memberId: member.memberId,
              companyName: member.companyName,
              country: site.country,
              region: site.region,
              district: site.district,
              village: site.village,
              lat: site.lat,
              lon: site.lon,
              commissioningDate: site.commissioningDate
                ? new Date(site.commissioningDate).toLocaleDateString()
                : '',
              status: site.status,
              generationType: site.generationType,
              installedCapacityKw: site.installedCapacityKw,
              peakLoadKw: site.peakLoadKw,
              connectedCustomers: site.connectedCustomers,
              customerMixResidential: site.customerMixResidential,
              customerMixCommercial: site.customerMixCommercial,
              customerMixProductive: site.customerMixProductive,
              tariffModel: site.tariffModel,
              licenseNo: site.licenseNo,
              developer: site.developer,
              yearAdded: site.yearAdded,
              createdAt: new Date(site.createdAt).toLocaleDateString(),
            });
          });
        }
      });

      // Generate Excel file buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error: any) {
      throw new AppError(`Failed to export members to Excel: ${error.message}`, 500);
    }
  }
  async exportSingleMemberToExcel(memberId: string): Promise<Buffer> {
    try {
      // 1. Fetch member with their sites
      const member = await this.memberRepository.findById(memberId);
      if (!member) {
        throw new AppError('Member not found', 404);
      }

      // Fetch member's sites
      const memberWithSites = await this.memberRepository.findMembersWithSites({
        // Add filter to get only this member
      });
      const memberData = memberWithSites.find(m => m.id === memberId);

      // 2. Fetch all published forms
      const [allForms] = await this.formRepository.findAllForms({
        status: FormStatus.PUBLISHED,
      });

      // 3. For each form, check if member has submissions
      const memberFormSubmissions: Array<{
        form: any;
        submissions: any[];
      }> = [];

      for (const form of allForms) {
        if (form.tableCreated && form.tableName) {
          try {
            console.log(memberId, "this is memberId")
            // Get submissions for this member
            const submissions = await this.formRepository.getFormSubmissions(
              form.id,
              { submitted_by: memberId },
              undefined,
              false // Don't populate, we just need the raw data
            );

            if (submissions && submissions.length > 0) {
              memberFormSubmissions.push({
                form,
                submissions,
              });
            }
          } catch (error) {
            console.error(`Error fetching submissions for form ${form.id}:`, error);
            // Continue with other forms
          }
        }
      }

      // 4. Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'AMDA System';
      workbook.created = new Date();
      workbook.company = 'AMDA';
      workbook.title = `Member Export - ${member.companyName}`;

      // 5. Create Member Information Sheet
      this.createMemberInfoSheet(workbook, memberData || member);

      // 6. Create Minigrid Sites Sheet
      if (memberData?.sites && memberData.sites.length > 0) {
        this.createMinigridSitesSheet(workbook, memberData.sites);
      }

      // 7. Create Form Submission Sheets
      for (const { form, submissions } of memberFormSubmissions) {
        this.createFormSubmissionSheet(workbook, form, submissions);
      }

      // 8. Generate and return buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error: any) {
      throw new AppError(`Failed to export member to Excel: ${error.message}`, 500);
    }
  }

  private createMemberInfoSheet(workbook: ExcelJS.Workbook, member: Member): void {
    const sheet = workbook.addWorksheet('Member Information', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    });

    // Style the header
    sheet.getRow(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E75B6' },
    };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };

    // Add company header
    sheet.mergeCells('A1:B1');
    sheet.getCell('A1').value = `Member Profile: ${member.companyName}`;
    sheet.getRow(1).height = 30;

    let currentRow = 3;

    // Company Information Section
    this.addSectionHeader(sheet, currentRow, 'Company Information');
    currentRow++;

    const companyInfo = [
      ['Member ID', member.memberId],
      ['Company Name', member.companyName],
      ['Trading As', member.tradingAs || 'N/A'],
      ['Email', member.email],
      ['Website', member.website || 'N/A'],
      ['Country', member.country],
      ['City', member.city],
      ['Billing Address', member.billingAddress],
      ['Postal Code', member.postalCode || 'N/A'],
      ['Registration Number', member.registrationNumber || 'N/A'],
    ];

    companyInfo.forEach(([label, value]) => {
      sheet.getCell(`A${currentRow}`).value = label;
      sheet.getCell(`A${currentRow}`).font = { bold: true };
      sheet.getCell(`B${currentRow}`).value = value;
      currentRow++;
    });

    currentRow++;

    // Contact Information Section
    this.addSectionHeader(sheet, currentRow, 'Contact Information');
    currentRow++;

    const contactInfo = [
      ['Primary Contact Name', member.contact1Name || 'N/A'],
      ['Primary Contact Title', member.contact1Title || 'N/A'],
      ['Primary Contact Email', member.contact1Email || 'N/A'],
      ['Primary Contact Phone', member.contact1Phone || 'N/A'],
      ['Secondary Contact Name', member.contact2Name || 'N/A'],
      ['Secondary Contact Title', member.contact2Title || 'N/A'],
      ['Secondary Contact Email', member.contact2Email || 'N/A'],
      ['Secondary Contact Phone', member.contact2Phone || 'N/A'],
      ['Authorized Signatory', member.authorizedSignatory || 'N/A'],
      ['Billing Contact Name', member.billingContactName || 'N/A'],
      ['Billing Contact Email', member.billingContactEmail || 'N/A'],
      ['Billing Contact Phone', member.billingContactPhone || 'N/A'],
    ];

    contactInfo.forEach(([label, value]) => {
      sheet.getCell(`A${currentRow}`).value = label;
      sheet.getCell(`A${currentRow}`).font = { bold: true };
      sheet.getCell(`B${currentRow}`).value = value;
      currentRow++;
    });

    currentRow++;

    // Business Details Section
    this.addSectionHeader(sheet, currentRow, 'Business Details');
    currentRow++;

    const businessInfo = [
      ['For Profit', member.forProfit ? 'Yes' : 'No'],
      ['Business in Africa', member.businessInAfrica ? 'Yes' : 'No'],
      ['Countries of Business', member.countriesOfBusiness || 'N/A'],
      [
        'Business Languages',
        Array.isArray(member.businessLanguages)
          ? member.businessLanguages.join(', ')
          : member.businessLanguages || 'N/A',
      ],
      ['Business Category', member.businessCategory || 'N/A'],
      ['Business Description', member.businessDescription || 'N/A'],
      ['Services Needed', member.servicesNeeded || 'N/A'],
      ['Annual Turnover', member.annualTurnover || 'N/A'],
    ];

    businessInfo.forEach(([label, value]) => {
      sheet.getCell(`A${currentRow}`).value = label;
      sheet.getCell(`A${currentRow}`).font = { bold: true };
      sheet.getCell(`B${currentRow}`).value = value;
      currentRow++;
    });

    currentRow++;

    // Membership Details Section
    this.addSectionHeader(sheet, currentRow, 'Membership Details');
    currentRow++;

    const membershipInfo = [
      ['Membership Type', member.membershipType || 'N/A'],
      ['Membership Status', member.membershipStatus],
      [
        'Membership Start Date',
        member.membershipStartDate
          ? new Date(member.membershipStartDate).toLocaleDateString()
          : 'N/A',
      ],
      ['Is Verified', member.isVerified ? 'Yes' : 'No'],
      ['Verified At', member.verifiedAt ? new Date(member.verifiedAt).toLocaleDateString() : 'N/A'],
      ['Total Minigrid Sites', member.sites?.length || 0],
      ['Created At', new Date(member.createdAt).toLocaleDateString()],
    ];

    membershipInfo.forEach(([label, value]) => {
      sheet.getCell(`A${currentRow}`).value = label;
      sheet.getCell(`A${currentRow}`).font = { bold: true };
      sheet.getCell(`B${currentRow}`).value = value;
      currentRow++;
    });

    // Set column widths
    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 50;

    // Add borders to all cells
    for (let i = 1; i <= currentRow; i++) {
      ['A', 'B'].forEach(col => {
        const cell = sheet.getCell(`${col}${i}`);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }
  }

  private createMinigridSitesSheet(workbook: ExcelJS.Workbook, sites: any[]): void {
    const sheet = workbook.addWorksheet('Minigrid Sites', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    });

    // Define columns
    sheet.columns = [
      { header: 'Site ID', key: 'siteId', width: 15 },
      { header: 'Site Name', key: 'name', width: 30 },
      { header: 'Country', key: 'country', width: 20 },
      { header: 'Region', key: 'region', width: 20 },
      { header: 'District', key: 'district', width: 20 },
      { header: 'Village', key: 'village', width: 20 },
      { header: 'Latitude', key: 'lat', width: 12 },
      { header: 'Longitude', key: 'lon', width: 12 },
      { header: 'Commissioning Date', key: 'commissioningDate', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Generation Type', key: 'generationType', width: 20 },
      { header: 'Installed Capacity (kW)', key: 'installedCapacityKw', width: 20 },
      { header: 'Peak Load (kW)', key: 'peakLoadKw', width: 15 },
      { header: 'Connected Customers', key: 'connectedCustomers', width: 20 },
      { header: 'Residential Customers', key: 'customerMixResidential', width: 20 },
      { header: 'Commercial Customers', key: 'customerMixCommercial', width: 20 },
      { header: 'Productive Customers', key: 'customerMixProductive', width: 20 },
      { header: 'Tariff Model', key: 'tariffModel', width: 30 },
      { header: 'License No', key: 'licenseNo', width: 20 },
      { header: 'Developer', key: 'developer', width: 25 },
      { header: 'Year Added', key: 'yearAdded', width: 12 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' },
    };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add site data
    sites.forEach(site => {
      sheet.addRow({
        siteId: site.siteId,
        name: site.name,
        country: site.country,
        region: site.region,
        district: site.district,
        village: site.village,
        lat: site.lat,
        lon: site.lon,
        commissioningDate: site.commissioningDate
          ? new Date(site.commissioningDate).toLocaleDateString()
          : '',
        status: site.status,
        generationType: site.generationType,
        installedCapacityKw: site.installedCapacityKw,
        peakLoadKw: site.peakLoadKw,
        connectedCustomers: site.connectedCustomers,
        customerMixResidential: site.customerMixResidential,
        customerMixCommercial: site.customerMixCommercial,
        customerMixProductive: site.customerMixProductive,
        tariffModel: site.tariffModel,
        licenseNo: site.licenseNo,
        developer: site.developer,
        yearAdded: site.yearAdded,
      });
    });

    // Add summary row at the bottom
    const summaryRow = sheet.addRow({});
    sheet.getCell(`A${summaryRow.number}`).value = 'Total Sites:';
    sheet.getCell(`A${summaryRow.number}`).font = { bold: true };
    sheet.getCell(`B${summaryRow.number}`).value = sites.length;
    sheet.getCell(`B${summaryRow.number}`).font = { bold: true };
  }

  /**
   * THis handles the generation of form submission for that paerticular member,
   * We have four rows, for a specific kpi, the category, question, type and then the data
   *
   *
   * ==========================================================================
   *
   */
  private createFormSubmissionSheet(
    workbook: ExcelJS.Workbook,
    form: any,
    submissions: any[]
  ): void {
    // Sanitize sheet name
    let sheetName = `Form: ${form.title}`;
    if (sheetName.length > 31) {
      sheetName = sheetName.substring(0, 28) + '...';
    }
    sheetName = sheetName.replace(/[:\/?*\[\]]/g, '_');

    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 7 }], // Freeze first 7 rows
    });

    // Set default font for the entire sheet
    sheet.properties.defaultRowHeight = 20;

    // Apply font to all cells
    sheet.eachRow({ includeEmpty: true }, row => {
      row.font = { name: 'Calibri', size: 11 };
    });

    // Row 1: Form Title
    sheet.mergeCells('A1:Z1');
    sheet.getCell('A1').value = `Form: ${form.title}`;
    sheet.getCell('A1').font = {
      name: 'Calibri',
      bold: true,
      size: 18,
      color: { argb: 'FFFFFFFF' },
    };
    sheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E75B6' },
    };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 35;

    // Row 2: Form metadata
    sheet.mergeCells('A2:Z2');
    sheet.getCell('A2').value =
      `Form Type: ${form.formType?.name || 'N/A'} | Status: ${form.status} | Submissions: ${submissions.length}`;
    sheet.getCell('A2').font = {
      name: 'Calibri',
      italic: true,
      size: 11,
      color: { argb: 'FF666666' },
    };
    sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 25;

    // Define color palette for categories
    const categoryColors = [
      'FFE6F0FF', // Light Blue
      'FFE6F7ED', // Light Green
      'FFFFF4E6', // Light Orange
      'FFFFFDE6', // Light Yellow
      'FFFAE6FF', // Light Purple
      'FFFFE6E6', // Light Red
      'FFE6F9FF', // Light Cyan
      'FFF0E6FF', // Light Lavender
      'FFE6FFFC', // Light Mint
      'FFFFF0E6', // Light Peach
    ];

    const categoryBorderColors = [
      'FF2E75B6', // Dark Blue
      'FF70AD47', // Dark Green
      'FFED7D31', // Dark Orange
      'FFFFC000', // Dark Yellow
      'FF7030A0', // Dark Purple
      'FFC00000', // Dark Red
      'FF00B0F0', // Dark Cyan
      'FF8064A2', // Dark Lavender
      'FF00B050', // Dark Mint
      'FFFF6600', // Dark Peach
    ];

    // Build column structure
    const columnStructure: Array<{
      category: string;
      kpi: string;
      description: string;
      unit: string;
      questionType: string;
      key: string;
      categoryIndex: number;
      categoryColor: string;
      categoryBorderColor: string;
    }> = [];

    let currentCol = 1;
    const categoryColSpans: {
      [category: string]: {
        start: number;
        end: number;
        color: string;
        borderColor: string;
      };
    } = {};

    // First, add submission metadata columns
    const metadataColumns = [
      { header: 'Submission ID', key: 'id', width: 15 },
      { header: 'Submitted At', key: 'submitted_at', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Minigrid Site', key: 'minigrid_siteId', width: 20 },
    ];

    metadataColumns.forEach(({ header, key, width }) => {
      columnStructure.push({
        category: 'Metadata',
        kpi: header,
        description: '',
        unit: '',
        questionType: 'metadata',
        key,
        categoryIndex: -1,
        categoryColor: 'FFF2F2F2',
        categoryBorderColor: 'FF7F7F7F',
      });

      sheet.getColumn(currentCol).width = width;
      currentCol++;
    });

    // Process form categories and questions
    form.categories.forEach((category: any, categoryIndex: number) => {
      const categoryStartCol = currentCol;
      const questions = category.questions || [];
      const colorIndex = categoryIndex % categoryColors.length;
      const categoryColor = categoryColors[colorIndex];
      const categoryBorderColor = categoryBorderColors[colorIndex];

      console.log(questions);
      questions.forEach((question: any) => {
        columnStructure.push({
          category: category.name,
          kpi: question.kpi || '',
          description: question.options.placeholder || question.description || '',
          unit: question.unit || '',
          questionType: question.type,
          key: question.slug,
          categoryIndex,
          categoryColor,
          categoryBorderColor,
        });

        const width = this.getColumnWidth(question.type);
        sheet.getColumn(currentCol).width = width;
        currentCol++;
      });

      categoryColSpans[category.name] = {
        start: categoryStartCol,
        end: currentCol - 1,
        color: categoryColor,
        borderColor: categoryBorderColor,
      };
    });

    // Row 3: Category headers
    const categoryRow = 3;

    // Set metadata category
    const metadataStartCol = 1;
    const metadataEndCol = metadataColumns.length;
    const metadataStartLetter = this.getColumnLetter(metadataStartCol);
    const metadataEndLetter = this.getColumnLetter(metadataEndCol);

    sheet.getCell(`${metadataStartLetter}${categoryRow}`).value = 'Metadata';
    sheet.getCell(`${metadataStartLetter}${categoryRow}`).font = {
      name: 'Calibri',
      bold: true,
      size: 12,
      color: { argb: 'FF333333' },
    };
    sheet.getCell(`${metadataStartLetter}${categoryRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' },
    };
    sheet.getCell(`${metadataStartLetter}${categoryRow}`).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    sheet.mergeCells(`${metadataStartLetter}${categoryRow}:${metadataEndLetter}${categoryRow}`);

    // Set form categories with colors
    Object.entries(categoryColSpans).forEach(([categoryName, span]) => {
      const startCol = this.getColumnLetter(span.start);
      const endCol = this.getColumnLetter(span.end);

      sheet.getCell(`${startCol}${categoryRow}`).value = categoryName;
      sheet.getCell(`${startCol}${categoryRow}`).font = {
        name: 'Calibri',
        bold: true,
        size: 12,
        color: { argb: 'FF333333' },
      };
      sheet.getCell(`${startCol}${categoryRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: span.color },
      };
      sheet.getCell(`${startCol}${categoryRow}`).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      if (span.start !== span.end) {
        sheet.mergeCells(`${startCol}${categoryRow}:${endCol}${categoryRow}`);
      }
    });

    sheet.getRow(categoryRow).height = 30;

    // Row 4: KPI headers
    const kpiRow = 4;
    let colIndex = 1;

    columnStructure.forEach(col => {
      const colLetter = this.getColumnLetter(colIndex);

      sheet.getCell(`${colLetter}${kpiRow}`).value = col.kpi;
      sheet.getCell(`${colLetter}${kpiRow}`).font = {
        name: 'Calibri',
        bold: true,
        size: 11,
        color: { argb: 'FF333333' },
      };
      sheet.getCell(`${colLetter}${kpiRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: col.categoryColor },
      };
      sheet.getCell(`${colLetter}${kpiRow}`).alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };

      colIndex++;
    });

    sheet.getRow(kpiRow).height = 35;

    // Row 5: Description headers
    const descriptionRow = 5;
    colIndex = 1;

    columnStructure.forEach(col => {
      const colLetter = this.getColumnLetter(colIndex);

      sheet.getCell(`${colLetter}${descriptionRow}`).value = col.description;
      sheet.getCell(`${colLetter}${descriptionRow}`).font = {
        name: 'Calibri',
        italic: true,
        size: 10,
        color: { argb: 'FF555555' },
      };
      sheet.getCell(`${colLetter}${descriptionRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: col.categoryColor },
      };
      sheet.getCell(`${colLetter}${descriptionRow}`).alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };

      colIndex++;
    });

    sheet.getRow(descriptionRow).height = 35;

    // Row 6: Unit headers
    const unitRow = 6;
    colIndex = 1;

    columnStructure.forEach(col => {
      const colLetter = this.getColumnLetter(colIndex);

      const unitText = col.unit ? `Unit: ${col.unit}` : '';
      sheet.getCell(`${colLetter}${unitRow}`).value = unitText;
      sheet.getCell(`${colLetter}${unitRow}`).font = {
        name: 'Calibri',
        size: 9,
        color: { argb: 'FF777777' },
      };
      sheet.getCell(`${colLetter}${unitRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: col.categoryColor },
      };
      sheet.getCell(`${colLetter}${unitRow}`).alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };

      colIndex++;
    });

    sheet.getRow(unitRow).height = 25;

    // Add submission data starting from row 7
    let currentDataRow = 7;
    submissions.forEach(submission => {
      colIndex = 1;

      columnStructure.forEach(col => {
        const colLetter = this.getColumnLetter(colIndex);
        let value = submission[col.key];

        // Format value based on type
        value = this.formatCellValue(value, col.questionType);
        sheet.getCell(`${colLetter}${currentDataRow}`).value = value;

        // Apply cell formatting
        sheet.getCell(`${colLetter}${currentDataRow}`).font = {
          name: 'Calibri',
          size: 10,
        };
        sheet.getCell(`${colLetter}${currentDataRow}`).alignment = {
          vertical: 'top',
          wrapText: col.questionType === 'textarea' || col.questionType === 'text',
        };

        // Add borders with category-specific colors
        sheet.getCell(`${colLetter}${currentDataRow}`).border = {
          top: { style: 'thin', color: { argb: col.categoryBorderColor } },
          left: { style: 'thin', color: { argb: col.categoryBorderColor } },
          bottom: { style: 'thin', color: { argb: col.categoryBorderColor } },
          right: { style: 'thin', color: { argb: col.categoryBorderColor } },
        };

        colIndex++;
      });

      currentDataRow++;
    });

    // Add borders to all header rows with category-specific colors
    for (let col = 1; col < colIndex; col++) {
      const colLetter = this.getColumnLetter(col);
      const colData = columnStructure[col - 1];

      // Apply borders to all header rows (3-6)
      for (let row = 3; row <= 6; row++) {
        sheet.getCell(`${colLetter}${row}`).border = {
          top: { style: 'thin', color: { argb: colData.categoryBorderColor } },
          left: { style: 'thin', color: { argb: colData.categoryBorderColor } },
          bottom: { style: 'thin', color: { argb: colData.categoryBorderColor } },
          right: { style: 'thin', color: { argb: colData.categoryBorderColor } },
        };
      }
    }

    // Add thick borders between categories
    Object.values(categoryColSpans).forEach(span => {
      if (span.start > metadataColumns.length) {
        const leftBorderCol = this.getColumnLetter(span.start);

        // Apply left border to all rows in this category
        for (let row = 3; row <= 6; row++) {
          const cell = sheet.getCell(`${leftBorderCol}${row}`);
          const existingBorder = cell.border || {};
          cell.border = {
            ...existingBorder,
            left: { style: 'medium', color: { argb: span.borderColor } },
          };
        }
      }
    });

    // Add summary at the bottom
    currentDataRow++;
    const summaryStartCol = this.getColumnLetter(1);
    const summaryEndCol = this.getColumnLetter(colIndex - 1);
    sheet.mergeCells(`${summaryStartCol}${currentDataRow}:${summaryEndCol}${currentDataRow}`);
    sheet.getCell(`${summaryStartCol}${currentDataRow}`).value =
      `Total Submissions: ${submissions.length}`;
    sheet.getCell(`${summaryStartCol}${currentDataRow}`).font = {
      name: 'Calibri',
      bold: true,
      italic: true,
      size: 11,
    };
    sheet.getCell(`${summaryStartCol}${currentDataRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB9C' },
    };
    sheet.getCell(`${summaryStartCol}${currentDataRow}`).alignment = { horizontal: 'center' };
  }

  // Helper method to get Excel column letter from number
  private getColumnLetter(columnNumber: number): string {
    let letter = '';
    while (columnNumber > 0) {
      const remainder = (columnNumber - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      columnNumber = Math.floor((columnNumber - 1) / 26);
    }
    return letter;
  }

  // Helper method to get appropriate column width based on question type
  private getColumnWidth(questionType: string): number {
    const widthMap: Record<string, number> = {
      text: 25,
      textarea: 40,
      number: 15,
      currency: 15,
      date: 15,
      datetime: 18,
      boolean: 12,
      select: 20,
      multiselect: 30,
      email: 25,
      phone: 18,
      url: 30,
      file: 35,
      rating: 15,
      scale: 15,
    };

    return widthMap[questionType] || 20;
  }

  // Helper method to format cell values based on type
  private formatCellValue(value: any, type: string): any {
    if (value === null || value === undefined) return '';

    switch (type) {
      case 'date':
      case 'datetime':
        if (value) {
          try {
            return new Date(value).toLocaleDateString();
          } catch {
            return value;
          }
        }
        return '';

      case 'boolean':
      case 'yesno':
        return value === true || value === 'true' || value === 'yes' || value === '1'
          ? 'Yes'
          : 'No';

      case 'multiselect':
      case 'checkbox':
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return value;

      case 'currency':
        if (typeof value === 'number') {
          return `$${value.toFixed(2)}`;
        }
        return value;

      case 'number':
        if (typeof value === 'number') {
          return value;
        }
        return value;

      default:
        return value;
    }
  }

  // Helper method to add section headers (for Member Information sheet)
  private addSectionHeader(sheet: ExcelJS.Worksheet, row: number, title: string): void {
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = title;
    sheet.getCell(`A${row}`).font = {
      name: 'Calibri',
      bold: true,
      size: 12,
      color: { argb: 'FFFFFFFF' },
    };
    sheet.getCell(`A${row}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    sheet.getCell(`A${row}`).alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(row).height = 25;
  }
}
