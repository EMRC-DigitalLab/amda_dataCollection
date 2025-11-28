import * as fs from 'fs';
import { Injectable } from 'injection-js';
import { Parser } from 'json2csv';
import * as path from 'path';
import * as XLSX from 'xlsx';
import {
  BulkExportRequestDto,
  ExportPreviewDto,
  ExportRequestDto
} from '../dtos/export.dto';
import {
  ExportFilters,
  ExportFormat,
  ExportResult,
  ExportSummary,
  ExportType,
  IExportRepository
} from '../interfaces/export.interface';

@Injectable()
export class ExportService {
  private readonly exportDir = path.join(process.cwd(), 'exports');

  constructor(private readonly exportRepo: IExportRepository) {
    this.ensureExportDirectory();
  }

  private ensureExportDirectory(): void {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  async exportData(
    requestDto: ExportRequestDto, 
    exportedBy: string
  ): Promise<ExportResult> {
    const filters: ExportFilters = {
      formTypeId: requestDto.formTypeId,
      year: requestDto.year,
      memberId: requestDto.memberId,
      siteId: requestDto.siteId,
      submissionStatus: requestDto.submissionStatus,
      dateRange: requestDto.dateRange ? {
        start: new Date(requestDto.dateRange.start),
        end: new Date(requestDto.dateRange.end)
      } : undefined
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
      filteredData = filteredData.filter(item => 
        item.status === filters.submissionStatus || 
        item.admin_status === filters.submissionStatus
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
        fileSize = await this.exportToXLSX(cleanedData, filePath);
        break;
      case ExportFormat.JSON:
        fileSize = await this.exportToJSON(cleanedData, filePath);
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
      filters
    };
  }

  private cleanExportData(data: any[]): any[] {
    return data.map(item => {
      const cleanItem: any = {};

      cleanItem['Submission ID'] = item.id;
      cleanItem['Form Title'] = item.form_title;
      cleanItem['Form Type'] = item.form_type_name;
      cleanItem['Form Year'] = item.form_year;
      cleanItem['Status'] = item.status;
      cleanItem['Admin Status'] = item.admin_status;
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
        'id', 'form_id', 'submitted_by', 'minigrid_siteId', 'country',
        'submitted_at', 'status', 'admin_status', 'admin_comment',
        'reviewed_by', 'reviewed_at', 'created_at', 'updated_at',
        'form_title', 'form_slug', 'form_type_name', 'form_year',
        'member_company', 'member_email', 'member_id_code',
        'site_name', 'site_id_code', 'site_country', 'site_region'
      ]);

      for (const [key, value] of Object.entries(item)) {
        if (!reservedFields.has(key) && value !== null && value !== undefined) {
          const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          if (typeof value === 'object') {
            cleanItem[formattedKey] = JSON.stringify(value);
          } else if (value instanceof Date) {
            cleanItem[formattedKey] = value.toISOString();
          } else {
            cleanItem[formattedKey] = value;
          }
        }
      }

      return cleanItem;
    });
  }

  async bulkExport(
    requestDto: BulkExportRequestDto,
    exportedBy: string
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = [];

    if (requestDto.formTypeIds?.length) {
      for (const formTypeId of requestDto.formTypeIds) {
        try {
          const exportRequest: ExportRequestDto = {
            exportType: ExportType.FORM_TYPE_YEARLY,
            format: requestDto.format,
            formTypeId,
            year: requestDto.year
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
            year: requestDto.year
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
            year: requestDto.year
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
      siteId: previewDto.siteId
    };

    const data = await this.fetchDataByExportType(previewDto.exportType, filters);
    const cleanedData = this.cleanExportData(data);
    return cleanedData.slice(0, previewDto.limit || 10);
  }

  async getExportSummary(
    exportType: ExportType,
    filters: ExportFilters
  ): Promise<ExportSummary> {
    const data = await this.fetchDataByExportType(exportType, filters);
    
    const formTypes = [...new Set(data.map(item => item.form_type_name).filter(Boolean))];
    const memberCount = new Set(data.map(item => item.submitted_by).filter(Boolean)).size;
    const siteCount = new Set(data.map(item => item.minigrid_siteId).filter(Boolean)).size;
    
    const dates = data.map(item => new Date(item.created_at || item.submitted_at)).filter(date => !isNaN(date.getTime()));
    
    const dateRange = dates.length > 0 ? {
      earliest: new Date(Math.min(...dates.map(d => d.getTime()))),
      latest: new Date(Math.max(...dates.map(d => d.getTime())))
    } : { earliest: new Date(), latest: new Date() };

    return {
      totalRecords: data.length,
      exportType,
      filters,
      formTypes,
      memberCount,
      siteCount,
      dateRange
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

  private async exportToXLSX(data: any[], filePath: string): Promise<number> {
    const workbook = XLSX.utils.book_new();
    
    // Determine export type based on data
    const hasMemberData = data.some(item => item['Member Company'] || item.member_company);
    const hasSiteData = data.some(item => item['Site Name'] || item.site_name);
    
    if (hasMemberData || hasSiteData) {
      // Multi-sheet workbook with proper organization
      await this.createEnhancedWorkbook(workbook, data);
    } else {
      // Simple single sheet
      const worksheet = this.createBeautifiedSheet(data, 'Submissions');
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');
    }
    
    XLSX.writeFile(workbook, filePath);
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
        font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: isSummary ? "4472C4" : "2E75B6" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }

    // Apply alternating row colors and borders
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const isEvenRow = (R - range.s.r) % 2 === 0;
      
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;
        
        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: isEvenRow ? "F2F2F2" : "FFFFFF" } },
          alignment: { vertical: "center", wrapText: false },
          border: {
            top: { style: "thin", color: { rgb: "D0D0D0" } },
            bottom: { style: "thin", color: { rgb: "D0D0D0" } },
            left: { style: "thin", color: { rgb: "D0D0D0" } },
            right: { style: "thin", color: { rgb: "D0D0D0" } }
          }
        };
        
        // Format dates
        if (worksheet[cellAddress].v instanceof Date || 
            (typeof worksheet[cellAddress].v === 'string' && 
             /^\d{4}-\d{2}-\d{2}/.test(worksheet[cellAddress].v))) {
          worksheet[cellAddress].t = 'd';
          worksheet[cellAddress].z = 'yyyy-mm-dd hh:mm:ss';
        }
        
        // Format numbers
        if (typeof worksheet[cellAddress].v === 'number' && !Number.isInteger(worksheet[cellAddress].v)) {
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

  private generateSummaryData(data: any[]): any[] {
    const summary = [];
    
    // Export Information
    summary.push({
      'Metric': 'Export Information',
      'Value': ''
    });
    summary.push({
      'Metric': 'Total Records',
      'Value': data.length
    });
    summary.push({
      'Metric': 'Export Date',
      'Value': new Date().toISOString()
    });
    summary.push({ 'Metric': '', 'Value': '' });

    // Form Types
    const formTypes = [...new Set(data.map(item => item['Form Type']).filter(Boolean))];
    summary.push({
      'Metric': 'Form Types',
      'Value': ''
    });
    formTypes.forEach(type => {
      const count = data.filter(item => item['Form Type'] === type).length;
      summary.push({
        'Metric': `  ${type}`,
        'Value': count
      });
    });
    summary.push({ 'Metric': '', 'Value': '' });

    // Status Breakdown
    const statuses = [...new Set(data.map(item => item['Admin Status'] || item['Status']).filter(Boolean))];
    summary.push({
      'Metric': 'Status Breakdown',
      'Value': ''
    });
    statuses.forEach(status => {
      const count = data.filter(item => 
        (item['Admin Status'] === status || item['Status'] === status)
      ).length;
      summary.push({
        'Metric': `  ${status}`,
        'Value': count
      });
    });
    summary.push({ 'Metric': '', 'Value': '' });

    // Member Statistics
    const uniqueMembers = new Set(data.map(item => item['Member Company']).filter(Boolean)).size;
    summary.push({
      'Metric': 'Member Statistics',
      'Value': ''
    });
    summary.push({
      'Metric': '  Unique Members',
      'Value': uniqueMembers
    });

    // Site Statistics
    const uniqueSites = new Set(data.map(item => item['Site Name']).filter(Boolean)).size;
    summary.push({
      'Metric': '  Unique Sites',
      'Value': uniqueSites
    });

    // Date Range
    const dates = data.map(item => new Date(item['Submitted At'] || item['Created At'])).filter(d => !isNaN(d.getTime()));
    if (dates.length > 0) {
      summary.push({ 'Metric': '', 'Value': '' });
      summary.push({
        'Metric': 'Date Range',
        'Value': ''
      });
      summary.push({
        'Metric': '  Earliest',
        'Value': new Date(Math.min(...dates.map(d => d.getTime()))).toISOString()
      });
      summary.push({
        'Metric': '  Latest',
        'Value': new Date(Math.max(...dates.map(d => d.getTime()))).toISOString()
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
        const memberSubmissions = data.filter(d => 
          (d['Member Company'] || d.member_company) === memberCompany
        );
        
        const uniqueForms = new Set(memberSubmissions.map(s => s['Form Title'])).size;
        const uniqueSites = new Set(memberSubmissions.map(s => s['Site Name']).filter(Boolean)).size;
        
        memberMap.set(memberCompany, {
          'Member Company': memberCompany,
          'Member Email': memberEmail || 'N/A',
          'Member ID': memberId || 'N/A',
          'Total Submissions': memberSubmissions.length,
          'Unique Forms': uniqueForms,
          'Associated Sites': uniqueSites,
          'Latest Submission': memberSubmissions
            .map(s => new Date(s['Submitted At'] || s['Created At']))
            .sort((a, b) => b.getTime() - a.getTime())[0]
            ?.toISOString() || 'N/A'
        });
      }
    });
    
    return Array.from(memberMap.values()).sort((a, b) => 
      b['Total Submissions'] - a['Total Submissions']
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
        const siteSubmissions = data.filter(d => 
          (d['Site Name'] || d.site_name) === siteName
        );
        
        const uniqueForms = new Set(siteSubmissions.map(s => s['Form Title'])).size;
        
        siteMap.set(siteName, {
          'Site Name': siteName,
          'Site ID': siteId || 'N/A',
          'Country': siteCountry || 'N/A',
          'Region': siteRegion || 'N/A',
          'Total Submissions': siteSubmissions.length,
          'Unique Forms': uniqueForms,
          'Latest Submission': siteSubmissions
            .map(s => new Date(s['Submitted At'] || s['Created At']))
            .sort((a, b) => b.getTime() - a.getTime())[0]
            ?.toISOString() || 'N/A'
        });
      }
    });
    
    return Array.from(siteMap.values()).sort((a, b) => 
      b['Total Submissions'] - a['Total Submissions']
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
          const formSubmissions = data.filter(d => 
            d['Form Title'] === formTitle && d['Form Year'] === formYear
          );
          
          const statusBreakdown = {
            'PENDING': formSubmissions.filter(s => s['Admin Status'] === 'PENDING').length,
            'APPROVED': formSubmissions.filter(s => s['Admin Status'] === 'APPROVED').length,
            'REJECTED': formSubmissions.filter(s => s['Admin Status'] === 'REJECTED').length,
          };
          
          formMap.set(key, {
            'Form Title': formTitle,
            'Form Type': formType || 'N/A',
            'Year': formYear || 'N/A',
            'Total Submissions': formSubmissions.length,
            'Pending': statusBreakdown.PENDING,
            'Approved': statusBreakdown.APPROVED,
            'Rejected': statusBreakdown.REJECTED,
            'Unique Members': new Set(formSubmissions.map(s => s['Member Company']).filter(Boolean)).size,
            'Unique Sites': new Set(formSubmissions.map(s => s['Site Name']).filter(Boolean)).size,
          });
        }
      }
    });
    
    return Array.from(formMap.values()).sort((a, b) => 
      b['Total Submissions'] - a['Total Submissions']
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
          earliest: data.length > 0 ? 
            new Date(Math.min(...data.map(item => 
              new Date(item['Submitted At'] || item['Created At']).getTime()
            ))).toISOString() : null,
          latest: data.length > 0 ? 
            new Date(Math.max(...data.map(item => 
              new Date(item['Submitted At'] || item['Created At']).getTime()
            ))).toISOString() : null
        },
        statusBreakdown: {
          pending: data.filter(item => item['Admin Status'] === 'PENDING').length,
          approved: data.filter(item => item['Admin Status'] === 'APPROVED').length,
          rejected: data.filter(item => item['Admin Status'] === 'REJECTED').length,
        }
      },
      members: this.extractMemberData(data),
      sites: this.extractSiteData(data),
      submissions: data,
      formBreakdown: this.generateFormBreakdown(data)
    };
    
    const jsonData = JSON.stringify(exportData, null, 2);
    fs.writeFileSync(filePath, jsonData, 'utf8');
    
    const stats = fs.statSync(filePath);
    return stats.size;
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
      return files.map(fileName => {
        const filePath = path.join(this.exportDir, fileName);
        const stats = fs.statSync(filePath);
        return {
          fileName,
          size: stats.size,
          created: stats.birthtime
        };
      }).sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch {
      return [];
    }
  }
}