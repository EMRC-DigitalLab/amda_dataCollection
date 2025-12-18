// @ts-nocheck
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { Parser } from 'json2csv';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { FormStatus } from '../../../database/entities/form.entity';
import { FormRepository } from '../../../database/repositories/forms/form.repository';
import { BulkExportRequestDto, ExportPreviewDto, ExportRequestDto } from '../dtos/export.dto';
import {
  ExportFilters,
  ExportFormat,
  ExportResult,
  ExportSummary,
  ExportType,
  IExportRepository,
} from '../interfaces/export.interface';
import { FormService } from './form.service';

export class ExportService {
  private readonly exportDir = path.join(process.cwd(), 'exports');

  constructor(
    private readonly exportRepo: IExportRepository,
    private readonly formService: FormService,
    private readonly formRepository: FormRepository
  ) {
    this.ensureExportDirectory();
  }

  private ensureExportDirectory(): void {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  async exportData(requestDto: ExportRequestDto, exportedBy: string): Promise<ExportResult> {
    const filters: ExportFilters = {
      formTypeId: requestDto.formTypeId,
      year: requestDto.year,
      memberId: requestDto.memberId,
      siteId: requestDto.siteId,
      submissionStatus: requestDto.submissionStatus,
      dateRange: requestDto.dateRange
        ? {
            start: new Date(requestDto.dateRange.start),
            end: new Date(requestDto.dateRange.end),
          }
        : undefined,
    };

    const data = await this.fetchDataByExportType(requestDto.exportType, filters);

    if (!data || data.length === 0) {
      throw new Error('No data found. Please verify forms are published and have submissions.');
    }

    let filteredData = data;

    if (filters.dateRange) {
      filteredData = filteredData.filter(item => {
        const itemDate = new Date(item.created_at || item.submitted_at);
        return itemDate >= filters.dateRange!.start && itemDate <= filters.dateRange!.end;
      });
    }

    if (filters.submissionStatus) {
      filteredData = filteredData.filter(
        item => item.status === filters.submissionStatus
      );
    }

    if (filteredData.length === 0) {
      throw new Error('No data matches the applied filters');
    }

    const cleanedData = this.cleanExportData(filteredData);
    const fileName = this.generateFileName(requestDto.exportType, requestDto.format, filters);
    const filePath = path.join(this.exportDir, fileName);

    let fileSize = 0;

    switch (requestDto.format) {
      case ExportFormat.CSV:
        fileSize = await this.exportToCSV(cleanedData, filePath);
        break;
      case ExportFormat.XLSX:
      fileSize = await this.exportToXLSX(cleanedData, filePath, requestDto.exportType, filters);
        break;
      case ExportFormat.JSON:
        fileSize = await this.exportToJSON(cleanedData, filePath);
        break;
      case ExportFormat.PDF:
        fileSize = await this.exportToPDF(cleanedData, filePath, requestDto.exportType, filters);
        break;
      default:
        throw new Error(`Unsupported export format: ${requestDto.format}`);
    }

    return {
      success: true,
      fileName,
      filePath,
      format: requestDto.format,
      recordCount: cleanedData.length,
      fileSize,
      exportedAt: new Date(),
      exportedBy,
      filters,
    };
  }

 private cleanExportData(data: any[]): any[] {
  return data.map(item => {
    const cleanItem: any = {};

    // ✅ CRITICAL: Keep form_id for grouping
    cleanItem['form_id'] = item.form_id || '';
    
    cleanItem['Submission ID'] = item.id;
    cleanItem['Form Title'] = item.form_title;
    cleanItem['Form Type'] = item.form_type_name;
    cleanItem['Form Year'] = item.form_year;
    cleanItem['Status'] = item.status;
    cleanItem['Admin Comment'] = item.admin_comment || '';
    cleanItem['Submitted At'] = item.submitted_at;
    cleanItem['Created At'] = item.created_at;
    cleanItem['Updated At'] = item.updated_at;
    cleanItem['Member Company'] = item.member_company || '';
    cleanItem['Member Email'] = item.member_email || '';
    cleanItem['Member ID'] = item.member_id_code || '';
    cleanItem['Site Name'] = item.site_name || '';
    cleanItem['Site ID'] = item.site_id_code || '';
    cleanItem['Site Country'] = item.site_country || '';
    cleanItem['Site Region'] = item.site_region || '';

    const reservedFields = new Set([
      'id',
      'form_id',  // ✅ Keep this in reserved to prevent duplication
      'submitted_by',
      'minigrid_siteId',
      'country',
      'submitted_at',
      'status',
      'admin_comment',
      'reviewed_by',
      'reviewed_at',
      'created_at',
      'updated_at',
      'form_title',
      'form_slug',
      'form_type_name',
      'form_year',
      'member_company',
      'member_email',
      'member_id_code',
      'site_name',
      'site_id_code',
      'site_country',
      'site_region',
    ]);

    for (const [key, value] of Object.entries(item)) {
      if (!reservedFields.has(key) && value !== null && value !== undefined) {
        if (typeof value === 'object') {
          cleanItem[key] = JSON.stringify(value);
        } else if (value instanceof Date) {
          cleanItem[key] = value.toISOString();
        } else {
          cleanItem[key] = value;
        }
      }
    }

    return cleanItem;
  });
}

  async bulkExport(requestDto: BulkExportRequestDto, exportedBy: string): Promise<ExportResult[]> {
    const results: ExportResult[] = [];

    if (requestDto.formTypeIds?.length) {
      for (const formTypeId of requestDto.formTypeIds) {
        try {
          const exportRequest: ExportRequestDto = {
            exportType: ExportType.FORM_TYPE_YEARLY,
            format: requestDto.format,
            formTypeId,
            year: requestDto.year,
          };
          const result = await this.exportData(exportRequest, exportedBy);
          results.push(result);
        } catch (error: any) {
          console.error(`Failed to export form type ${formTypeId}:`, error.message);
        }
      }
    }

    if (requestDto.memberIds?.length) {
      for (const memberId of requestDto.memberIds) {
        try {
          const exportRequest: ExportRequestDto = {
            exportType: ExportType.MEMBER_SUBMISSIONS_YEARLY,
            format: requestDto.format,
            memberId,
            year: requestDto.year,
          };
          const result = await this.exportData(exportRequest, exportedBy);
          results.push(result);
        } catch (error: any) {
          console.error(`Failed to export member ${memberId}:`, error.message);
        }
      }
    }

    if (requestDto.siteIds?.length) {
      for (const siteId of requestDto.siteIds) {
        try {
          const exportRequest: ExportRequestDto = {
            exportType: ExportType.SITE_SUBMISSIONS_YEARLY,
            format: requestDto.format,
            siteId,
            year: requestDto.year,
          };
          const result = await this.exportData(exportRequest, exportedBy);
          results.push(result);
        } catch (error: any) {
          console.error(`Failed to export site ${siteId}:`, error.message);
        }
      }
    }

    return results;
  }

  async getExportPreview(previewDto: ExportPreviewDto): Promise<any[]> {
    const filters: ExportFilters = {
      formTypeId: previewDto.formTypeId,
      year: previewDto.year,
      memberId: previewDto.memberId,
      siteId: previewDto.siteId,
    };

    const data = await this.fetchDataByExportType(previewDto.exportType, filters);
    const cleanedData = this.cleanExportData(data);
    return cleanedData.slice(0, previewDto.limit || 10);
  }

  async getExportSummary(exportType: ExportType, filters: ExportFilters): Promise<ExportSummary> {
    const data = await this.fetchDataByExportType(exportType, filters);

    const formTypes = [...new Set(data.map(item => item.form_type_name).filter(Boolean))];
    const memberCount = new Set(data.map(item => item.submitted_by).filter(Boolean)).size;
    const siteCount = new Set(data.map(item => item.minigrid_siteId).filter(Boolean)).size;

    const dates = data
      .map(item => new Date(item.created_at || item.submitted_at))
      .filter(date => !isNaN(date.getTime()));

    const dateRange =
      dates.length > 0
        ? {
            earliest: new Date(Math.min(...dates.map(d => d.getTime()))),
            latest: new Date(Math.max(...dates.map(d => d.getTime()))),
          }
        : { earliest: new Date(), latest: new Date() };

    return {
      totalRecords: data.length,
      exportType,
      filters,
      formTypes,
      memberCount,
      siteCount,
      dateRange,
    };
  }

  private async fetchDataByExportType(
    exportType: ExportType,
    filters: ExportFilters
  ): Promise<any[]> {
    switch (exportType) {
      case ExportType.FORM_TYPE_CURRENT:
        if (!filters.formTypeId) throw new Error('Form type ID is required');
        return this.exportRepo.getFormSubmissionsByFormType(
          filters.formTypeId,
          new Date().getFullYear(),
          filters.memberId,
          filters.siteId
        );

      case ExportType.FORM_TYPE_YEARLY:
        if (!filters.formTypeId) throw new Error('Form type ID is required');
        return this.exportRepo.getFormSubmissionsByFormType(
          filters.formTypeId,
          filters.year,
          filters.memberId,
          filters.siteId
        );

      case ExportType.ALL_FORM_TYPES_ALL_YEARS:
        return this.exportRepo.getAllFormSubmissions(
          undefined,
          undefined,
          filters.memberId,
          filters.siteId
        );

      case ExportType.MEMBER_SUBMISSIONS_ALL:
        if (!filters.memberId) throw new Error('Member ID is required');
        return this.exportRepo.getFormSubmissionsByMember(
          filters.memberId,
          undefined,
          filters.formTypeId
        );

      case ExportType.MEMBER_SUBMISSIONS_YEARLY:
        if (!filters.memberId) throw new Error('Member ID is required');
        return this.exportRepo.getFormSubmissionsByMember(
          filters.memberId,
          filters.year,
          filters.formTypeId
        );

      case ExportType.SITE_SUBMISSIONS_ALL:
        if (!filters.siteId) throw new Error('Site ID is required');
        return this.exportRepo.getFormSubmissionsBySite(
          filters.siteId,
          undefined,
          filters.formTypeId
        );

      case ExportType.SITE_SUBMISSIONS_YEARLY:
        if (!filters.siteId) throw new Error('Site ID is required');
        return this.exportRepo.getFormSubmissionsBySite(
          filters.siteId,
          filters.year,
          filters.formTypeId
        );

      case ExportType.CUSTOM_FILTERED:
        return this.exportRepo.getAllFormSubmissions(
          filters.year,
          filters.formTypeId,
          filters.memberId,
          filters.siteId
        );

      default:
        throw new Error(`Unsupported export type: ${exportType}`);
    }
  }

  private async exportToCSV(data: any[], filePath: string): Promise<number> {
    const fields = Object.keys(data[0]);

    // Create enhanced CSV with summary header
    let csvContent = '';

    // Add summary section
    csvContent += '=== EXPORT SUMMARY ===\n';
    csvContent += `Total Records,${data.length}\n`;
    csvContent += `Export Date,${new Date().toISOString()}\n`;

    const uniqueMembers = new Set(data.map(item => item['Member Company']).filter(Boolean)).size;
    const uniqueSites = new Set(data.map(item => item['Site Name']).filter(Boolean)).size;
    csvContent += `Unique Members,${uniqueMembers}\n`;
    csvContent += `Unique Sites,${uniqueSites}\n`;

    const formTypes = [...new Set(data.map(item => item['Form Type']).filter(Boolean))];
    csvContent += `Form Types,"${formTypes.join(', ')}"\n`;
    csvContent += '\n';

    // Add main data
    csvContent += '=== SUBMISSION DATA ===\n';
    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    csvContent += csv;

    fs.writeFileSync(filePath, csvContent, 'utf8');
    const stats = fs.statSync(filePath);
    return stats.size;
  }

  private async exportToXLSX(data: any[], filePath: string, exportType?: ExportType, filters?: ExportFilters): Promise<number> {
     const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AMDA System';
  workbook.created = new Date();
  workbook.company = 'AMDA';
  workbook.title = 'Form Submissions Export';

    // Determine export type based on data
  const hasMemberData = data.some(item => item['Member Company'] || item.member_company);
  const hasSiteData = data.some(item => item['Site Name'] || item.site_name);

      if (hasMemberData || hasSiteData) {
    await this.createEnhancedExcelWorkbook(workbook, data, exportType, filters);
  } else {
    const worksheet = this.createBeautifiedExcelSheet(workbook, data, 'Submissions');
  }

     await workbook.xlsx.writeFile(filePath);
  const stats = fs.statSync(filePath);
  return stats.size;
  }

  private async createEnhancedWorkbook(workbook: XLSX.WorkBook, data: any[]): Promise<void> {
    // Sheet 1: Summary Overview
    const summaryData = this.generateSummaryData(data);
    const summarySheet = this.createBeautifiedSheet(summaryData, 'Summary', true);
    XLSX.utils.book_append_sheet(workbook, summarySheet, '📊 Summary');

    // Sheet 2: Member Information (if applicable)
    const memberData = this.extractMemberData(data);
    if (memberData.length > 0) {
      const memberSheet = this.createBeautifiedSheet(memberData, 'Members');
      XLSX.utils.book_append_sheet(workbook, memberSheet, '👥 Members');
    }

    // Sheet 3: Minigrid Sites (if applicable)
    const siteData = this.extractSiteData(data);
    if (siteData.length > 0) {
      const siteSheet = this.createBeautifiedSheet(siteData, 'Sites');
      XLSX.utils.book_append_sheet(workbook, siteSheet, '⚡ Sites');
    }

    // Sheet 4: Submissions (main data)
    const submissionSheet = this.createBeautifiedSheet(data, 'Submissions');
    XLSX.utils.book_append_sheet(workbook, submissionSheet, '📝 Submissions');

    // Sheet 5: Form Breakdown by Type
    const formBreakdown = this.generateFormBreakdown(data);
    if (formBreakdown.length > 0) {
      const breakdownSheet = this.createBeautifiedSheet(formBreakdown, 'Form Breakdown');
      XLSX.utils.book_append_sheet(workbook, breakdownSheet, '📋 By Form Type');
    }
  }

  private createBeautifiedSheet(data: any[], sheetName: string, isSummary = false): XLSX.WorkSheet {
    if (data.length === 0) {
      return XLSX.utils.json_to_sheet([{ 'No Data': 'No data available' }]);
    }

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Get column range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    // Auto-size columns with intelligent width calculation
    const maxWidth = 60;
    const minWidth = 10;
    const colWidths: XLSX.ColInfo[] = [];

    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = minWidth;

      // Check header
      const headerCell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
      if (headerCell && headerCell.v) {
        maxLen = Math.max(maxLen, String(headerCell.v).length);
      }

      // Check data cells
      for (let R = range.s.r + 1; R <= Math.min(range.s.r + 100, range.e.r); ++R) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell && cell.v) {
          const cellLen = String(cell.v).length;
          maxLen = Math.max(maxLen, cellLen);
        }
      }

      colWidths.push({ wch: Math.min(maxLen + 2, maxWidth) });
    }
    worksheet['!cols'] = colWidths;

    // Apply header styling (first row)
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
      if (!worksheet[cellAddress]) continue;

      worksheet[cellAddress].s = {
        font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: isSummary ? '4472C4' : '2E75B6' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      };
    }

    // Apply alternating row colors and borders
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const isEvenRow = (R - range.s.r) % 2 === 0;

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;

        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: isEvenRow ? 'F2F2F2' : 'FFFFFF' } },
          alignment: { vertical: 'center', wrapText: false },
          border: {
            top: { style: 'thin', color: { rgb: 'D0D0D0' } },
            bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
            left: { style: 'thin', color: { rgb: 'D0D0D0' } },
            right: { style: 'thin', color: { rgb: 'D0D0D0' } },
          },
        };

        // Format dates
        if (
          worksheet[cellAddress].v instanceof Date ||
          (typeof worksheet[cellAddress].v === 'string' &&
            /^\d{4}-\d{2}-\d{2}/.test(worksheet[cellAddress].v))
        ) {
          worksheet[cellAddress].t = 'd';
          worksheet[cellAddress].z = 'yyyy-mm-dd hh:mm:ss';
        }

        // Format numbers
        if (
          typeof worksheet[cellAddress].v === 'number' &&
          !Number.isInteger(worksheet[cellAddress].v)
        ) {
          worksheet[cellAddress].z = '#,##0.00';
        }
      }
    }

    // Freeze header row
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };

    // Set row heights
    const rowHeights: XLSX.RowInfo[] = [];
    rowHeights[0] = { hpt: 25 }; // Header row
    for (let R = 1; R <= range.e.r; ++R) {
      rowHeights[R] = { hpt: 18 };
    }
    worksheet['!rows'] = rowHeights;

    return worksheet;
  }

  private generateSummaryData(data: any[], exportType?: ExportType, filters?: ExportFilters): any[] {
    const summary = [];

    // Export Information
    summary.push({
      Metric: 'Export Information',
      Value: '',
    });
    summary.push({
      Metric: 'Total Records',
      Value: data.length,
    });
    summary.push({
      Metric: 'Export Date',
      Value: new Date().toISOString(),
    });
    summary.push({ Metric: '', Value: '' });

    // Form Types
    const formTypes = [...new Set(data.map(item => item['Form Type']).filter(Boolean))];
    summary.push({
      Metric: 'Form Types',
      Value: '',
    });
    formTypes.forEach(type => {
      const count = data.filter(item => item['Form Type'] === type).length;
      summary.push({
        Metric: `  ${type}`,
        Value: count,
      });
    });
    summary.push({ Metric: '', Value: '' });

    // Status Breakdown
    const statuses = [
      ...new Set(data.map(item => item['lastLoginAt'] || item['Status']).filter(Boolean)),
    ];
    summary.push({
      Metric: 'Status Breakdown',
      Value: '',
    });
    statuses.forEach(status => {
      const count = data.filter(
        item => item['lastLoginAt'] === status || item['Status'] === status
      ).length;
      summary.push({
        Metric: `  ${status}`,
        Value: count,
      });
    });
    summary.push({ Metric: '', Value: '' });

    // Member Statistics
    const uniqueMembers = new Set(data.map(item => item['Member Company']).filter(Boolean)).size;
    summary.push({
      Metric: 'Member Statistics',
      Value: '',
    });
    summary.push({
      Metric: '  Unique Members',
      Value: uniqueMembers,
    });

    // Site Statistics
    const uniqueSites = new Set(data.map(item => item['Site Name']).filter(Boolean)).size;
    summary.push({
      Metric: '  Unique Sites',
      Value: uniqueSites,
    });

    // Date Range
    const dates = data
      .map(item => new Date(item['Submitted At'] || item['Created At']))
      .filter(d => !isNaN(d.getTime()));
    if (dates.length > 0) {
      summary.push({ Metric: '', Value: '' });
      summary.push({
        Metric: 'Date Range',
        Value: '',
      });
      summary.push({
        Metric: '  Earliest',
        Value: new Date(Math.min(...dates.map(d => d.getTime()))).toISOString(),
      });
      summary.push({
        Metric: '  Latest',
        Value: new Date(Math.max(...dates.map(d => d.getTime()))).toISOString(),
      });
    }

    return summary;
  }

  private extractMemberData(data: any[]): any[] {
    const memberMap = new Map();

    data.forEach(item => {
      const memberCompany = item['Member Company'] || item.member_company;
      const memberEmail = item['Member Email'] || item.member_email;
      const memberId = item['Member ID'] || item.member_id_code;

      if (memberCompany && !memberMap.has(memberCompany)) {
        const memberSubmissions = data.filter(
          d => (d['Member Company'] || d.member_company) === memberCompany
        );

        const uniqueForms = new Set(memberSubmissions.map(s => s['Form Title'])).size;
        const uniqueSites = new Set(memberSubmissions.map(s => s['Site Name']).filter(Boolean))
          .size;

        memberMap.set(memberCompany, {
          'Member Company': memberCompany,
          'Member Email': memberEmail || 'N/A',
          'Member ID': memberId || 'N/A',
          'Total Submissions': memberSubmissions.length,
          'Unique Forms': uniqueForms,
          'Associated Sites': uniqueSites,
          'Latest Submission':
            memberSubmissions
              .map(s => new Date(s['Submitted At'] || s['Created At']))
              .sort((a, b) => b.getTime() - a.getTime())[0]
              ?.toISOString() || 'N/A',
        });
      }
    });

    return Array.from(memberMap.values()).sort(
      (a, b) => b['Total Submissions'] - a['Total Submissions']
    );
  }

  private extractSiteData(data: any[]): any[] {
    const siteMap = new Map();

    data.forEach(item => {
      const siteName = item['Site Name'] || item.site_name;
      const siteId = item['Site ID'] || item.site_id_code;
      const siteCountry = item['Site Country'] || item.site_country;
      const siteRegion = item['Site Region'] || item.site_region;

      if (siteName && !siteMap.has(siteName)) {
        const siteSubmissions = data.filter(d => (d['Site Name'] || d.site_name) === siteName);

        const uniqueForms = new Set(siteSubmissions.map(s => s['Form Title'])).size;

        siteMap.set(siteName, {
          'Site Name': siteName,
          'Site ID': siteId || 'N/A',
          Country: siteCountry || 'N/A',
          Region: siteRegion || 'N/A',
          'Total Submissions': siteSubmissions.length,
          'Unique Forms': uniqueForms,
          'Latest Submission':
            siteSubmissions
              .map(s => new Date(s['Submitted At'] || s['Created At']))
              .sort((a, b) => b.getTime() - a.getTime())[0]
              ?.toISOString() || 'N/A',
        });
      }
    });

    return Array.from(siteMap.values()).sort(
      (a, b) => b['Total Submissions'] - a['Total Submissions']
    );
  }

  private generateFormBreakdown(data: any[]): any[] {
    const formMap = new Map();

    data.forEach(item => {
      const formTitle = item['Form Title'];
      const formType = item['Form Type'];
      const formYear = item['Form Year'];

      if (formTitle) {
        const key = `${formTitle}-${formYear}`;

        if (!formMap.has(key)) {
          const formSubmissions = data.filter(
            d => d['Form Title'] === formTitle && d['Form Year'] === formYear
          );

          const statusBreakdown = {
          PENDING: formSubmissions.filter(s => s['lastLoginAt'] === 'PENDING').length,
            APPROVED: formSubmissions.filter(s => s['lastLoginAt'] === 'APPROVED').length,
            REJECTED: formSubmissions.filter(s => s['lastLoginAt'] === 'REJECTED').length,
          };

          formMap.set(key, {
            'Form Title': formTitle,
            'Form Type': formType || 'N/A',
            Year: formYear || 'N/A',
            'Total Submissions': formSubmissions.length,
            Pending: statusBreakdown.PENDING,
            Approved: statusBreakdown.APPROVED,
            Rejected: statusBreakdown.REJECTED,
            'Unique Members': new Set(formSubmissions.map(s => s['Member Company']).filter(Boolean))
              .size,
            'Unique Sites': new Set(formSubmissions.map(s => s['Site Name']).filter(Boolean)).size,
          });
        }
      }
    });

    return Array.from(formMap.values()).sort(
      (a, b) => b['Total Submissions'] - a['Total Submissions']
    );
  }

  private async exportToJSON(data: any[], filePath: string): Promise<number> {
    // Create structured JSON with metadata
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalRecords: data.length,
        uniqueMembers: new Set(data.map(item => item['Member Company']).filter(Boolean)).size,
        uniqueSites: new Set(data.map(item => item['Site Name']).filter(Boolean)).size,
        formTypes: [...new Set(data.map(item => item['Form Type']).filter(Boolean))],
        dateRange: {
          earliest:
            data.length > 0
              ? new Date(
                  Math.min(
                    ...data.map(item =>
                      new Date(item['Submitted At'] || item['Created At']).getTime()
                    )
                  )
                ).toISOString()
              : null,
          latest:
            data.length > 0
              ? new Date(
                  Math.max(
                    ...data.map(item =>
                      new Date(item['Submitted At'] || item['Created At']).getTime()
                    )
                  )
                ).toISOString()
              : null,
        },
        statusBreakdown: {
                   pending: data.filter(item => item['lastLoginAt'] === 'PENDING').length,
          approved: data.filter(item => item['lastLoginAt'] === 'APPROVED').length,
          rejected: data.filter(item => item['lastLoginAt'] === 'REJECTED').length,
        },
      },
      members: this.extractMemberData(data),
      sites: this.extractSiteData(data),
      submissions: data,
      formBreakdown: this.generateFormBreakdown(data),
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    fs.writeFileSync(filePath, jsonData, 'utf8');

    const stats = fs.statSync(filePath);
    return stats.size;
  }

  private async exportToPDF(data: any[], filePath: string, exportType?: ExportType, filters?: ExportFilters): Promise<number> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    doc.pipe(fs.createWriteStream(filePath));

    // Header with logo space and title
    this.addPDFHeader(doc);
    
    // Summary information
    this.addPDFSummary(doc, data, exportType, filters);
    
    // Data tables
    this.addPDFDataTables(doc, data);
    
    // Footer
    this.addPDFFooter(doc);

    doc.end();

    // Wait for PDF to be written
    await new Promise((resolve) => {
      doc.on('end', resolve);
    });

    const stats = fs.statSync(filePath);
    return stats.size;
  }

  private addPDFHeader(doc: PDFKit.PDFDocument): void {
    const pageWidth = doc.page.width - 100; // Account for margins

    // Title
    doc.fontSize(24)
       .fillColor('#2c3e50')
       .font('Helvetica-Bold')
       .text('AMDA Data Collection Report', 50, 50, { align: 'center', width: pageWidth });

    // Subtitle
    doc.fontSize(12)
       .fillColor('#7f8c8d')
       .font('Helvetica')
       .text('Comprehensive Form Submission Export', 50, 85, { align: 'center', width: pageWidth });

    // Date and time
    doc.fontSize(10)
       .fillColor('#95a5a6')
       .text(`Generated on: ${new Date().toLocaleString()}`, 50, 110, { align: 'center', width: pageWidth });

    // Divider line
    doc.strokeColor('#ecf0f1')
       .lineWidth(1)
       .moveTo(50, 130)
       .lineTo(doc.page.width - 50, 130)
       .stroke();

    doc.y = 150; // Set starting position for content
  }

  private addPDFSummary(doc: PDFKit.PDFDocument, data: any[], exportType?: ExportType, filters?: ExportFilters): void {
    const pageWidth = doc.page.width - 100;
    
    // Summary section title
    doc.fontSize(16)
       .fillColor('#2c3e50')
       .font('Helvetica-Bold')
       .text('📊 Export Summary', 50, doc.y, { width: pageWidth });

    doc.y += 25;

    // Summary statistics
    const totalRecords = data.length;
    const uniqueMembers = new Set(data.map(item => item['Member Company']).filter(Boolean)).size;
    const uniqueSites = new Set(data.map(item => item['Site Name']).filter(Boolean)).size;
    const formTypes = [...new Set(data.map(item => item['Form Type']).filter(Boolean))];
    
    const statusBreakdown = {
      submitted: data.filter(item => item['Status'] === 'SUBMITTED').length,
      approved: data.filter(item => item['Status'] === 'APPROVED').length,
      rejected: data.filter(item => item['Status'] === 'REJECTED').length,
    };

    // Summary box
    doc.rect(50, doc.y, pageWidth, 120)
       .fillColor('#f8f9fa')
       .fill()
       .stroke();

    const summaryY = doc.y + 15;
    
    // Summary content in columns
    doc.fontSize(10)
       .fillColor('#2c3e50')
       .font('Helvetica');

    // Left column
    doc.text(`Total Records: ${totalRecords}`, 70, summaryY);
    doc.text(`Unique Members: ${uniqueMembers}`, 70, summaryY + 15);
    doc.text(`Unique Sites: ${uniqueSites}`, 70, summaryY + 30);
    doc.text(`Form Types: ${formTypes.length}`, 70, summaryY + 45);

    // Right column - Status breakdown
    doc.text(`Status Breakdown:`, 280, summaryY);
    doc.text(`• Submitted: ${statusBreakdown.submitted}`, 290, summaryY + 15);
    doc.text(`• Approved: ${statusBreakdown.approved}`, 290, summaryY + 30);
    doc.text(`• Rejected: ${statusBreakdown.rejected}`, 290, summaryY + 45);

    // Export filters
    if (filters) {
      doc.text(`Filters Applied:`, 70, summaryY + 65);
      if (filters.year) doc.text(`• Year: ${filters.year}`, 80, summaryY + 80);
      if (filters.formTypeId) doc.text(`• Form Type: Applied`, 80, summaryY + 95);
      if (filters.memberId) doc.text(`• Member: Specific Member`, 280, summaryY + 80);
      if (filters.siteId) doc.text(`• Site: Specific Site`, 280, summaryY + 95);
    }

    doc.y += 140; // Move past summary box
  }

  private addPDFDataTables(doc: PDFKit.PDFDocument, data: any[]): void {
    const pageWidth = doc.page.width - 100;
    
    // Check if new page is needed
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
      doc.y = 50;
    }

    // Data section title
    doc.fontSize(16)
       .fillColor('#2c3e50')
       .font('Helvetica-Bold')
       .text('📝 Submission Details', 50, doc.y, { width: pageWidth });

    doc.y += 25;

    // Table headers
    const headers = ['Form Title', 'Member', 'Status', 'Submitted Date'];
    const columnWidths = [140, 120, 90, 125];
    const headerY = doc.y;

    // Header background
    doc.rect(50, headerY, pageWidth, 20)
       .fillColor('#34495e')
       .fill();

    // Header text
    doc.fontSize(9)
       .fillColor('#ffffff')
       .font('Helvetica-Bold');

    let xPos = 50;
    headers.forEach((header, index) => {
      doc.text(header, xPos + 5, headerY + 6, { width: columnWidths[index] - 5 });
      xPos += columnWidths[index];
    });

    doc.y = headerY + 25;

    // Data rows
    doc.fillColor('#2c3e50')
       .font('Helvetica')
       .fontSize(8);

    let rowIndex = 0;
    const maxRowsPerPage = 25;

    for (const item of data.slice(0, 50)) { // Limit to 50 records for PDF readability
      if (rowIndex >= maxRowsPerPage) {
        doc.addPage();
        doc.y = 50;
        rowIndex = 0;
        
        // Re-add headers on new page
        doc.fontSize(9)
           .fillColor('#ffffff')
           .font('Helvetica-Bold');
        
        doc.rect(50, doc.y, pageWidth, 20)
           .fillColor('#34495e')
           .fill();

        xPos = 50;
        headers.forEach((header, index) => {
          doc.text(header, xPos + 5, doc.y + 6, { width: columnWidths[index] - 5 });
          xPos += columnWidths[index];
        });

        doc.y += 25;
        doc.fillColor('#2c3e50')
           .font('Helvetica')
           .fontSize(8);
      }

      const rowY = doc.y;
      const rowHeight = 18;

      // Alternate row colors
      if (rowIndex % 2 === 1) {
        doc.rect(50, rowY, pageWidth, rowHeight)
           .fillColor('#f8f9fa')
           .fill();
      }

      // Row data
      const values = [
        this.truncateText(item['Form Title'] || '', 20),
        this.truncateText(item['Member Company'] || '', 18),
        item['Status'] || '',
        item['Submitted At'] ? new Date(item['Submitted At']).toLocaleDateString() : ''
      ];

      xPos = 50;
      values.forEach((value, index) => {
        doc.fillColor('#2c3e50')
           .text(String(value), xPos + 5, rowY + 5, { width: columnWidths[index] - 5 });
        xPos += columnWidths[index];
      });

      doc.y = rowY + rowHeight;
      rowIndex++;
    }

    if (data.length > 50) {
      doc.y += 10;
      doc.fontSize(10)
         .fillColor('#7f8c8d')
         .text(`Note: Showing first 50 of ${data.length} total records for PDF readability.`, 50, doc.y);
    }
  }

  private addPDFFooter(doc: PDFKit.PDFDocument): void {
    const pageWidth = doc.page.width - 100;
    const footerY = doc.page.height - 50;

    // Footer divider
    doc.strokeColor('#ecf0f1')
       .lineWidth(1)
       .moveTo(50, footerY - 20)
       .lineTo(doc.page.width - 50, footerY - 20)
       .stroke();

    // Footer text
    doc.fontSize(8)
       .fillColor('#95a5a6')
       .font('Helvetica')
       .text('AMDA Mini Grid Data Collection Tool', 50, footerY, { align: 'center', width: pageWidth });

    doc.text('This report contains confidential information. Handle with care.', 50, footerY + 12, { align: 'center', width: pageWidth });
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength - 3) + '...';
  }

  private generateFileName(
    exportType: ExportType,
    format: ExportFormat,
    filters: ExportFilters
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const typeSlug = exportType.toLowerCase().replace(/_/g, '-');

    let fileName = `export-${typeSlug}-${timestamp}`;

    if (filters.year) fileName += `-year-${filters.year}`;
    if (filters.formTypeId) fileName += `-form-${filters.formTypeId.substring(0, 8)}`;
    if (filters.memberId) fileName += `-member-${filters.memberId.substring(0, 8)}`;
    if (filters.siteId) fileName += `-site-${filters.siteId.substring(0, 8)}`;

    return `${fileName}.${format}`;
  }

  async deleteExportFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting export file:', error);
      return false;
    }
  }

  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  async listExportFiles(): Promise<Array<{ fileName: string; size: number; created: Date }>> {
    try {
      const files = fs.readdirSync(this.exportDir);
      return files
        .map(fileName => {
          const filePath = path.join(this.exportDir, fileName);
          const stats = fs.statSync(filePath);
          return {
            fileName,
            size: stats.size,
            created: stats.birthtime,
          };
        })
        .sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch {
      return [];
    }
  }

  async getMembersForDropdown(): Promise<Array<{ id: string; label: string; value: string }>> {
    try {
      const members = await this.exportRepo.getMembersByStatus();
      return members.map(member => ({
        id: member.id,
        value: member.id,
        label: `${member.companyName} (${member.memberId || member.id.substring(0, 8)})`,
      }));
    } catch (error) {
      console.error('Error fetching members for dropdown:', error);
      return [];
    }
  }

  async getSitesForDropdown(
    memberId?: string
  ): Promise<Array<{ id: string; label: string; value: string; memberId?: string }>> {
    try {
      const sites = await this.exportRepo.getSitesByMember(memberId);
      return sites.map(site => ({
        id: site.id,
        value: site.id,
        label: `${site.name} - ${site.country || 'Unknown'} (${site.siteId || site.id.substring(0, 8)})`,
        memberId: site.member?.id,
      }));
    } catch (error) {
      console.error('Error fetching sites for dropdown:', error);
      return [];
    }
  }

  async getFormTypesForDropdown(
    year?: number
  ): Promise<Array<{ id: string; label: string; value: string; year?: number }>> {
    try {
      const formTypes = await this.exportRepo.getFormTypesByYear(year);
      return formTypes.map(formType => ({
        id: formType.id,
        value: formType.id,
        label: `${formType.name} ${formType.year ? `(${formType.year})` : ''}`,
        year: formType.year,
      }));
    } catch (error) {
      console.error('Error fetching form types for dropdown:', error);
      return [];
    }
  }

  private async createEnhancedExcelWorkbook(
    workbook: ExcelJS.Workbook,
  data: any[],
  exportType?: ExportType,
  filters?: ExportFilters
  ): Promise<void> {
    // Sheet 1: Summary Overview
 
     const summaryData = this.generateSummaryData(data, exportType, filters);
  this.createBeautifiedExcelSheet(workbook, summaryData, '📊 Summary', true);

    // Sheet 2: Member Information (if applicable)
    const memberData = this.extractMemberData(data);
    if (memberData.length > 0) {
      this.createBeautifiedExcelSheet(workbook, memberData, '👥 Members');
    }

    // Sheet 3: Minigrid Sites (if applicable)
    const siteData = this.extractSiteData(data);
    if (siteData.length > 0) {
      this.createBeautifiedExcelSheet(workbook, siteData, '⚡ Sites');
    }

    // Sheet 4: Submissions (main data)
    this.createBeautifiedExcelSheet(workbook, data, '📝 Submissions');

    // Sheet 5: Form Breakdown by Type
    const formBreakdown = this.generateFormBreakdown(data);
    if (formBreakdown.length > 0) {
      this.createBeautifiedExcelSheet(workbook, formBreakdown, '📋 By Form Type');
    }


    // Individual submission sheets with detailed form structure
    await this.createIndividualSubmissionSheets(workbook, data);
  }

  private createBeautifiedExcelSheet(
    workbook: ExcelJS.Workbook,
    data: any[],
    sheetName: string,
    isSummary = false
  ): ExcelJS.Worksheet {
    if (data.length === 0) {
      const worksheet = workbook.addWorksheet(sheetName);
      worksheet.addRow(['No Data', 'No data available']);
      return worksheet;
    }

    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    });

    // Get headers from first row
    const headers = Object.keys(data[0]);

    // Add headers
    const headerRow = worksheet.addRow(headers);

    // Style header row with brand colors
    headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isSummary ? 'FF003D0C' : 'FF003D0C' }, // Primary color
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerRow.height = 25;

    // Add borders to header
    headerRow.eachCell(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    // Add data rows
    data.forEach((row, index) => {
      const dataRow = worksheet.addRow(Object.values(row));
      const isEvenRow = index % 2 === 0;

      // Style data rows with brand colors
      dataRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEvenRow ? 'FFFAF7F3' : 'FFFFFFFF' }, // Light accent color
      };
      dataRow.alignment = { vertical: 'middle', wrapText: false };
      dataRow.height = 18;

      // Add borders
      dataRow.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };

        // Format dates and numbers
        if (
          cell.value instanceof Date ||
          (typeof cell.value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(cell.value))
        ) {
          cell.numFmt = 'yyyy-mm-dd hh:mm:ss';
        }

        if (typeof cell.value === 'number' && !Number.isInteger(cell.value)) {
          cell.numFmt = '#,##0.00';
        }
      });
    });

    // Auto-size columns with intelligent width calculation
    const maxWidth = 60;
    const minWidth = 10;

    headers.forEach((header, index) => {
      let maxLen = Math.max(minWidth, header.length);

      // Check data cells for width
      data.slice(0, 100).forEach(row => {
        const value = row[header];
        if (value !== null && value !== undefined) {
          const cellLen = String(value).length;
          maxLen = Math.max(maxLen, cellLen);
        }
      });

      worksheet.getColumn(index + 1).width = Math.min(maxLen + 2, maxWidth);
    });

    return worksheet;
  }

  // Replace the createIndividualSubmissionSheets method in export.service.ts

createIndividualSubmissionSheets = async (workbook: ExcelJS.Workbook, data: any[]) => {


  if (data.length === 0) {
    console.log('No submissions to process');
    return;
  }

  try {
    // Get all published forms to match with submissions
    const [allForms] = await this.formRepository.findAllForms({
      status: FormStatus.PUBLISHED,
    });


    // Group the existing data by form_id
    const submissionsByFormId = new Map<string, any[]>();
    for (const submission of data) {
      const formId = submission.form_id;
      if (!submissionsByFormId.has(formId)) {
        submissionsByFormId.set(formId, []);
      }
      submissionsByFormId.get(formId)!.push(submission);
    }

    

    // Process each form that has submissions - CREATE ONE SHEET PER FORM
    for (const [formId, submissions] of submissionsByFormId) {
      try {

        // Find the form structure from allForms
        const form = allForms.find(f => f.id === formId);

        if (!form) {
          
          // Create ONE simplified sheet for all submissions of this form
          const formData = {
            id: formId,
            title: submissions[0].form_title || 'Unknown Form',
            formType: { name: submissions[0].form_type_name || 'Unknown' },
            year: submissions[0].form_year,
            status: 'PUBLISHED',
          };

          await this.createSimplifiedGroupedSubmissionsSheet(
            workbook,
            formData,
            submissions
          );
          continue;
        }

        // Create ONE sheet with ALL submissions for this form
        if (form.categories && form.categories.length > 0) {
          await this.createGroupedSubmissionsSheet(
            workbook,
            form,
            submissions
          );
        } else {
          await this.createSimplifiedGroupedSubmissionsSheet(
            workbook,
            form,
            submissions
          );
        }

      } catch (error) {
        console.error(`Error processing form ${formId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in createIndividualSubmissionSheets:', error);
  }
};


private async createGroupedSubmissionsSheet(
  workbook: ExcelJS.Workbook,
  form: any,
  submissions: any[]
): Promise<void> {



  console.log(form,'THis is form')

  const formYear = form.year || submissions[0]?.form_year || '';
  const yearSuffix = formYear ? ` (${formYear})` : '';
  // Sanitize sheet name
  const maxLength = 31;
  let sheetName = `${form.title}-${form?.formType?.name}`;
   if (sheetName.length > maxLength) {
    // Prioritize keeping the year visible
    const titleMaxLength = maxLength - yearSuffix.length - 3;
    sheetName = `${form.title.substring(0, titleMaxLength)}...${yearSuffix}`;
  }
  sheetName = sheetName.replace(/[:\/?*\[\]]/g, '_');

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 7 }],
  });

  sheet.properties.defaultRowHeight = 20;
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
    fgColor: { argb: 'FF003D0C' },
  };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 35;

  // Row 2: Form metadata
  sheet.mergeCells('A2:Z2');
  sheet.getCell('A2').value =
    `Form Type: ${form.formType?.name || 'N/A'} | Status: ${form.status} | Total Submissions: ${submissions.length}`;
  sheet.getCell('A2').font = {
    name: 'Calibri',
    italic: true,
    size: 11,
    color: { argb: 'FF666666' },
  };
  sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 25;

  // Brand colors
  const categoryColors = [
    'FFFAF7F3', 'FFDCC5B2', 'FFD9A299', 'FFE8F5E8', 'FFE8E8E8',
    'FFFEFEEE', 'FFF0E8E8', 'FFE8F0FF', 'FFF5E8FF', 'FFE8FFF0',
  ];

  const categoryBorderColors = [
    'FF003D0C', 'FFDCC5B2', 'FFD9A299', 'FF28A745', 'FF6C757D',
    'FFFFC107', 'FFDC3545', 'FF007BFF', 'FF6F42C1', 'FF20C997',
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
  const categoryColSpans: any = {};

  // Metadata columns
  const metadataColumns = [
    { header: 'Submission ID', key: 'Submission ID', width: 15 },
    { header: 'Submitted At', key: 'Submitted At', width: 20 },
    { header: 'Status', key: 'Status', width: 12 },
    { header: 'lastLoginAt', key: 'lastLoginAt', width: 12 },
    { header: 'Member', key: 'Member Company', width: 20 },
    { header: 'Site', key: 'Site Name', width: 20 },
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
      categoryColor: 'FFFAF7F3',
      categoryBorderColor: 'FF003D0C',
    });
    sheet.getColumn(currentCol).width = width;
    currentCol++;
  });

  // Process categories and questions
  if (form.categories) {
    form.categories.forEach((category: any, categoryIndex: number) => {
      const categoryStartCol = currentCol;
      const questions = category.questions || [];
      const colorIndex = categoryIndex % categoryColors.length;

      questions.forEach((question: any) => {
        columnStructure.push({
          category: category.name,
          kpi: question.kpi || question.label || question.placeholder || '',
          description: question.description || question.placeholder || '',
          unit: question.unit || '',
          questionType: question.type || 'text',
          key: question.slug,
          categoryIndex,
          categoryColor: categoryColors[colorIndex],
          categoryBorderColor: categoryBorderColors[colorIndex],
        });

        sheet.getColumn(currentCol).width = this.getColumnWidth(question.type || 'text');
        currentCol++;
      });

      if (questions.length > 0) {
        categoryColSpans[category.name] = {
          start: categoryStartCol,
          end: currentCol - 1,
          color: categoryColors[colorIndex],
          borderColor: categoryBorderColors[colorIndex],
        };
      }
    });
  }

  // Create headers (rows 3-6)
  this.createMemberStyleHeaders(sheet, columnStructure, categoryColSpans, metadataColumns.length);

  // Add ALL submissions data starting from row 7
  let currentRow = 7;
  console.log(submissions, "this is submissions")
  submissions.forEach((submission, index) => {
    this.addSingleSubmissionData(sheet, columnStructure, submission, currentRow);
    
    // Add alternating row colors for data rows
    const isEvenRow = index % 2 === 0;
    for (let col = 1; col <= columnStructure.length; col++) {
      const cell = sheet.getCell(currentRow, col);
      const currentFill = cell.fill;
      
      // Only apply alternating color if no fill already exists
      if (!currentFill || currentFill.type !== 'pattern') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEvenRow ? 'FFFFFFFF' : 'FFF5F5F5' },
        };
      }
    }
    
    currentRow++;
  });

  console.log(`✓ Created grouped sheet for ${form.title} with ${submissions.length} rows`);
}


private async createSimplifiedGroupedSubmissionsSheet(
  workbook: ExcelJS.Workbook,
  formData: any,
  submissions: any[]
): Promise<void> {
  let sheetName = `${formData.title}`;
  if (sheetName.length > 31) {
    sheetName = sheetName.substring(0, 28) + '...';
  }
  sheetName = sheetName.replace(/[:\/?*\[\]]/g, '_');

  const sheet = workbook.addWorksheet(sheetName);
  sheet.properties.defaultRowHeight = 20;

  // Title row
  sheet.getCell('A1').value = `Form: ${formData.title} (${submissions.length} submissions)`;
  sheet.getCell('A1').font = {
    name: 'Calibri',
    bold: true,
    size: 16,
    color: { argb: 'FFFFFFFF' },
  };
  sheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF003D0C' },
  };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  // Get all possible keys from all submissions
  const allKeys = new Set<string>();
  submissions.forEach(submission => {
    Object.keys(submission).forEach(key => allKeys.add(key));
  });

  // Define preferred column order
  const priorityColumns = [
    'Submission ID', 'id',
    'Submitted At', 'submitted_at',
    'Status', 'status',
    'Member Company', 'member_company',
    'Member Email', 'member_email',
    'Site Name', 'site_name',
    'Site Country', 'site_country',
    'Form Title', 'form_title',
    'Form Type', 'form_type_name',
    'Form Year', 'form_year',
  ];

  const headers: string[] = [];
  const columnKeys: string[] = [];

  // Add priority columns first
  priorityColumns.forEach(col => {
    if (allKeys.has(col)) {
      headers.push(col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
      columnKeys.push(col);
      allKeys.delete(col);
    }
  });

  // Add remaining columns
  Array.from(allKeys)
    .filter(key => !key.startsWith('form_') && key !== 'form_id')
    .sort()
    .forEach(key => {
      headers.push(key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
      columnKeys.push(key);
    });

  // Add header row
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF003D0C' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;

  // Add data rows
  submissions.forEach((submission, index) => {
    const rowData = columnKeys.map(key => {
      let value = submission[key];
      
      // Format values
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (key.includes('_at') || key.includes('At')) {
        try {
          return new Date(value).toLocaleString();
        } catch {
          return value;
        }
      }
      
      return value;
    });

    const dataRow = sheet.addRow(rowData);
    const isEvenRow = index % 2 === 0;
    
    dataRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEvenRow ? 'FFFAF7F3' : 'FFFFFFFF' },
    };
    dataRow.alignment = { vertical: 'middle' };
  });

  // Auto-size columns
  columnKeys.forEach((_, index) => {
    const column = sheet.getColumn(index + 1);
    let maxLength = headers[index].length;
    
    submissions.slice(0, 100).forEach(submission => {
      const value = submission[columnKeys[index]];
      if (value !== null && value !== undefined) {
        const length = String(value).length;
        maxLength = Math.max(maxLength, length);
      }
    });
    
    column.width = Math.min(maxLength + 2, 50);
  });

  console.log(`✓ Created simplified grouped sheet for ${formData.title} with ${submissions.length} rows`);
}

  private async createDetailedSubmissionSheet(
    workbook: ExcelJS.Workbook,
    form: any,
    submission: any,
    submissionNumber: number
  ): Promise<void> {
    // Sanitize sheet name
    const maxLength = 31;
    let sheetName = `Submission ${submissionNumber}: ${form.title}`;
    if (sheetName.length > maxLength) {
      sheetName = `Sub ${submissionNumber}: ${form.title}`.substring(0, maxLength - 3) + '...';
    }
    sheetName = sheetName.replace(/[:\/?*\[\]]/g, '_');

    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 7 }],
    });

    sheet.properties.defaultRowHeight = 20;
    sheet.eachRow({ includeEmpty: true }, row => {
      row.font = { name: 'Calibri', size: 11 };
    });

    // Row 1: Form Title with brand colors
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
      fgColor: { argb: 'FF003D0C' }, // Primary color
    };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 35;

    // Row 2: Submission metadata
    sheet.mergeCells('A2:Z2');
    const submittedDate = new Date(
      submission.submitted_at || submission.created_at
    ).toLocaleDateString();
    sheet.getCell('A2').value =
      `Submission ID: ${submission.id} | Submitted: ${submittedDate} | Status: ${submission.status}`;
    sheet.getCell('A2').font = {
      name: 'Calibri',
      italic: true,
      size: 11,
      color: { argb: 'FF666666' },
    };
    sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 25;

    // Define brand color palette for categories
    const categoryColors = [
      'FFFAF7F3', // Primary alt
      'FFDCC5B2', // Accent
      'FFD9A299', // Thick
      'FFE8F5E8', // Light green variant
      'FFE8E8E8', // Light gray
      'FFFEFEEE', // Light yellow
      'FFF0E8E8', // Light red
      'FFE8F0FF', // Light blue
      'FFF5E8FF', // Light purple
      'FFE8FFF0', // Light mint
    ];

    const categoryBorderColors = [
      'FF003D0C', // Primary
      'FFDCC5B2', // Accent
      'FFD9A299', // Thick
      'FF28A745', // Green
      'FF6C757D', // Gray
      'FFFFC107', // Yellow
      'FFDC3545', // Red
      'FF007BFF', // Blue
      'FF6F42C1', // Purple
      'FF20C997', // Mint
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

    // Add submission metadata columns
    const metadataColumns = [
      { header: 'Submission ID', key: 'id', width: 15 },
      { header: 'Submitted At', key: 'submitted_at', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Member', key: 'member_company', width: 20 },
      { header: 'Site', key: 'site_name', width: 20 },
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
        categoryColor: 'FFFAF7F3',
        categoryBorderColor: 'FF003D0C',
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

      questions.forEach((question: any) => {
        columnStructure.push({
          category: category.name,
          kpi: question.kpi || question.label || question.placeholder || '',
          description: question.description || question.placeholder || '',
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
    const metadataStartLetter = this.getColumnLetter(1);
    const metadataEndLetter = this.getColumnLetter(metadataColumns.length);

    sheet.getCell(`${metadataStartLetter}${categoryRow}`).value = 'Metadata';
    sheet.getCell(`${metadataStartLetter}${categoryRow}`).font = {
      name: 'Calibri',
      bold: true,
      size: 12,
      color: { argb: 'FFFFFFFF' },
    };
    sheet.getCell(`${metadataStartLetter}${categoryRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF003D0C' },
    };
    sheet.getCell(`${metadataStartLetter}${categoryRow}`).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    sheet.mergeCells(`${metadataStartLetter}${categoryRow}:${metadataEndLetter}${categoryRow}`);

    // Set form categories with brand colors
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
    const currentDataRow = 7;
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
  }

  private async createMemberStyleSubmissionSheet(
    workbook: ExcelJS.Workbook,
    form: any,
    submission: any,
    submissionNumber: number
  ): Promise<void> {
    // This follows the exact pattern from member service createFormSubmissionSheet
    let sheetName = `Sub ${submissionNumber}: ${form.title}`;
    if (sheetName.length > 31) {
      sheetName = sheetName.substring(0, 28) + '...';
    }
    sheetName = sheetName.replace(/[:\/?*\[\]]/g, '_');

    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 7 }],
    });

    sheet.properties.defaultRowHeight = 20;
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
      fgColor: { argb: 'FF003D0C' },
    };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 35;

    // Row 2: Form metadata
    sheet.mergeCells('A2:Z2');
    const submissionId = submission['Submission ID'] || 'N/A';
    const submittedDate = submission.submitted_at
      ? new Date(submission.submitted_at).toLocaleDateString()
      : 'N/A';
    sheet.getCell('A2').value =
      `Form Type: ${form.formType?.name || 'N/A'} | Status: ${form.status} | Submission: ${submissionId} | Date: ${submittedDate}`;
    sheet.getCell('A2').font = {
      name: 'Calibri',
      italic: true,
      size: 11,
      color: { argb: 'FF666666' },
    };
    sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 25;

    // Use brand colors
    const categoryColors = [
      'FFFAF7F3',
      'FFDCC5B2',
      'FFD9A299',
      'FFE8F5E8',
      'FFE8E8E8',
      'FFFEFEEE',
      'FFF0E8E8',
      'FFE8F0FF',
      'FFF5E8FF',
      'FFE8FFF0',
    ];

    const categoryBorderColors = [
      'FF003D0C',
      'FFDCC5B2',
      'FFD9A299',
      'FF28A745',
      'FF6C757D',
      'FFFFC107',
      'FFDC3545',
      'FF007BFF',
      'FF6F42C1',
      'FF20C997',
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
    const categoryColSpans: any = {};

    // Metadata columns
    const metadataColumns = [
      { header: 'Submission ID', key: 'Submission ID', width: 15 },
      { header: 'Submitted At', key: 'Submitted At', width: 20 },
      { header: 'Status', key: 'Status', width: 12 },
      { header: 'Member', key: 'Member', width: 20 },
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
        categoryColor: 'FFFAF7F3',
        categoryBorderColor: 'FF003D0C',
      });
      sheet.getColumn(currentCol).width = width;
      currentCol++;
    });

    // Process categories and questions
    if (form.categories) {
      form.categories.forEach((category: any, categoryIndex: number) => {
        const categoryStartCol = currentCol;
        const questions = category.questions || [];
        const colorIndex = categoryIndex % categoryColors.length;

        questions.forEach((question: any) => {
          columnStructure.push({
            category: category.name,
            kpi: question.kpi || question.label || question.placeholder || '',
            description: question.description || question.placeholder || '',
            unit: question.unit || '',
            questionType: question.type || 'text',
            key: question.slug,
            categoryIndex,
            categoryColor: categoryColors[colorIndex],
            categoryBorderColor: categoryBorderColors[colorIndex],
          });

          sheet.getColumn(currentCol).width = this.getColumnWidth(question.type || 'text');
          currentCol++;
        });

        if (questions.length > 0) {
          categoryColSpans[category.name] = {
            start: categoryStartCol,
            end: currentCol - 1,
            color: categoryColors[colorIndex],
            borderColor: categoryBorderColors[colorIndex],
          };
        }
      });
    }

    // Create headers (rows 3-6) following member service pattern
    this.createMemberStyleHeaders(sheet, columnStructure, categoryColSpans, metadataColumns.length);

    // Add the single submission data in row 7
    this.addSingleSubmissionData(sheet, columnStructure, submission, 7);
  }

  private createMemberStyleHeaders(
    sheet: ExcelJS.Worksheet,
    columnStructure: any[],
    categoryColSpans: any,
    metadataColumnCount: number
  ): void {
    // Row 3: Category headers
    const categoryRow = 3;

    // Metadata category
    if (metadataColumnCount > 0) {
      const metadataStartLetter = this.getColumnLetter(1);
      const metadataEndLetter = this.getColumnLetter(metadataColumnCount);

      sheet.getCell(`${metadataStartLetter}${categoryRow}`).value = 'Metadata';
      sheet.getCell(`${metadataStartLetter}${categoryRow}`).font = {
        name: 'Calibri',
        bold: true,
        size: 12,
        color: { argb: 'FFFFFFFF' },
      };
      sheet.getCell(`${metadataStartLetter}${categoryRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF003D0C' },
      };
      sheet.getCell(`${metadataStartLetter}${categoryRow}`).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      if (metadataColumnCount > 1) {
        sheet.mergeCells(`${metadataStartLetter}${categoryRow}:${metadataEndLetter}${categoryRow}`);
      }
    }

    // Form categories
    Object.entries(categoryColSpans).forEach(([categoryName, span]: [string, any]) => {
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

    // Rows 4-6: KPI, Description, Unit headers
    [
      { row: 4, field: 'kpi' },
      { row: 5, field: 'description' },
      { row: 6, field: 'unit' },
    ].forEach(({ row, field }) => {
      let colIndex = 1;
      columnStructure.forEach(col => {
        const colLetter = this.getColumnLetter(colIndex);

        let value = '';
        if (field === 'unit' && col.unit) {
          value = `Unit: ${col.unit}`;
        } else {
          value = col[field] || '';
        }

        sheet.getCell(`${colLetter}${row}`).value = value;
        sheet.getCell(`${colLetter}${row}`).font = {
          name: 'Calibri',
          bold: field === 'kpi',
          italic: field === 'description',
          size: field === 'unit' ? 9 : 11,
          color: { argb: field === 'unit' ? 'FF777777' : 'FF333333' },
        };
        sheet.getCell(`${colLetter}${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: col.categoryColor },
        };
        sheet.getCell(`${colLetter}${row}`).alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
        sheet.getCell(`${colLetter}${row}`).border = {
          top: { style: 'thin', color: { argb: col.categoryBorderColor } },
          left: { style: 'thin', color: { argb: col.categoryBorderColor } },
          bottom: { style: 'thin', color: { argb: col.categoryBorderColor } },
          right: { style: 'thin', color: { argb: col.categoryBorderColor } },
        };

        colIndex++;
      });

      sheet.getRow(row).height = field === 'description' ? 50 : 25;
    });
  }

  private addSingleSubmissionData(
    sheet: ExcelJS.Worksheet,
    columnStructure: any[],
    submission: any,
    rowNumber: number
  ): void {
    let colIndex = 1;

    columnStructure.forEach(col => {
      // console.log(col, "this is colLetter", submission, "this ate the sub")
      const colLetter = this.getColumnLetter(colIndex);
      let value = submission[col.key];

      // Handle undefined/null values properly
      if (value === undefined || value === null) {
        value = 'N/A';
      }

      // Format specific fields
      if (col.key === 'submitted_at' && value !== 'N/A') {
        try {
          value = new Date(value).toLocaleDateString();
        } catch {
          value = 'Invalid Date';
        }
      } else if (col.key === 'id' && (!value || value === 'undefined')) {
        value = submission.id || 'N/A';
      } else if (col.key === 'lastLoginAt') {
        value = submission.status || 'N/A';
      } else if (col.key === 'member_company') {
        value = submission.member_company || 'N/A';
      }

      // General formatting
      value = this.formatCellValue(value, col.questionType);
      sheet.getCell(`${colLetter}${rowNumber}`).value = value;

      sheet.getCell(`${colLetter}${rowNumber}`).font = {
        name: 'Calibri',
        size: 10,
      };
      sheet.getCell(`${colLetter}${rowNumber}`).alignment = {
        vertical: 'top',
        wrapText: col.questionType === 'textarea' || col.questionType === 'text',
      };
      sheet.getCell(`${colLetter}${rowNumber}`).border = {
        top: { style: 'thin', color: { argb: col.categoryBorderColor } },
        left: { style: 'thin', color: { argb: col.categoryBorderColor } },
        bottom: { style: 'thin', color: { argb: col.categoryBorderColor } },
        right: { style: 'thin', color: { argb: col.categoryBorderColor } },
      };

      colIndex++;
    });
  }

  private async createSimplifiedRowBasedSubmissionSheet(
    workbook: ExcelJS.Workbook,
    formData: any,
    submission: any,
    submissionNumber: number
  ): Promise<void> {
    let sheetName = `Sub ${submissionNumber}: ${formData.title}`;
    if (sheetName.length > 31) {
      sheetName = sheetName.substring(0, 28) + '...';
    }
    sheetName = sheetName.replace(/[:\/?*\[\]]/g, '_');

    const sheet = workbook.addWorksheet(sheetName);
    sheet.properties.defaultRowHeight = 20;

    // Title row
    sheet.getCell('A1').value = `Form: ${formData.title}`;
    sheet.getCell('A1').font = {
      name: 'Calibri',
      bold: true,
      size: 16,
      color: { argb: 'FFFFFFFF' },
    };
    sheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF003D0C' },
    };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Create field-value pairs in rows
    let currentRow = 3;

    // Submission metadata
    const metadataFields = [
      ['Submission ID', submission.id || 'N/A'],
      ['Form Title', formData.title],
      ['Form Type', formData.formType?.name || 'N/A'],
      ['Form Year', formData.year || 'N/A'],
      ['Status', submission.status || 'N/A'],
      ['Member Company', submission.member_company || 'N/A'],
      ['Member Email', submission.member_email || 'N/A'],
      ['Site Name', submission.site_name || 'N/A'],
      ['Site Country', submission.site_country || 'N/A'],
      [
        'Submitted At',
        submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'N/A',
      ],
      ['Admin Comment', submission.admin_comment || 'N/A'],
    ];

    // Add headers
    sheet.getCell('A2').value = 'Field';
    sheet.getCell('B2').value = 'Value';
    const headerRow = sheet.getRow(2);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF003D0C' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add metadata
    metadataFields.forEach(([field, value], index) => {
      sheet.getCell(`A${currentRow}`).value = field;
      sheet.getCell(`B${currentRow}`).value = value;

      const row = sheet.getRow(currentRow);
      const isEvenRow = index % 2 === 0;
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEvenRow ? 'FFFAF7F3' : 'FFFFFFFF' },
      };

      sheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;
    });

    // Separator row
    currentRow++;
    sheet.getCell(`A${currentRow}`).value = 'Form Response Data';
    sheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    const separatorRow = sheet.getRow(currentRow);
    separatorRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDCC5B2' },
    };
    currentRow++;

    // Add form response fields
    const reservedFields = new Set([
      'id',
      'form_id',
      'submitted_by',
      'minigrid_siteId',
      'country',
      'submitted_at',
      'status',
      'admin_comment',
      'reviewed_by',
      'reviewed_at',
      'created_at',
      'updated_at',
      'form_title',
      'form_slug',
      'form_type_name',
      'form_year',
      'member_company',
      'member_email',
      'member_id_code',
      'site_name',
      'site_id_code',
      'site_country',
      'site_region',
    ]);

    const responseFields = Object.entries(submission)
      .filter(([key, value]) => !reservedFields.has(key) && value !== null && value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));

    responseFields.forEach(([field, value], index) => {
      const formattedField = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      let displayValue = value;

      if (typeof value === 'object') {
        displayValue = JSON.stringify(value);
      } else if (value instanceof Date) {
        displayValue = value.toLocaleDateString();
      } else if (typeof value === 'boolean') {
        displayValue = value ? 'Yes' : 'No';
      }

      sheet.getCell(`A${currentRow}`).value = formattedField;
      sheet.getCell(`B${currentRow}`).value = displayValue;

      const row = sheet.getRow(currentRow);
      const isEvenRow = index % 2 === 0;
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEvenRow ? 'FFFAF7F3' : 'FFFFFFFF' },
      };

      sheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;
    });

    // Set column widths
    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 50;
  }

  private async createDetailedSubmissionSheetFromFormType(
    workbook: ExcelJS.Workbook,
    form: any,
    submission: any,
    submissionNumber: number
  ): Promise<void> {
    // This method follows the member service createFormSubmissionSheet approach
    // but creates a sheet for individual submission instead of all submissions for a form

    const maxLength = 31;
    let sheetName = `Sub ${submissionNumber}: ${form.title}`;
    if (sheetName.length > maxLength) {
      sheetName = sheetName.substring(0, maxLength - 3) + '...';
    }
    sheetName = sheetName.replace(/[:\/?*\[\]]/g, '_');

    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 7 }],
    });

    sheet.properties.defaultRowHeight = 20;
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
      fgColor: { argb: 'FF003D0C' },
    };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 35;

    // Row 2: Form metadata
    sheet.mergeCells('A2:Z2');
    sheet.getCell('A2').value =
      `Form Type: ${form.formType?.name || 'N/A'} | Status: ${form.status} | Submission: ${submission.id}`;
    sheet.getCell('A2').font = {
      name: 'Calibri',
      italic: true,
      size: 11,
      color: { argb: 'FF666666' },
    };
    sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 25;

    // Use brand color palette
    const categoryColors = [
      'FFFAF7F3', // Primary alt
      'FFDCC5B2', // Accent
      'FFD9A299', // Thick
      'FFE8F5E8', // Light green variant
      'FFE8E8E8', // Light gray
      'FFFEFEEE', // Light yellow
      'FFF0E8E8', // Light red
      'FFE8F0FF', // Light blue
      'FFF5E8FF', // Light purple
      'FFE8FFF0', // Light mint
    ];

    const categoryBorderColors = [
      'FF003D0C', // Primary
      'FFDCC5B2', // Accent
      'FFD9A299', // Thick
      'FF28A745', // Green
      'FF6C757D', // Gray
      'FFFFC107', // Yellow
      'FFDC3545', // Red
      'FF007BFF', // Blue
      'FF6F42C1', // Purple
      'FF20C997', // Mint
    ];

    // Build column structure like member service does
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

    // Metadata columns
    const metadataColumns = [
      { header: 'Submission ID', key: 'id', width: 15 },
      { header: 'Submitted At', key: 'submitted_at', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Member', key: 'member_company', width: 20 },
      { header: 'Site', key: 'site_name', width: 20 },
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
        categoryColor: 'FFFAF7F3',
        categoryBorderColor: 'FF003D0C',
      });

      sheet.getColumn(currentCol).width = width;
      currentCol++;
    });

    // Process form categories and questions
    if (form.categories) {
      form.categories.forEach((category: any, categoryIndex: number) => {
        const categoryStartCol = currentCol;
        const questions = category.questions || [];
        const colorIndex = categoryIndex % categoryColors.length;
        const categoryColor = categoryColors[colorIndex];
        const categoryBorderColor = categoryBorderColors[colorIndex];

        console.log(questions, 'thsdhskjk');

        questions.forEach((question: any) => {
          columnStructure.push({
            category: category.name,
            kpi: question.kpi || question.label || question.placeholder || '',
            description: question.description || question.placeholder || '',
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

        if (questions.length > 0) {
          categoryColSpans[category.name] = {
            start: categoryStartCol,
            end: currentCol - 1,
            color: categoryColor,
            borderColor: categoryBorderColor,
          };
        }
      });
    }

    // Only proceed if we have columns
    if (columnStructure.length === 0) {
      console.log('No columns to display, creating simplified sheet instead');
      return;
    }

    // Create headers following member service pattern
    this.createFormSubmissionHeaders(
      sheet,
      columnStructure,
      categoryColSpans,
      metadataColumns.length
    );

    // Add single submission data
    this.addSubmissionDataRow(sheet, columnStructure, submission, 7);
  }

  private createFormSubmissionHeaders(
    sheet: ExcelJS.Worksheet,
    columnStructure: any[],
    categoryColSpans: any,
    metadataColumnCount: number
  ): void {
    // Row 3: Category headers
    const categoryRow = 3;
    const metadataStartLetter = this.getColumnLetter(1);
    const metadataEndLetter = this.getColumnLetter(metadataColumnCount);

    // Only merge if we have metadata columns
    if (metadataColumnCount > 0) {
      sheet.getCell(`${metadataStartLetter}${categoryRow}`).value = 'Metadata';
      sheet.getCell(`${metadataStartLetter}${categoryRow}`).font = {
        name: 'Calibri',
        bold: true,
        size: 12,
        color: { argb: 'FFFFFFFF' },
      };
      sheet.getCell(`${metadataStartLetter}${categoryRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF003D0C' },
      };
      sheet.getCell(`${metadataStartLetter}${categoryRow}`).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      if (metadataColumnCount > 1) {
        sheet.mergeCells(`${metadataStartLetter}${categoryRow}:${metadataEndLetter}${categoryRow}`);
      }
    }

    // Set form categories
    Object.entries(categoryColSpans).forEach(([categoryName, span]: [string, any]) => {
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

    // Rows 4-6: KPI, Description, Unit headers (following member service pattern)
    [
      { row: 4, field: 'kpi', label: 'KPI' },
      { row: 5, field: 'description', label: 'Description' },
      { row: 6, field: 'unit', label: 'Unit' },
    ].forEach(({ row, field }) => {
      let colIndex = 1;
      columnStructure.forEach(col => {
        const colLetter = this.getColumnLetter(colIndex);

        let value = '';
        if (field === 'unit' && col.unit) {
          value = `Unit: ${col.unit}`;
        } else {
          value = col[field] || '';
        }

        sheet.getCell(`${colLetter}${row}`).value = value;
        sheet.getCell(`${colLetter}${row}`).font = {
          name: 'Calibri',
          bold: field === 'kpi',
          italic: field === 'description',
          size: field === 'unit' ? 9 : 11,
          color: { argb: field === 'unit' ? 'FF777777' : 'FF333333' },
        };
        sheet.getCell(`${colLetter}${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: col.categoryColor },
        };
        sheet.getCell(`${colLetter}${row}`).alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
        sheet.getCell(`${colLetter}${row}`).border = {
          top: { style: 'thin', color: { argb: col.categoryBorderColor } },
          left: { style: 'thin', color: { argb: col.categoryBorderColor } },
          bottom: { style: 'thin', color: { argb: col.categoryBorderColor } },
          right: { style: 'thin', color: { argb: col.categoryBorderColor } },
        };

        colIndex++;
      });

      sheet.getRow(row).height = field === 'description' ? 35 : 25;
    });
  }

  private addSubmissionDataRow(
    sheet: ExcelJS.Worksheet,
    columnStructure: any[],
    submission: any,
    rowNumber: number
  ): void {
    let colIndex = 1;

    columnStructure.forEach(col => {
      const colLetter = this.getColumnLetter(colIndex);
      let value = submission[col.key];

      // Format value based on type
      value = this.formatCellValue(value, col.questionType);
      sheet.getCell(`${colLetter}${rowNumber}`).value = value;

      sheet.getCell(`${colLetter}${rowNumber}`).font = {
        name: 'Calibri',
        size: 10,
      };
      sheet.getCell(`${colLetter}${rowNumber}`).alignment = {
        vertical: 'top',
        wrapText: col.questionType === 'textarea' || col.questionType === 'text',
      };
      sheet.getCell(`${colLetter}${rowNumber}`).border = {
        top: { style: 'thin', color: { argb: col.categoryBorderColor } },
        left: { style: 'thin', color: { argb: col.categoryBorderColor } },
        bottom: { style: 'thin', color: { argb: col.categoryBorderColor } },
        right: { style: 'thin', color: { argb: col.categoryBorderColor } },
      };

      colIndex++;
    });
  }

  private async createSimplifiedSubmissionSheet(
    workbook: ExcelJS.Workbook,
    groupData: any,
    submission: any,
    submissionNumber: number
  ): Promise<void> {
    console.log('Creating simplified submission sheet for:', submission.id);

    // Sanitize sheet name
    const maxLength = 31;
    let sheetName = `Sub ${submissionNumber}: ${groupData.formTitle}`;
    if (sheetName.length > maxLength) {
      sheetName = sheetName.substring(0, maxLength - 3) + '...';
    }
    sheetName = sheetName.replace(/[:\/?*\[\]]/g, '_');

    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }],
    });

    sheet.properties.defaultRowHeight = 20;

    // Row 1: Form Title with brand colors
    try {
      sheet.mergeCells('A1:D1');
    } catch (error) {
      console.log('Merge cells conflict, using single cell for title');
    }
    sheet.getCell('A1').value = `Form: ${groupData.formTitle}`;
    sheet.getCell('A1').font = {
      name: 'Calibri',
      bold: true,
      size: 16,
      color: { argb: 'FFFFFFFF' },
    };
    sheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF003D0C' }, // Primary color
    };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Row 2: Submission metadata
    try {
      sheet.mergeCells('A2:D2');
    } catch (error) {
      console.log('Merge cells conflict for row 2, using single cell');
    }
    const submittedDate = new Date(
      submission.submitted_at || submission.created_at
    ).toLocaleDateString();
    sheet.getCell('A2').value =
      `Submission ID: ${submission.id} | Submitted: ${submittedDate} | Status: ${submission.status}`;
    sheet.getCell('A2').font = {
      name: 'Calibri',
      italic: true,
      size: 11,
      color: { argb: 'FF666666' },
    };
    sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 25;

    // Row 3: Headers
    const headers = ['Field', 'Value'];
    sheet.addRow(headers);
    const headerRow = sheet.getRow(3);
    headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF003D0C' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // Add borders to header
    headerRow.eachCell(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    let rowIndex = 4;

    // Add metadata fields
    const metadataFields = [
      ['Submission ID', submission.id],
      ['Form Title', submission.form_title],
      ['Form Type', submission.form_type_name],
      ['Form Year', submission.form_year],
      ['Status', submission.status],
      ['Member Company', submission.member_company || 'N/A'],
      ['Member Email', submission.member_email || 'N/A'],
      ['Site Name', submission.site_name || 'N/A'],
      ['Site Country', submission.site_country || 'N/A'],
      ['Submitted At', new Date(submission.submitted_at || submission.created_at).toLocaleString()],
      ['Admin Comment', submission.admin_comment || 'N/A'],
    ];

    metadataFields.forEach(([field, value], index) => {
      const row = sheet.addRow([field, value]);
      const isEvenRow = index % 2 === 0;

      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEvenRow ? 'FFFAF7F3' : 'FFFFFFFF' },
      };
      row.alignment = { vertical: 'middle' };
      row.height = 20;

      // Add borders
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };
      });

      // Make field name bold
      row.getCell(1).font = { bold: true };
      rowIndex++;
    });

    // Add separator
    const separatorRow = sheet.addRow(['Form Response Data', '']);
    separatorRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    separatorRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDCC5B2' },
    };
    try {
      sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
    } catch (error) {
      console.log('Merge cells conflict for separator row');
    }
    separatorRow.alignment = { horizontal: 'center', vertical: 'middle' };
    separatorRow.height = 25;
    rowIndex++;

    // Add all other fields (form responses)
    const reservedFields = new Set([
      'id',
      'form_id',
      'submitted_by',
      'minigrid_siteId',
      'country',
      'submitted_at',
      'status',
      'admin_comment',
      'reviewed_by',
      'reviewed_at',
      'created_at',
      'updated_at',
      'form_title',
      'form_slug',
      'form_type_name',
      'form_year',
      'member_company',
      'member_email',
      'member_id_code',
      'site_name',
      'site_id_code',
      'site_country',
      'site_region',
    ]);

    const responseFields = Object.entries(submission)
      .filter(([key, value]) => !reservedFields.has(key) && value !== null && value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));

    responseFields.forEach(([field, value], index) => {
      const formattedField = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      let displayValue = value;

      // Format value based on type
      if (typeof value === 'object') {
        displayValue = JSON.stringify(value);
      } 
    else if (typeof value === 'boolean') {
        displayValue = value ? 'Yes' : 'No';
      }

      const row = sheet.addRow([formattedField, displayValue]);
      const isEvenRow = index % 2 === 0;

      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEvenRow ? 'FFFAF7F3' : 'FFFFFFFF' },
      };
      row.alignment = { vertical: 'top', wrapText: true };
      row.height = 20;

      // Add borders
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };
      });

      // Make field name bold
      row.getCell(1).font = { bold: true };
    });

    // Set column widths
    sheet.getColumn(1).width = 30; // Field names
    sheet.getColumn(2).width = 50; // Values
  }

  private getColumnLetter(columnNumber: number): string {
    let letter = '';
    while (columnNumber > 0) {
      const remainder = (columnNumber - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      columnNumber = Math.floor((columnNumber - 1) / 26);
    }
    return letter;
  }

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

      case 'metadata':
        if (type === 'metadata') {
          // Special formatting for metadata fields
          if (value instanceof Date) {
            return value.toLocaleDateString();
          }
        }
        return value;

      default:
        return value;
    }
  }
}
