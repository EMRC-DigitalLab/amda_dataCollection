// @ts-nocheck
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { Injectable } from 'injection-js';
import { Parser } from 'json2csv';
import * as path from 'path';
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

  // Professional color palette
  private readonly colors = {
    primary: 'FF2E75B6',     // Dark Blue
    secondary: 'FF4472C4',   // Medium Blue
    success: 'FF70AD47',     // Green
    warning: 'FFFFC000',     // Orange
    danger: 'FFC00000',      // Red
    light: 'FFF2F2F2',       // Light Gray
    dark: 'FF333333',        // Dark Gray
    accent1: 'FF7030A0',     // Purple
    accent2: 'FFED7D31',     // Orange
    accent3: 'FF00B0F0',     // Cyan
    white: 'FFFFFFFF'        // White
  };

  // Category colors for form submissions
  private readonly categoryColors = [
    'FFE6F0FF', // Light Blue
    'FFE6F7ED', // Light Green
    'FFFFF4E6', // Light Orange
    'FFFFFDE6', // Light Yellow
    'FFFAE6FF', // Light Purple
    'FFFFE6E6', // Light Red
    'FFE6F9FF', // Light Cyan
    'FFF0E6FF', // Light Lavender
    'FFE6FFFC', // Light Mint
    'FFFFF0E6'  // Light Peach
  ];

  private readonly categoryBorderColors = [
    'FF2E75B6', // Dark Blue
    'FF70AD47', // Dark Green
    'FFED7D31', // Dark Orange
    'FFFFC000', // Dark Yellow
    'FF7030A0', // Dark Purple
    'FFC00000', // Dark Red
    'FF00B0F0', // Dark Cyan
    'FF8064A2', // Dark Lavender
    'FF00B050', // Dark Mint
    'FFFF6600'  // Dark Peach
  ];

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

    const fileName = this.generateFileName(requestDto.exportType, requestDto.format, filters);
    const filePath = path.join(this.exportDir, fileName);

    let fileSize = 0;

    switch (requestDto.format) {
      case ExportFormat.CSV:
        fileSize = await this.exportToCSV(filteredData, filePath);
        break;
      case ExportFormat.XLSX:
        fileSize = await this.exportToExcelJS(filteredData, filePath, requestDto.exportType, filters);
        break;
      case ExportFormat.JSON:
        fileSize = await this.exportToJSON(filteredData, filePath);
        break;
      default:
        throw new Error(`Unsupported export format: ${requestDto.format}`);
    }

    return {
      success: true,
      fileName,
      filePath,
      format: requestDto.format,
      recordCount: filteredData.length,
      fileSize,
      exportedAt: new Date(),
      exportedBy,
      filters
    };
  }

  private async exportToExcelJS(
    data: any[], 
    filePath: string, 
    exportType: ExportType,
    filters: ExportFilters
  ): Promise<number> {
    const workbook = new ExcelJS.Workbook();
    
    // Workbook properties
    workbook.creator = 'AMDA Analytics Platform';
    workbook.created = new Date();
    workbook.company = 'AMDA';
    workbook.title = this.getExportTitle(exportType, filters);
    workbook.description = `Data export generated on ${new Date().toLocaleDateString()}`;

    // Create sheets based on data structure
    await this.createEnhancedWorkbook(workbook, data, exportType, filters);

    // Write to file
    await workbook.xlsx.writeFile(filePath);
    const stats = fs.statSync(filePath);
    return stats.size;
  }

  private async createEnhancedWorkbook(
    workbook: ExcelJS.Workbook, 
    data: any[], 
    exportType: ExportType,
    filters: ExportFilters
  ): Promise<void> {
    // Sheet 1: Executive Summary
    this.createSummarySheet(workbook, data, exportType, filters);

    // Sheet 2: Member Overview (if member data exists)
    const memberData = this.extractMemberData(data);
    if (memberData.length > 0) {
      this.createMemberSheet(workbook, memberData);
    }

    // Sheet 3: Sites Overview (if site data exists)
    const siteData = this.extractSiteData(data);
    if (siteData.length > 0) {
      this.createSiteSheet(workbook, siteData);
    }

    // Sheet 4+: Form Submissions (organized by form type)
    this.createFormSubmissionsSheets(workbook, data);

    // Sheet 5: Analytics & KPIs
    this.createAnalyticsSheet(workbook, data, exportType);
  }

  private createSummarySheet(
    workbook: ExcelJS.Workbook, 
    data: any[], 
    exportType: ExportType,
    filters: ExportFilters
  ): void {
    const sheet = workbook.addWorksheet('📊 Executive Summary', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 2 }],
      properties: { tabColor: { argb: this.colors.primary } }
    });

    // Title Section
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'AMDA - EXPORT SUMMARY REPORT';
    titleCell.font = { bold: true, size: 18, color: { argb: this.colors.white } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.primary } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 35;

    // Subtitle
    sheet.mergeCells('A2:F2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = `Export Type: ${this.formatExportType(exportType)} | Generated: ${new Date().toLocaleDateString()}`;
    subtitleCell.font = { italic: true, size: 11, color: { argb: this.colors.dark } };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.light } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 25;

    let currentRow = 4;

    // Key Metrics Section
    this.addSectionHeader(sheet, currentRow, 'KEY PERFORMANCE INDICATORS', 'A', 'F');
    currentRow++;

    const metrics = this.calculateMetrics(data);
    const metricRows = [
      ['Total Submissions', metrics.totalSubmissions, this.colors.primary],
      ['Unique Members', metrics.uniqueMembers, this.colors.success],
      ['Unique Sites', metrics.uniqueSites, this.colors.accent1],
      ['Form Types', metrics.formTypes.length, this.colors.accent2],
      ['Completion Rate', `${metrics.completionRate}%`, this.colors.secondary],
      ['Avg Submissions per Member', metrics.avgSubmissionsPerMember.toFixed(1), this.colors.accent3]
    ];

    metricRows.forEach(([label, value, color], index) => {
      const row = sheet.getRow(currentRow);
      row.height = 30;

      sheet.mergeCells(`A${currentRow}:D${currentRow}`);
      const labelCell = sheet.getCell(`A${currentRow}`);
      labelCell.value = label;
      labelCell.font = { bold: true, size: 12 };
      labelCell.alignment = { horizontal: 'left', vertical: 'middle' };

      sheet.mergeCells(`E${currentRow}:F${currentRow}`);
      const valueCell = sheet.getCell(`E${currentRow}`);
      valueCell.value = value;
      valueCell.font = { bold: true, size: 14, color: { argb: this.colors.white } };
      valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      valueCell.alignment = { horizontal: 'center', vertical: 'middle' };

      currentRow++;
    });

    currentRow += 2;

    // Form Type Breakdown
    this.addSectionHeader(sheet, currentRow, 'FORM TYPE BREAKDOWN', 'A', 'F');
    currentRow++;

    const formTypeHeader = sheet.getRow(currentRow);
    formTypeHeader.font = { bold: true, color: { argb: this.colors.white } };
    formTypeHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.secondary } };
    formTypeHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    
    sheet.getCell(`A${currentRow}`).value = 'Form Type';
    sheet.getCell(`B${currentRow}`).value = 'Submissions';
    sheet.getCell(`C${currentRow}`).value = 'Members';
    sheet.getCell(`D${currentRow}`).value = 'Sites';
    sheet.getCell(`E${currentRow}`).value = 'Pending';
    sheet.getCell(`F${currentRow}`).value = 'Approved';
    currentRow++;

    metrics.formTypeBreakdown.forEach(breakdown => {
      const row = sheet.getRow(currentRow);
      
      sheet.getCell(`A${currentRow}`).value = breakdown.formType;
      sheet.getCell(`B${currentRow}`).value = breakdown.total;
      sheet.getCell(`C${currentRow}`).value = breakdown.uniqueMembers;
      sheet.getCell(`D${currentRow}`).value = breakdown.uniqueSites;
      sheet.getCell(`E${currentRow}`).value = breakdown.pending;
      sheet.getCell(`F${currentRow}`).value = breakdown.approved;

      // Alternate row colors
      if (currentRow % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.light } };
      }

      currentRow++;
    });

    // Status Breakdown
    currentRow += 2;
    this.addSectionHeader(sheet, currentRow, 'STATUS BREAKDOWN', 'A', 'F');
    currentRow++;

    const statusHeader = sheet.getRow(currentRow);
    statusHeader.font = { bold: true, color: { argb: this.colors.white } };
    statusHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.secondary } };
    statusHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    
    sheet.getCell(`A${currentRow}`).value = 'Status';
    sheet.getCell(`B${currentRow}`).value = 'Count';
    sheet.getCell(`C${currentRow}`).value = 'Percentage';
    sheet.getCell(`D${currentRow}`).value = 'Trend';
    currentRow++;

    const statusCounts = this.calculateStatusBreakdown(data);
    statusCounts.forEach(status => {
      const row = sheet.getRow(currentRow);
      
      sheet.getCell(`A${currentRow}`).value = status.status;
      sheet.getCell(`B${currentRow}`).value = status.count;
      sheet.getCell(`C${currentRow}`).value = `${status.percentage}%`;
      sheet.getCell(`D${currentRow}`).value = status.trend;

      // Color code based on status
      let statusColor = this.colors.primary;
      if (status.status === 'APPROVED') statusColor = this.colors.success;
      if (status.status === 'PENDING') statusColor = this.colors.warning;
      if (status.status === 'REJECTED') statusColor = this.colors.danger;

      sheet.getCell(`A${currentRow}`).fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: statusColor } 
      };
      sheet.getCell(`A${currentRow}`).font = { 
        bold: true, 
        color: { argb: this.colors.white } 
      };

      currentRow++;
    });

    // Set column widths
    sheet.columns = [
      { width: 35 }, { width: 15 }, { width: 12 }, 
      { width: 12 }, { width: 12 }, { width: 12 }
    ];

    // Add borders
    this.addBordersToRange(sheet, 4, currentRow - 1, 1, 6);
  }

  private createMemberSheet(workbook: ExcelJS.Workbook, memberData: any[]): void {
    const sheet = workbook.addWorksheet('👥 Members Overview', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
      properties: { tabColor: { argb: this.colors.success } }
    });

    // Header
    const headerRow = sheet.addRow([
      'Member Company', 'Email', 'Member ID', 
      'Total Submissions', 'Unique Forms', 'Associated Sites', 
      'Latest Submission', 'Status', 'Activity Level'
    ]);

    headerRow.font = { bold: true, color: { argb: this.colors.white } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.success } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // Data rows
    memberData.forEach((member, index) => {
      const activityLevel = this.getMemberActivityLevel(member['Total Submissions']);
      const status = this.getMemberStatus(member['Total Submissions']);
      
      const row = sheet.addRow([
        member['Member Company'],
        member['Member Email'],
        member['Member ID'],
        member['Total Submissions'],
        member['Unique Forms'],
        member['Associated Sites'],
        member['Latest Submission'],
        status,
        activityLevel
      ]);

      // Color code activity level
      const activityCell = row.getCell(9);
      switch (activityLevel) {
        case 'High':
          activityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.success } };
          break;
        case 'Medium':
          activityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.warning } };
          break;
        case 'Low':
          activityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.accent2 } };
          break;
        default:
          activityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.light } };
      }
      activityCell.font = { bold: true, color: { argb: this.colors.white } };
      activityCell.alignment = { horizontal: 'center' };

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } };
      }
    });

    // Set column widths
    sheet.columns = [
      { width: 30 }, { width: 25 }, { width: 15 },
      { width: 18 }, { width: 15 }, { width: 18 },
      { width: 20 }, { width: 15 }, { width: 12 }
    ];

    // Add auto filters
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 9 }
    };

    // Add summary
    const totalRow = sheet.addRow([]);
    sheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
    sheet.getCell(`A${totalRow.number}`).value = `Total Members: ${memberData.length}`;
    sheet.getCell(`A${totalRow.number}`).font = { bold: true };
    sheet.getCell(`A${totalRow.number}`).fill = { 
      type: 'pattern', 
      pattern: 'solid', 
      fgColor: { argb: this.colors.light } 
    };
  }

  private createSiteSheet(workbook: ExcelJS.Workbook, siteData: any[]): void {
    const sheet = workbook.addWorksheet('⚡ Sites Overview', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
      properties: { tabColor: { argb: this.colors.accent3 } }
    });

    // Header
    const headerRow = sheet.addRow([
      'Site Name', 'Site ID', 'Country', 'Region',
      'Total Submissions', 'Unique Forms', 'Member Company',
      'Latest Submission', 'Activity Level'
    ]);

    headerRow.font = { bold: true, color: { argb: this.colors.white } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.accent3 } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // Data rows
    siteData.forEach((site, index) => {
      const activityLevel = this.getSiteActivityLevel(site['Total Submissions']);
      
      const row = sheet.addRow([
        site['Site Name'],
        site['Site ID'],
        site['Country'],
        site['Region'],
        site['Total Submissions'],
        site['Unique Forms'],
        site['Member Company'] || 'N/A',
        site['Latest Submission'],
        activityLevel
      ]);

      // Color code activity level
      const activityCell = row.getCell(9);
      switch (activityLevel) {
        case 'High':
          activityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.success } };
          break;
        case 'Medium':
          activityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.warning } };
          break;
        case 'Low':
          activityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.accent2 } };
          break;
        default:
          activityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.light } };
      }
      activityCell.font = { bold: true, color: { argb: this.colors.white } };
      activityCell.alignment = { horizontal: 'center' };

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } };
      }
    });

    // Set column widths
    sheet.columns = [
      { width: 25 }, { width: 15 }, { width: 15 }, { width: 15 },
      { width: 18 }, { width: 15 }, { width: 25 }, { width: 20 }, { width: 12 }
    ];

    // Add auto filters
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 9 }
    };

    // Add summary
    const totalRow = sheet.addRow([]);
    sheet.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
    sheet.getCell(`A${totalRow.number}`).value = `Total Sites: ${siteData.length}`;
    sheet.getCell(`A${totalRow.number}`).font = { bold: true };
    sheet.getCell(`A${totalRow.number}`).fill = { 
      type: 'pattern', 
      pattern: 'solid', 
      fgColor: { argb: this.colors.light } 
    };
  }

  private createFormSubmissionsSheets(workbook: ExcelJS.Workbook, data: any[]): void {
    // Group data by form type
    const formGroups = this.groupByFormType(data);

    formGroups.forEach((formData, formType) => {
      const sheetName = this.sanitizeSheetName(`📝 ${formType}`);
      const sheet = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }],
        properties: { tabColor: { argb: this.colors.accent2 } }
      });

      this.createFormSubmissionSheet(sheet, formData, formType);
    });
  }

  private createFormSubmissionSheet(sheet: ExcelJS.Worksheet, data: any[], formType: string): void {
    // Title Section
    sheet.mergeCells('A1:Z1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Form: ${formType}`;
    titleCell.font = { bold: true, size: 16, color: { argb: this.colors.white } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.primary } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 35;

    // Metadata row
    sheet.mergeCells('A2:Z2');
    const metaCell = sheet.getCell('A2');
    metaCell.value = `Total Submissions: ${data.length} | Generated: ${new Date().toLocaleDateString()}`;
    metaCell.font = { italic: true, size: 11 };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.light } };
    metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 25;

    // Build column structure with categories
    const columnStructure = this.buildColumnStructure(data);
    let currentCol = 1;

    // Metadata columns first
    const metadataColumns = [
      { header: 'Submission ID', key: 'id', width: 15 },
      { header: 'Submitted At', key: 'submitted_at', width: 20 },
      { header: 'Status', key: 'admin_status', width: 12 },
      { header: 'Member', key: 'member_company', width: 25 },
      { header: 'Site', key: 'site_name', width: 20 },
      { header: 'Country', key: 'site_country', width: 15 }
    ];

    metadataColumns.forEach(col => {
      sheet.getColumn(currentCol).width = col.width;
      currentCol++;
    });

    // Category columns
    const categoryColSpans: any = {};
    const categories = [...new Set(columnStructure.map(col => col.category))];

    categories.forEach((category, categoryIndex) => {
      const categoryStartCol = currentCol;
      const categoryQuestions = columnStructure.filter(col => col.category === category);
      const colorIndex = categoryIndex % this.categoryColors.length;

      categoryQuestions.forEach(question => {
        sheet.getColumn(currentCol).width = this.getColumnWidth(question.type);
        currentCol++;
      });

      categoryColSpans[category] = {
        start: categoryStartCol,
        end: currentCol - 1,
        color: this.categoryColors[colorIndex],
        borderColor: this.categoryBorderColors[colorIndex]
      };
    });

    // Category headers (Row 3)
    const categoryRow = 3;

    // Metadata category
    const metadataEndCol = metadataColumns.length;
    const metadataEndLetter = this.getColumnLetter(metadataEndCol);
    sheet.mergeCells(`A${categoryRow}:${metadataEndLetter}${categoryRow}`);
    sheet.getCell(`A${categoryRow}`).value = 'METADATA';
    sheet.getCell(`A${categoryRow}`).font = { bold: true, color: { argb: this.colors.dark } };
    sheet.getCell(`A${categoryRow}`).fill = { 
      type: 'pattern', 
      pattern: 'solid', 
      fgColor: { argb: this.colors.light } 
    };
    sheet.getCell(`A${categoryRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

    // Form categories
    Object.entries(categoryColSpans).forEach(([categoryName, span]: [string, any]) => {
      const startCol = this.getColumnLetter(span.start);
      const endCol = this.getColumnLetter(span.end);

      sheet.getCell(`${startCol}${categoryRow}`).value = categoryName.toUpperCase();
      sheet.getCell(`${startCol}${categoryRow}`).font = { 
        bold: true, 
        color: { argb: this.colors.dark } 
      };
      sheet.getCell(`${startCol}${categoryRow}`).fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: span.color } 
      };
      sheet.getCell(`${startCol}${categoryRow}`).alignment = { 
        horizontal: 'center', 
        vertical: 'middle' 
      };

      if (span.start !== span.end) {
        sheet.mergeCells(`${startCol}${categoryRow}:${endCol}${categoryRow}`);
      }
    });

    sheet.getRow(categoryRow).height = 30;

    // Question headers (Row 4)
    const questionRow = 4;
    let colIndex = 1;

    // Metadata question headers
    metadataColumns.forEach(col => {
      const colLetter = this.getColumnLetter(colIndex);
      sheet.getCell(`${colLetter}${questionRow}`).value = col.header;
      sheet.getCell(`${colLetter}${questionRow}`).font = { bold: true };
      sheet.getCell(`${colLetter}${questionRow}`).fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: this.colors.light } 
      };
      sheet.getCell(`${colLetter}${questionRow}`).alignment = { 
        horizontal: 'center', 
        vertical: 'middle' 
      };
      colIndex++;
    });

    // Form question headers
    columnStructure.forEach(col => {
      const colLetter = this.getColumnLetter(colIndex);
      sheet.getCell(`${colLetter}${questionRow}`).value = col.kpi;
      sheet.getCell(`${colLetter}${questionRow}`).font = { bold: true };
      sheet.getCell(`${colLetter}${questionRow}`).fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: this.categoryColors[col.categoryIndex % this.categoryColors.length] } 
      };
      sheet.getCell(`${colLetter}${questionRow}`).alignment = { 
        horizontal: 'center', 
        vertical: 'middle',
        wrapText: true 
      };
      colIndex++;
    });

    sheet.getRow(questionRow).height = 25;

    // Add data rows
    let currentDataRow = 5;
    data.forEach((submission, index) => {
      let colIndex = 1;

      // Metadata
      metadataColumns.forEach(col => {
        const value = this.formatCellValue(submission[col.key], col.key);
        const cell = sheet.getCell(`${this.getColumnLetter(colIndex)}${currentDataRow}`);
        cell.value = value;
        
        // Color code status
        if (col.key === 'admin_status') {
          cell.font = { bold: true };
          switch (value) {
            case 'APPROVED':
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.success } };
              cell.font.color = { argb: this.colors.white };
              break;
            case 'PENDING':
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.warning } };
              cell.font.color = { argb: this.colors.white };
              break;
            case 'REJECTED':
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.danger } };
              cell.font.color = { argb: this.colors.white };
              break;
          }
        }
        
        colIndex++;
      });

      // Form data
      columnStructure.forEach(col => {
        const value = this.formatCellValue(submission[col.key], col.type);
        sheet.getCell(`${this.getColumnLetter(colIndex)}${currentDataRow}`).value = value;
        colIndex++;
      });

      // Style the row
      const row = sheet.getRow(currentDataRow);
      if (index % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } };
      }

      currentDataRow++;
    });

    // Add auto filters
    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4, column: colIndex - 1 }
    };

    // Add borders to headers
    this.addBordersToRange(sheet, 3, 4, 1, colIndex - 1);
  }

  private createAnalyticsSheet(workbook: ExcelJS.Workbook, data: any[], exportType: ExportType): void {
    const sheet = workbook.addWorksheet('📈 Analytics & KPIs', {
      properties: { tabColor: { argb: this.colors.accent1 } }
    });

    // Title
    sheet.mergeCells('A1:E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'ANALYTICS DASHBOARD';
    titleCell.font = { bold: true, size: 16, color: { argb: this.colors.white } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.primary } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 35;

    // Monthly Trends
    let currentRow = 3;
    this.addSectionHeader(sheet, currentRow, 'MONTHLY SUBMISSION TRENDS', 'A', 'E');
    currentRow++;

    const monthlyTrends = this.calculateMonthlyTrends(data);
    const trendsHeader = sheet.getRow(currentRow);
    trendsHeader.font = { bold: true, color: { argb: this.colors.white } };
    trendsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.colors.secondary } };
    
    sheet.getCell(`A${currentRow}`).value = 'Month';
    sheet.getCell(`B${currentRow}`).value = 'Submissions';
    sheet.getCell(`C${currentRow}`).value = 'Growth %';
    sheet.getCell(`D${currentRow}`).value = 'Members';
    sheet.getCell(`E${currentRow}`).value = 'Sites';
    currentRow++;

    monthlyTrends.forEach(trend => {
      const row = sheet.getRow(currentRow);
      sheet.getCell(`A${currentRow}`).value = trend.month;
      sheet.getCell(`B${currentRow}`).value = trend.submissions;
      sheet.getCell(`C${currentRow}`).value = `${trend.growth}%`;
      sheet.getCell(`D${currentRow}`).value = trend.members;
      sheet.getCell(`E${currentRow}`).value = trend.sites;

      // Color code growth
      const growthCell = sheet.getCell(`C${currentRow}`);
      if (trend.growth > 0) {
        growthCell.font = { bold: true, color: { argb: this.colors.success } };
      } else if (trend.growth < 0) {
        growthCell.font = { bold: true, color: { argb: this.colors.danger } };
      }

      currentRow++;
    });

    // Performance Metrics
    currentRow += 2;
    this.addSectionHeader(sheet, currentRow, 'PERFORMANCE METRICS', 'A', 'E');
    currentRow++;

    const metrics = this.calculatePerformanceMetrics(data);
    const performanceData = [
      ['Average Submission Time', metrics.avgSubmissionTime],
      ['Form Completion Rate', `${metrics.completionRate}%`],
      ['Member Engagement Score', metrics.engagementScore],
      ['Data Quality Index', `${metrics.dataQuality}%`],
      ['Response Time (Days)', metrics.avgResponseTime]
    ];

    performanceData.forEach(([metric, value], index) => {
      const row = sheet.getRow(currentRow);
      sheet.mergeCells(`A${currentRow}:D${currentRow}`);
      sheet.getCell(`A${currentRow}`).value = metric;
      sheet.getCell(`A${currentRow}`).font = { bold: true };
      
      sheet.getCell(`E${currentRow}`).value = value;
      sheet.getCell(`E${currentRow}`).font = { bold: true, size: 14 };
      sheet.getCell(`E${currentRow}`).fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: this.colors.primary } 
      };
      sheet.getCell(`E${currentRow}`).font.color = { argb: this.colors.white };
      sheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center' };

      currentRow++;
    });

    // Set column widths
    sheet.columns = [
      { width: 25 }, { width: 15 }, { width: 12 }, 
      { width: 12 }, { width: 15 }
    ];
  }

  // Helper methods
  private addSectionHeader(
    sheet: ExcelJS.Worksheet, 
    row: number, 
    title: string, 
    startCol: string = 'A', 
    endCol: string = 'A'
  ): void {
    sheet.mergeCells(`${startCol}${row}:${endCol}${row}`);
    const cell = sheet.getCell(`${startCol}${row}`);
    cell.value = title;
    cell.font = { bold: true, size: 14, color: { argb: this.colors.white } };
    cell.fill = { 
      type: 'pattern', 
      pattern: 'solid', 
      fgColor: { argb: this.colors.primary } 
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
       sheet.getRow(row).height = 30;
  }

  private addBordersToRange(
    sheet: ExcelJS.Worksheet, 
    startRow: number, 
    endRow: number, 
    startCol: number, 
    endCol: number
  ): void {
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cell = sheet.getCell(row, col);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }
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
      case 'submitted_at':
      case 'created_at':
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

      default:
        return value;
    }
  }

  private sanitizeSheetName(name: string): string {
    let sheetName = name;
    if (sheetName.length > 31) {
      sheetName = sheetName.substring(0, 28) + '...';
    }
    return sheetName.replace(/[:\/?*\[\]]/g, '_');
  }

  private calculateMetrics(data: any[]): any {
    const uniqueMembers = new Set(data.map(item => item.member_company).filter(Boolean)).size;
    const uniqueSites = new Set(data.map(item => item.site_name).filter(Boolean)).size;
    const formTypes = [...new Set(data.map(item => item.form_type_name).filter(Boolean))];
    
    const formTypeBreakdown = formTypes.map(formType => {
      const formData = data.filter(item => item.form_type_name === formType);
      return {
        formType,
        total: formData.length,
        uniqueMembers: new Set(formData.map(item => item.member_company).filter(Boolean)).size,
        uniqueSites: new Set(formData.map(item => item.site_name).filter(Boolean)).size,
        pending: formData.filter(item => item.admin_status === 'PENDING').length,
        approved: formData.filter(item => item.admin_status === 'APPROVED').length
      };
    });

    const completedSubmissions = data.filter(item => 
      item.status === 'COMPLETED' || item.admin_status === 'APPROVED'
    ).length;

    return {
      totalSubmissions: data.length,
      uniqueMembers,
      uniqueSites,
      formTypes,
      completionRate: Math.round((completedSubmissions / data.length) * 100),
      avgSubmissionsPerMember: uniqueMembers > 0 ? data.length / uniqueMembers : 0,
      formTypeBreakdown
    };
  }

  private calculateStatusBreakdown(data: any[]): any[] {
    const statusCounts: { [key: string]: number } = {};
    
    data.forEach(item => {
      const status = item.admin_status || item.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const total = data.length;
    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / total) * 100),
      trend: count > total / Object.keys(statusCounts).length ? '↑' : '↓'
    })).sort((a, b) => b.count - a.count);
  }

  private calculateMonthlyTrends(data: any[]): any[] {
    const monthlyData: { [key: string]: { submissions: number; members: Set<string>; sites: Set<string> } } = {};
    
    data.forEach(item => {
      const date = new Date(item.submitted_at || item.created_at);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          submissions: 0,
          members: new Set(),
          sites: new Set()
        };
      }
      
      monthlyData[monthKey].submissions++;
      if (item.member_company) monthlyData[monthKey].members.add(item.member_company);
      if (item.site_name) monthlyData[monthKey].sites.add(item.site_name);
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    return sortedMonths.map((monthKey, index) => {
      const data = monthlyData[monthKey];
      const previousMonth = index > 0 ? monthlyData[sortedMonths[index - 1]] : null;
      const growth = previousMonth ? 
        Math.round(((data.submissions - previousMonth.submissions) / previousMonth.submissions) * 100) : 0;

      return {
        month: new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        submissions: data.submissions,
        growth,
        members: data.members.size,
        sites: data.sites.size
      };
    }).slice(-12); // Last 12 months
  }

  private calculatePerformanceMetrics(data: any[]): any {
    // Calculate average time between created_at and submitted_at
    const submissionTimes = data
      .filter(item => item.created_at && item.submitted_at)
      .map(item => {
        const created = new Date(item.created_at);
        const submitted = new Date(item.submitted_at);
        return (submitted.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
      });

    const avgSubmissionTime = submissionTimes.length > 0 
      ? (submissionTimes.reduce((a, b) => a + b, 0) / submissionTimes.length).toFixed(1) + ' hours'
      : 'N/A';

    // Calculate completion rate (approved vs total)
    const approvedCount = data.filter(item => item.admin_status === 'APPROVED').length;
    const completionRate = Math.round((approvedCount / data.length) * 100);

    // Engagement score based on submissions per member
    const memberSubmissions: { [key: string]: number } = {};
    data.forEach(item => {
      if (item.member_company) {
        memberSubmissions[item.member_company] = (memberSubmissions[item.member_company] || 0) + 1;
      }
    });
    
    const avgSubmissionsPerMember = Object.values(memberSubmissions).reduce((a, b) => a + b, 0) / Object.keys(memberSubmissions).length;
    const engagementScore = Math.min(100, Math.round(avgSubmissionsPerMember * 10));

    // Data quality index (percentage of submissions with all required fields)
    const totalFields = data.length * Object.keys(data[0] || {}).length;
    const populatedFields = data.reduce((total, item) => {
      return total + Object.values(item).filter(value => 
        value !== null && value !== undefined && value !== ''
      ).length;
    }, 0);
    
    const dataQuality = Math.round((populatedFields / totalFields) * 100);

    return {
      avgSubmissionTime,
      completionRate,
      engagementScore,
      dataQuality,
      avgResponseTime: '2.5' // This could be calculated from review times
    };
  }

  private buildColumnStructure(data: any[]): any[] {
    // Extract unique fields from data (excluding metadata fields)
    const metadataFields = new Set([
      'id', 'form_id', 'submitted_by', 'minigrid_siteId', 'country',
      'submitted_at', 'status', 'admin_status', 'admin_comment',
      'reviewed_by', 'reviewed_at', 'created_at', 'updated_at',
      'form_title', 'form_slug', 'form_type_name', 'form_year',
      'member_company', 'member_email', 'member_id_code',
      'site_name', 'site_id_code', 'site_country', 'site_region'
    ]);

    const allFields = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (!metadataFields.has(key)) {
          allFields.add(key);
        }
      });
    });

    // Group fields by common prefixes for categories
    const fieldCategories = this.groupFieldsByCategory(Array.from(allFields));

    const columnStructure: any[] = [];
    let categoryIndex = 0;

    fieldCategories.forEach((fields, category) => {
      fields.forEach(field => {
        columnStructure.push({
          category: category,
          kpi: this.formatFieldName(field),
          description: '',
          unit: this.inferUnit(field),
          type: this.inferFieldType(data, field),
          key: field,
          categoryIndex: categoryIndex
        });
      });
      categoryIndex++;
    });

    return columnStructure;
  }

  private groupFieldsByCategory(fields: string[]): Map<string, string[]> {
    const categories = new Map<string, string[]>();
    
    // Common category patterns
    const categoryPatterns = [
      { pattern: /(capacity|power|energy|kw|kwh)/i, name: 'Capacity & Energy' },
      { pattern: /(customer|client|user|consumer)/i, name: 'Customer Data' },
      { pattern: /(financial|revenue|cost|tariff|price)/i, name: 'Financial' },
      { pattern: /(technical|equipment|system|hardware)/i, name: 'Technical' },
      { pattern: /(environmental|co2|emission|sustainability)/i, name: 'Environmental' },
      { pattern: /(operational|maintenance|performance)/i, name: 'Operations' }
    ];

    fields.forEach(field => {
      let category = 'General';
      
      for (const { pattern, name } of categoryPatterns) {
        if (pattern.test(field)) {
          category = name;
          break;
        }
      }

      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(field);
    });

    return categories;
  }

  private formatFieldName(field: string): string {
    return field
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  private inferUnit(field: string): string {
    if (field.includes('capacity') || field.includes('power')) return 'kW';
    if (field.includes('energy')) return 'kWh';
    if (field.includes('currency') || field.includes('revenue') || field.includes('cost')) return '$';
    if (field.includes('percentage') || field.includes('rate')) return '%';
    if (field.includes('temperature')) return '°C';
    return '';
  }

  private inferFieldType(data: any[], field: string): string {
    const sampleValue = data[0]?.[field];
    if (sampleValue === null || sampleValue === undefined) return 'text';

    if (typeof sampleValue === 'number') return 'number';
    if (typeof sampleValue === 'boolean') return 'boolean';
    if (Array.isArray(sampleValue)) return 'multiselect';
    if (this.isDateString(sampleValue)) return 'date';
    if (this.isEmail(sampleValue)) return 'email';
    if (this.isCurrency(sampleValue)) return 'currency';
    
    return 'text';
  }

  private isDateString(value: any): boolean {
    if (typeof value !== 'string') return false;
    return !isNaN(Date.parse(value));
  }

  private isEmail(value: any): boolean {
    if (typeof value !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isCurrency(value: any): boolean {
    if (typeof value === 'number') return true;
    if (typeof value !== 'string') return false;
    return /^\$?\d+(\.\d{2})?$/.test(value);
  }

  private groupByFormType(data: any[]): Map<string, any[]> {
    const groups = new Map();
    data.forEach(item => {
      const formType = item.form_type_name || 'Unknown Form';
      if (!groups.has(formType)) {
        groups.set(formType, []);
      }
      groups.get(formType).push(item);
    });
    return groups;
  }

  private getMemberActivityLevel(submissionCount: number): string {
    if (submissionCount >= 10) return 'High';
    if (submissionCount >= 5) return 'Medium';
    if (submissionCount >= 1) return 'Low';
    return 'Inactive';
  }

  private getSiteActivityLevel(submissionCount: number): string {
    if (submissionCount >= 8) return 'High';
    if (submissionCount >= 3) return 'Medium';
    if (submissionCount >= 1) return 'Low';
    return 'Inactive';
  }

  private getMemberStatus(submissionCount: number): string {
    if (submissionCount >= 10) return 'High Activity';
    if (submissionCount >= 5) return 'Medium Activity';
    if (submissionCount >= 1) return 'Low Activity';
    return 'Inactive';
  }

  private getExportTitle(exportType: ExportType, filters: ExportFilters): string {
    return `AMDA Export - ${this.formatExportType(exportType)} - ${filters.year || 'All Years'}`;
  }

  private formatExportType(exportType: ExportType): string {
    return exportType
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // CSV Export Method
  private async exportToCSV(data: any[], filePath: string): Promise<number> {
    const cleanedData = this.cleanExportData(data);
    const fields = Object.keys(cleanedData[0]);
    const parser = new Parser({ fields });
    const csv = parser.parse(cleanedData);
    fs.writeFileSync(filePath, csv, 'utf8');
    const stats = fs.statSync(filePath);
    return stats.size;
  }

  // JSON Export Method
  private async exportToJSON(data: any[], filePath: string): Promise<number> {
    const cleanedData = this.cleanExportData(data);
    const jsonData = JSON.stringify(cleanedData, null, 2);
    fs.writeFileSync(filePath, jsonData, 'utf8');
    const stats = fs.statSync(filePath);
    return stats.size;
  }

  private cleanExportData(data: any[]): any[] {
    return data.map(item => {
      const cleanItem: any = {};

      // Standard metadata fields
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

      // Exclude reserved fields and add custom fields
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

  private extractMemberData(data: any[]): any[] {
    const memberMap = new Map();
    
    data.forEach(item => {
      const memberCompany = item.member_company;
      const memberEmail = item.member_email;
      const memberId = item.member_id_code;
      
      if (memberCompany && !memberMap.has(memberCompany)) {
        const memberSubmissions = data.filter(d => d.member_company === memberCompany);
        
        const uniqueForms = new Set(memberSubmissions.map(s => s.form_title)).size;
        const uniqueSites = new Set(memberSubmissions.map(s => s.site_name).filter(Boolean)).size;
        
        memberMap.set(memberCompany, {
          'Member Company': memberCompany,
          'Member Email': memberEmail || 'N/A',
          'Member ID': memberId || 'N/A',
          'Total Submissions': memberSubmissions.length,
          'Unique Forms': uniqueForms,
          'Associated Sites': uniqueSites,
          'Latest Submission': memberSubmissions
            .map(s => new Date(s.submitted_at || s.created_at))
            .sort((a, b) => b.getTime() - a.getTime())[0]
            ?.toISOString().split('T')[0] || 'N/A'
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
      const siteName = item.site_name;
      const siteId = item.site_id_code;
      const siteCountry = item.site_country;
      const siteRegion = item.site_region;
      
      if (siteName && !siteMap.has(siteName)) {
        const siteSubmissions = data.filter(d => d.site_name === siteName);
        const memberCompany = siteSubmissions[0]?.member_company;
        
        const uniqueForms = new Set(siteSubmissions.map(s => s.form_title)).size;
        
        siteMap.set(siteName, {
          'Site Name': siteName,
          'Site ID': siteId || 'N/A',
          'Country': siteCountry || 'N/A',
          'Region': siteRegion || 'N/A',
          'Total Submissions': siteSubmissions.length,
          'Unique Forms': uniqueForms,
          'Member Company': memberCompany || 'N/A',
          'Latest Submission': siteSubmissions
            .map(s => new Date(s.submitted_at || s.created_at))
            .sort((a, b) => b.getTime() - a.getTime())[0]
            ?.toISOString().split('T')[0] || 'N/A'
        });
      }
    });
    
    return Array.from(siteMap.values()).sort((a, b) => 
      b['Total Submissions'] - a['Total Submissions']
    );
  }

  // Bulk Export Method
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

  // Preview Method
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

  // Summary Method
  async getExportSummary(
    exportType: ExportType,
    filters: ExportFilters
  ): Promise<ExportSummary> {
    const data = await this.fetchDataByExportType(exportType, filters);
    
    const formTypes = [...new Set(data.map(item => item.form_type_name).filter(Boolean))];
    const memberCount = new Set(data.map(item => item.member_company).filter(Boolean)).size;
    const siteCount = new Set(data.map(item => item.site_name).filter(Boolean)).size;
    
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

  // Data Fetching Method
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

  // File Management Methods
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

  // File Name Generation
  private generateFileName(
    exportType: ExportType,
    format: ExportFormat,
    filters: ExportFilters
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const typeSlug = exportType.toLowerCase().replace(/_/g, '-');
    
    let fileName = `amda-export-${typeSlug}-${timestamp}`;
    
    if (filters.year) fileName += `-year-${filters.year}`;
    if (filters.formTypeId) fileName += `-form-${filters.formTypeId.substring(0, 8)}`;
    if (filters.memberId) fileName += `-member-${filters.memberId.substring(0, 8)}`;
    if (filters.siteId) fileName += `-site-${filters.siteId.substring(0, 8)}`;
    
    return `${fileName}.${format}`;
  }
}