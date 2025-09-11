
// @ts-nocheck

import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { DataSource } from 'typeorm';
import { FormRepository } from '../../../database/repositories/forms/form.repository';
import { FormService } from './form.service';

export interface ReportConfig {
  includeCharts: boolean;
  includeRawData: boolean;
  includeAnalytics: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  filters?: Record<string, any>;
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  customTitle?: string;
  customDescription?: string;
  sections?: string[];
  customFields?: any[];
  template?: string;
}

interface ReportData {
  form: any;
  submissions: any[];
  analytics: any;
  summary: {
    totalSubmissions: number;
    completionRate: number;
    averageTime: number;
    statusBreakdown: Record<string, number>;
    submissionTrend: Array<{ date: string; count: number }>;
    responseRates: Record<string, number>;
  };
  fieldAnalysis: Array<{
    fieldName: string;
    fieldLabel: string;
    fieldType: string;
    responseCount: number;
    responseRate: number;
    uniqueValues?: number;
    mostCommon?: string;
    statistics?: {
      mean?: number;
      median?: number;
      mode?: string;
      min?: number;
      max?: number;
      count?: number;
    };
    optionBreakdown?: Record<string, number>;
    dateRange?: {
      earliest: Date;
      latest: Date;
    };
    averageRating?: number;
  }>;
}

interface ScheduledReportConfig {
  schedule: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  config: ReportConfig;
  name: string;
  createdBy: string;
}

interface ReportHistoryQuery {
  page: number;
  limit: number;
}

interface ReportHistoryItem {
  id: string;
  formId: string;
  generatedAt: Date;
  generatedBy: string;
  filename: string;
  config: ReportConfig;
  size: number;
  type: 'pdf' | 'csv' | 'excel';
}

interface ScheduledReport {
  id: string;
  formId: string;
  name: string;
  schedule: string;
  recipients: string[];
  config: ReportConfig;
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
  createdBy: string;
  createdAt: Date;
}

export class ReportService {
  private formService: FormService;
  private scheduledReports: Map<string, ScheduledReport> = new Map();
  private reportHistory: Map<string, ReportHistoryItem> = new Map();
private repo: FormRepository;
  constructor(private readonly dataSource: DataSource) {
    this.formService = new FormService(new FormRepository(dataSource));
    this.repo = new FormRepository(dataSource)
  }

  /**
   * Generate a comprehensive form report
   */
  async generateFormReport(
    formId: string,
    config: ReportConfig = {
      includeCharts: true,
      includeRawData: true,
      includeAnalytics: true,
    }
  ): Promise<Buffer> {
    try {
      // 1. Gather all report data
      const reportData = await this.gatherReportData(formId, config);

      // 2. Generate PDF
      const pdfBuffer = await this.generatePDFReport(reportData, config);

      // 3. Save to history (in real implementation)
      await this.saveReportToHistory(formId, pdfBuffer, config, 'system');

      return pdfBuffer;
    } catch (error) {
      console.error('Error generating form report:', error);
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Gather comprehensive report data from dynamic form submissions
   */
  private async gatherReportData(formId: string, config: ReportConfig): Promise<ReportData> {
    // Get form structure
    const form = await this.formService.findById(formId);
    // const submissions = await this.repo.getFormSubmissions(formId);

    if (!form) {
      throw new Error('Form not found');
    }

    // Get submissions based on filters
    const submissions = await this.getFilteredSubmissions(formId, config);

    // Get analytics if requested
    let analytics = {};
    if (config.includeAnalytics) {
      analytics = await this.formService.getFormAnalytics(formId);
    }

    // Calculate comprehensive summary statistics
    const summary = await this.calculateComprehensiveSummary(submissions, form);

    // Analyze each field in depth
    const fieldAnalysis = await this.analyzeFormFields(submissions, form);

    return {
      form,
      submissions,
      analytics,
      summary,
      fieldAnalysis,
    };
  }

  /**
   * Get filtered submissions based on configuration
   */
  private async getFilteredSubmissions(formId: string, config: ReportConfig): Promise<any[]> {
    let filters: Record<string, any> = {};

    // Apply date range filter
    if (config.dateRange) {
      filters.created_at = {
        $gte: config.dateRange.startDate,
        $lte: config.dateRange.endDate,
      };
    }

    // Apply custom filters
    if (config.filters) {
      filters = { ...filters, ...config.filters };
    }

    // Get submissions with sorting
    const result = await this.formService.getFormSubmissions(
      formId,
      filters,
      { 
        page: 1, 
        limit: 10000,
        sortBy: config.sortBy || 'created_at',
        sortOrder: config.sortOrder || 'DESC'
      },
      true
    );

    console.log(formId, 'and ', result, "form subsss")

    return result || [];
  }

  /**
   * Calculate comprehensive summary statistics
   */
  private async calculateComprehensiveSummary(submissions: any[], form: any) {
    const totalSubmissions = submissions.length;

    console.log(submissions, 'From Comprehensive')
    const completedSubmissions = submissions.filter(s => s.status === 'SUBMITTED').length;
    const completionRate = totalSubmissions > 0 ? (completedSubmissions / totalSubmissions) * 100 : 0;

    // Calculate average completion time if available
    const submissionsWithTime = submissions.filter(s => s.completionTime && s.completionTime > 0);
    const averageTime = submissionsWithTime.length > 0
      ? submissionsWithTime.reduce((sum, s) => sum + s.completionTime, 0) / submissionsWithTime.length
      : 0;

    // Status breakdown
    const statusBreakdown = submissions.reduce((acc, submission) => {
      const status = submission.status || 'PENDING';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Submission trend over time
    const submissionTrend = this.calculateSubmissionTrend(submissions);

    // Response rates for each field
    const responseRates = this.calculateFieldResponseRates(submissions, form);

    return {
      totalSubmissions,
      completionRate,
      averageTime,
      statusBreakdown,
      submissionTrend,
      responseRates,
    };
  }

  /**
   * Calculate submission trend over time
   */
  private calculateSubmissionTrend(submissions: any[]): Array<{ date: string; count: number }> {
    const grouped = submissions.reduce((acc, submission) => {
      const date = new Date(submission.createdAt).toDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Calculate response rates for each field
   */
  private calculateFieldResponseRates(submissions: any[], form: any): Record<string, number> {
    const responseRates: Record<string, number> = {};
    
    // Get all form fields
    const allFields = this.extractAllFormFields(form);
    
    allFields.forEach(field => {
      const responseCount = submissions.filter(s => {
        const value = s.data?.[field.name];
        return value !== null && value !== undefined && value !== '';
      }).length;
      
      responseRates[field.name] = submissions.length > 0 ? 
        (responseCount / submissions.length) * 100 : 0;
    });

    return responseRates;
  }

  /**
   * Extract all fields from form structure
   */
  private extractAllFormFields(form: any): any[] {
    const allFields: any[] = [];
    
    for (const category of form.categories || []) {

      for (const question of category.questions || []) {
        allFields.push({
          name: question.kpi,
          label: question.options.placeholder,
          type: question.type,
          required: question.isRequired,
          options: question.options,
          categoryName: category.name,
        });
      }
    }

    return allFields;
  }

  /**
   * Comprehensive field analysis
   */
  private async analyzeFormFields(submissions: any[], form: any) {
    const fieldAnalysis: any[] = [];
    const allFields = this.extractAllFormFields(form);

    for (const field of allFields) {
      const fieldData = submissions
        .map(s => s?.[field.name])
        .filter(value => value !== null && value !== undefined && value !== '');

        // console.log(allFields, field, ":tjd")
      const analysis: any = {
        fieldName: field.name,
        fieldLabel: field.label,
        fieldType: field.type,
        responseCount: fieldData.length,
        responseRate: submissions.length > 0 ? (fieldData.length / submissions.length) * 100 : 0,
        categoryName: field.categoryName,
      };

      if (fieldData.length > 0) {
        analysis.uniqueValues = new Set(fieldData.map(v => String(v))).size;

        // Type-specific analysis
        switch (field.type) {
          case 'text':
          case 'textarea':
          case 'email':
          case 'url':
            analysis.mostCommon = this.getMostCommonValue(fieldData);
            analysis.averageLength = this.calculateAverageLength(fieldData);
            analysis.wordFrequency = this.getWordFrequency(fieldData);
            break;

          case 'select':
          case 'radio':
            analysis.mostCommon = this.getMostCommonValue(fieldData);
            analysis.optionBreakdown = this.getOptionBreakdown(fieldData);
            break;

          case 'number':
            analysis.statistics = this.calculateNumericStats(fieldData);
            break;

          case 'date':
          case 'datetime':
            analysis.dateRange = this.getDateRange(fieldData);
            analysis.dateDistribution = this.getDateDistribution(fieldData);
            break;

          case 'multiselect':
          case 'checkbox':
            analysis.optionBreakdown = this.analyzeMultiSelectField(fieldData);
            analysis.averageSelections = this.calculateAverageSelections(fieldData);
            break;

          case 'rating':
          case 'scale':
            analysis.statistics = this.calculateNumericStats(fieldData);
            analysis.averageRating = fieldData.reduce((sum, val) => sum + Number(val), 0) / fieldData.length;
            analysis.ratingDistribution = this.getRatingDistribution(fieldData);
            break;

          case 'boolean':
          case 'yesno':
            analysis.optionBreakdown = this.getBooleanBreakdown(fieldData);
            break;

          case 'file':
            analysis.fileStats = this.analyzeFileField(fieldData);
            break;
        }
      }

      fieldAnalysis.push(analysis);
    }

    return fieldAnalysis;
  }

  /**
   * Helper methods for field analysis
   */
  private getMostCommonValue(data: any[]): string {
    const frequency = data.reduce((acc, value) => {
      const key = String(value);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
  }

  private calculateAverageLength(data: any[]): number {
    const lengths = data.map(d => String(d).length);
    return lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
  }

  private getWordFrequency(data: any[]): Record<string, number> {
    const words = data
      .join(' ')
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);

    const frequency = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Return top 10 most frequent words
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((acc, [word, count]) => {
        acc[word] = count;
        return acc;
      }, {} as Record<string, number>);
  }

  private getOptionBreakdown(data: any[]): Record<string, number> {
    return data.reduce((acc, value) => {
      const key = String(value);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateNumericStats(data: any[]) {
    const numericData = data.map(Number).filter(n => !isNaN(n));
    if (numericData.length === 0) return null;

    const sorted = numericData.sort((a, b) => a - b);
    const sum = numericData.reduce((a, b) => a + b, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: sum / numericData.length,
      median: sorted[Math.floor(sorted.length / 2)],
      count: numericData.length,
      standardDeviation: this.calculateStandardDeviation(numericData),
    };
  }

  private calculateStandardDeviation(data: number[]): number {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  private getDateRange(data: any[]) {
    const dates = data.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
    if (dates.length === 0) return null;

    return {
      earliest: new Date(Math.min(...dates.map(d => d.getTime()))),
      latest: new Date(Math.max(...dates.map(d => d.getTime()))),
    };
  }

  private getDateDistribution(data: any[]): Record<string, number> {
    const dates = data.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
    const monthCounts = dates.reduce((acc, date) => {
      const month = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return monthCounts;
  }

  private analyzeMultiSelectField(data: any[]) {
    const allOptions: string[] = [];
    
    data.forEach(value => {
      if (Array.isArray(value)) {
        allOptions.push(...value.map(v => String(v)));
      } else if (typeof value === 'string') {
        allOptions.push(...value.split(',').map(v => v.trim()));
      }
    });

    const frequency = allOptions.reduce((acc, option) => {
      acc[option] = (acc[option] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .reduce((acc, [option, count]) => {
        acc[option] = count;
        return acc;
      }, {} as Record<string, number>);
  }

  private calculateAverageSelections(data: any[]): number {
    const selectionCounts = data.map(value => {
      if (Array.isArray(value)) {
        return value.length;
      } else if (typeof value === 'string') {
        return value.split(',').length;
      }
      return 1;
    });

    return selectionCounts.reduce((sum, count) => sum + count, 0) / selectionCounts.length;
  }

  private getRatingDistribution(data: any[]): Record<string, number> {
    return data.reduce((acc, rating) => {
      const key = String(rating);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getBooleanBreakdown(data: any[]): Record<string, number> {
    return data.reduce((acc, value) => {
      const key = value === true || value === 'true' || value === 'yes' || value === '1' ? 'Yes' : 'No';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private analyzeFileField(data: any[]): any {
    const files = data.filter(d => d && typeof d === 'object');
    
    return {
      totalFiles: files.length,
      fileTypes: this.getFileTypeDistribution(files),
      averageSize: this.calculateAverageFileSize(files),
    };
  }

  private getFileTypeDistribution(files: any[]): Record<string, number> {
    return files.reduce((acc, file) => {
      const extension = file.filename ? file.filename.split('.').pop()?.toLowerCase() : 'unknown';
      acc[extension] = (acc[extension] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAverageFileSize(files: any[]): number {
    const sizes = files.map(f => f.size || 0);
    return sizes.length > 0 ? sizes.reduce((sum, size) => sum + size, 0) / sizes.length : 0;
  }

  /**
   * Generate PDF report
   */
  private async generatePDFReport(reportData: ReportData, config: ReportConfig): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `${reportData.form.title} - Analytics Report`,
          Author: 'Form Analytics System',
          Subject: 'Form Submission Report',
          Creator: 'Dynamic Forms System',
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        this.buildPDFContent(doc, reportData, config);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Build comprehensive PDF content
   */
  private buildPDFContent(doc: PDFDocument, reportData: ReportData, config: ReportConfig) {
    let yPos = 20;
    const pageHeight = 750; // A4 height in points minus margins
    const pageWidth = 545; // A4 width in points minus margins
    const margin = 50;

    // Helper function to check if we need a new page
    const checkNewPage = (neededHeight: number = 50) => {
      if (yPos + neededHeight > pageHeight) {
        doc.addPage();
        yPos = margin;
      }
    };

    // 1. Header and title
    doc.fontSize(24)
       .fillColor('#2c3e50')
       .text('Form Analytics Report', margin, yPos);
    yPos += 40;

    doc.fontSize(16)
       .fillColor('#34495e')
       .text(config.customTitle || reportData.form.title, margin, yPos);
    yPos += 25;

    doc.fontSize(12)
       .fillColor('#7f8c8d')
       .text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 30;

    // Add line separator
    doc.strokeColor('#ecf0f1')
       .lineWidth(1)
       .moveTo(margin, yPos)
       .lineTo(pageWidth, yPos)
       .stroke();
    yPos += 30;

    // 2. Executive Summary
    checkNewPage(100);
    doc.fontSize(18)
       .fillColor('#2c3e50')
       .text('Executive Summary', margin, yPos);
    yPos += 30;

    // Summary metrics in a grid-like format
    const summaryItems = [
      { label: 'Total Submissions', value: reportData.summary.totalSubmissions.toString() },
      { label: 'Completion Rate', value: `${reportData.summary.completionRate.toFixed(1)}%` },
      { label: 'Average Time', value: `${Math.round(reportData.summary.averageTime / 60)}min` },
    ];

    summaryItems.forEach((item, index) => {
      const xPos = margin + (index * 180);
      
      // Draw card background
      doc.rect(xPos, yPos, 160, 60)
         .fillColor('#f8f9fa')
         .fill();
      
      // Add border
      doc.rect(xPos, yPos, 160, 5)
         .fillColor('#3498db')
         .fill();
      
      // Add text
      doc.fontSize(16)
         .fillColor('#2c3e50')
         .text(item.value, xPos + 10, yPos + 15);
      
      doc.fontSize(10)
         .fillColor('#7f8c8d')
         .text(item.label, xPos + 10, yPos + 35);
    });

    yPos += 80;

    // 3. Form Overview
    checkNewPage(80);
    doc.fontSize(16)
       .fillColor('#2c3e50')
       .text('Form Overview', margin, yPos);
    yPos += 25;

    const details = [
      ['Form Type', reportData.form.formType],
      ['Status', reportData.form.status],
      ['Created', new Date(reportData.form.createdAt).toLocaleDateString()],
      ['Categories', reportData.form.categories?.length || 0],
      ['Total Questions', reportData.form.categories?.reduce((sum: number, cat: any) => sum + (cat.questions?.length || 0), 0) || 0],
    ];

    details.forEach(([label, value]) => {
      doc.fontSize(11)
         .fillColor('#2c3e50')
         .text(`${label}: `, margin + 20, yPos);
      doc.fillColor('#7f8c8d')
         .text(value.toString(), margin + 120, yPos);
      yPos += 18;
    });

    yPos += 20;

    // 4. Field Analysis
    if (config.includeAnalytics && reportData.fieldAnalysis.length > 0) {
      checkNewPage(100);
      doc.fontSize(16)
         .fillColor('#2c3e50')
         .text('Field Analysis', margin, yPos);
      yPos += 25;

      // Group fields by category
      const fieldsByCategory = reportData.fieldAnalysis.reduce((acc, field) => {
        const category = field.categoryName || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(field);
        return acc;
      }, {} as Record<string, any[]>);

      Object.entries(fieldsByCategory).forEach(([category, fields]) => {
        checkNewPage(60);
        doc.fontSize(14)
           .fillColor('#34495e')
           .text(`Category: ${category}`, margin, yPos);
        yPos += 20;

        fields.slice(0, 10).forEach(field => { // Limit to first 10 fields per category
          checkNewPage(50);
          
          doc.fontSize(12)
             .fillColor('#34495e');
          const fieldName = field.fieldLabel || field.fieldName;
          doc.text(fieldName.substring(0, 40), margin + 20, yPos); // Truncate long names
          yPos += 15;

          doc.fontSize(9)
             .fillColor('#7f8c8d')
             .text(`Type: ${field.fieldType} | Response Rate: ${field.responseRate.toFixed(1)}% | Responses: ${field.responseCount}`, margin + 20, yPos);
          yPos += 12;

          // Progress bar simulation
          const barWidth = 200;
          const barHeight = 6;
          const fillWidth = (field.responseRate / 100) * barWidth;
          
          doc.rect(margin + 20, yPos, barWidth, barHeight)
             .fillColor('#ecf0f1')
             .fill();
          
          const barColor = field.responseRate > 70 ? '#2ecc71' : 
                          field.responseRate > 40 ? '#f1c40f' : '#e74c3c';
          doc.rect(margin + 20, yPos, fillWidth, barHeight)
             .fillColor(barColor)
             .fill();
          
          yPos += 15;

          // Field-specific details
          if (field.statistics) {
            const stats = field.statistics;
            doc.fontSize(8)
               .fillColor('#2c3e50')
               .text(`Stats: Min: ${stats.min} | Max: ${stats.max} | Average: ${stats.mean.toFixed(2)}`, margin + 20, yPos);
            yPos += 12;
          }

          if (field.mostCommon) {
            doc.fontSize(8)
               .fillColor('#2c3e50')
               .text(`Most Common: ${field.mostCommon.substring(0, 30)}`, margin + 20, yPos);
            yPos += 12;
          }

          yPos += 10; // Space between fields
        });

        yPos += 15; // Space between categories
      });
    }

    // 5. Trends and Insights
    checkNewPage(80);
    doc.fontSize(16)
       .fillColor('#2c3e50')
       .text('Trends and Insights', margin, yPos);
    yPos += 25;

    // const insights = this.generateInsights(reportData);
    // insights.slice(0, 5).forEach((insight, index) => { // Limit to first 5 insights
    //   checkNewPage(60);
      
    //   doc.fontSize(12)
    //      .fillColor('#2c3e50')
    //      .text(`${index + 1}. ${insight.title}`, margin + 20, yPos);
    //   yPos += 18;

    //   doc.fontSize(9)
    //      .fillColor('#7f8c8d');
    //   const description = insight.description.substring(0, 120) + (insight.description.length > 120 ? '...' : '');
    //   const lines = doc.widthOfString(description) > 450 ? 
    //     this.wrapText(description, 450, doc) : [description];
    //   lines.forEach(line => {
    //     doc.text(line, margin + 30, yPos);
    //     yPos += 12;
    //   });

    //   if (insight.impact) {
    //     doc.fontSize(8)
    //        .fillColor('#e74c3c')
    //        .text(`Impact: ${insight.impact}`, margin + 30, yPos);
    //     yPos += 12;
    //   }

    //   yPos += 15;
    // });

    // 6. Recommendations
    // checkNewPage(80);
    // doc.fontSize(16)
    //    .fillColor('#2c3e50')
    //    .text('Recommendations', margin, yPos);
    // yPos += 25;

    // const recommendations = this.generateRecommendations(reportData);
    // recommendations.slice(0, 5).forEach((recommendation, index) => {
    //   checkNewPage(50);
      
    //   doc.fontSize(12)
    //      .fillColor('#2c3e50')
    //      .text(`${index + 1}. ${recommendation.title}`, margin + 20, yPos);
    //   yPos += 18;

    //   doc.fontSize(9)
    //      .fillColor('#7f8c8d');
    //   const description = recommendation.description.substring(0, 120) + (recommendation.description.length > 120 ? '...' : '');
    //   const lines = doc.widthOfString(description) > 450 ? 
    //     this.wrapText(description, 450, doc) : [description];
    //   lines.forEach(line => {
    //     doc.text(line, margin + 30, yPos);
    //     yPos += 12;
    //   });
    //   yPos += 15;
    // });

    // 7. Footer with metadata
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.fontSize(8)
         .fillColor('#7f8c8d')
         .text(`Page ${i + 1} of ${totalPages}`, pageWidth - 50, pageHeight + 20);
      doc.text(`Generated by Dynamic Forms System`, margin, pageHeight + 20);
    }
  }

  // Helper method for text wrapping
  private wrapText(text: string, maxWidth: number, doc: PDFDocument): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      if (doc.widthOfString(testLine) > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
  private generateRecommendations(reportData: ReportData): Array<{title: string, description: string}> {
    const recommendations: Array<{title: string, description: string}> = [];

    // Low completion rate recommendations
    if (reportData.summary.completionRate < 50) {
      recommendations.push({
        title: 'Simplify Form Structure',
        description: 'Consider reducing the number of required fields and breaking the form into multiple steps to improve completion rates.'
      });
    }

    // Field response rate recommendations
    const lowResponseFields = reportData.fieldAnalysis.filter(field => field.responseRate < 60);
    if (lowResponseFields.length > 0) {
      recommendations.push({
        title: 'Optimize Low-Response Fields',
        description: `Review and optimize ${lowResponseFields.length} fields with low response rates. Consider making them optional or providing better instructions.`
      });
    }

    // Field type recommendations
    const textFields = reportData.fieldAnalysis.filter(f => f.fieldType === 'textarea' && f.averageLength && f.averageLength < 50);
    if (textFields.length > 0) {
      recommendations.push({
        title: 'Consider Alternative Input Types',
        description: 'Some textarea fields have very short responses. Consider using select or radio buttons for these fields.'
      });
    }

    // Data quality recommendations
    const numericFields = reportData.fieldAnalysis.filter(f => f.fieldType === 'number' && f.statistics);
    const fieldsWithOutliers = numericFields.filter(f => 
      f.statistics && f.statistics.standardDeviation && f.statistics.standardDeviation > f.statistics.mean * 2
    );
    
    if (fieldsWithOutliers.length > 0) {
      recommendations.push({
        title: 'Add Input Validation',
        description: 'Some numeric fields show high variance suggesting possible data entry errors. Consider adding validation rules.'
      });
    }

    // User experience recommendations
    if (reportData.summary.averageTime > 600) { // 10 minutes
      recommendations.push({
        title: 'Optimize Form Length',
        description: 'The average completion time is quite high. Consider breaking the form into smaller sections or removing non-essential fields.'
      });
    }

    return recommendations;
  }

  private addAppendix(doc: PDFDocument, reportData: ReportData, config: ReportConfig) {
    doc.addPage();
    doc.fontSize(18)
       .fillColor('#2c3e50')
       .text('Appendix', 50, 50);
    
    let yPos = 90;

    // Technical details
    doc.fontSize(14)
       .fillColor('#34495e')
       .text('Technical Information', 50, yPos);
    yPos += 25;
    
    const technicalDetails = [
      ['Report Generated', new Date().toISOString()],
      ['Form ID', reportData.form.id],
      ['Total Fields Analyzed', reportData.fieldAnalysis.length.toString()],
      ['Total Submissions Analyzed', reportData.submissions.length.toString()],
      ['Date Range', config.dateRange ? `${config.dateRange.startDate.toDateString()} to ${config.dateRange.endDate.toDateString()}` : 'All time'],
    ];

    technicalDetails.forEach(([label, value]) => {
      doc.fontSize(10)
         .fillColor('#7f8c8d')
         .text(`${label}: ${value}`, 70, yPos);
      yPos += 15;
    });

    yPos += 30;

    // Configuration used
    doc.fontSize(14)
       .fillColor('#34495e')
       .text('Report Configuration', 50, yPos);
    yPos += 25;
    
    const configDetails = [
      ['Include Charts', config.includeCharts ? 'Yes' : 'No'],
      ['Include Raw Data', config.includeRawData ? 'Yes' : 'No'],
      ['Include Analytics', config.includeAnalytics ? 'Yes' : 'No'],
    ];

    configDetails.forEach(([label, value]) => {
      doc.fontSize(10)
         .fillColor('#7f8c8d')
         .text(`${label}: ${value}`, 70, yPos);
      yPos += 15;
    });
    
    if (config.filters) {
      doc.fontSize(10)
         .fillColor('#7f8c8d')
         .text(`Filters Applied: ${Object.keys(config.filters).join(', ')}`, 70, yPos);
    }
  }

  /**
   * Generate custom report with specific configuration
   */
  async generateCustomReport(formId: string, config: any): Promise<Buffer> {
    const customConfig: ReportConfig = {
      includeCharts: config.includeCharts,
      includeRawData: config.includeRawData,
      includeAnalytics: config.includeAnalytics,
      dateRange: config.dateRange,
      filters: config.filters,
      groupBy: config.groupBy,
      sortBy: config.sortBy,
      sortOrder: config.sortOrder,
      customTitle: config.customTitle,
      customDescription: config.customDescription,
      sections: config.sections,
      customFields: config.customFields,
      template: config.template,
    };

    const reportData = await this.gatherReportData(formId, customConfig);
    return this.generatePDFReport(reportData, customConfig);
  }

  /**
   * Get report preview data without generating full PDF
   */
  async getReportPreview(formId: string, config: ReportConfig): Promise<any> {
    const reportData = await this.gatherReportData(formId, config);

    return {
      form: {
        id: reportData.form.id,
        title: reportData.form.title,
        formType: reportData.form.formType,
        status: reportData.form.status,
      },
      summary: reportData.summary,
      fieldAnalysis: reportData.fieldAnalysis.map(field => ({
        fieldName: field.fieldName,
        fieldLabel: field.fieldLabel,
        fieldType: field.fieldType,
        categoryName:field.categoryName,
        responseCount: field.responseCount,
        responseRate: field.responseRate,
        statistics: field.statistics,
        mostCommon: field.mostCommon,
      })),
      chartData: this.generateChartData(reportData),
      estimatedPdfPages: this.estimatePdfPages(reportData, config),
      // insights: this.generateInsights(reportData),
    };
  }

  /**
   * Schedule a report for regular generation
   */
  async scheduleReport(formId: string, scheduleConfig: ScheduledReportConfig): Promise<ScheduledReport> {
    const scheduledReport: ScheduledReport = {
      id: this.generateId(),
      formId,
      name: scheduleConfig.name,
      schedule: scheduleConfig.schedule,
      recipients: scheduleConfig.recipients,
      config: scheduleConfig.config,
      isActive: true,
      nextRun: this.calculateNextRun(scheduleConfig.schedule),
      createdBy: scheduleConfig.createdBy,
      createdAt: new Date(),
    };

    // Store in memory (in production, save to database)
    this.scheduledReports.set(scheduledReport.id, scheduledReport);
    
    console.log(`Report scheduled: ${scheduledReport.name} for form ${formId}`);
    return scheduledReport;
  }

  /**
   * Get all scheduled reports for a form
   */
  async getScheduledReports(formId: string): Promise<ScheduledReport[]> {
    return Array.from(this.scheduledReports.values())
      .filter(report => report.formId === formId);
  }

  /**
   * Cancel a scheduled report
   */
  async cancelScheduledReport(scheduleId: string): Promise<void> {
    const report = this.scheduledReports.get(scheduleId);
    if (report) {
      report.isActive = false;
      this.scheduledReports.set(scheduleId, report);
    }
    console.log(`Scheduled report ${scheduleId} cancelled`);
  }

  /**
   * Update a scheduled report
   */
  async updateScheduledReport(scheduleId: string, updates: Partial<ScheduledReportConfig>): Promise<ScheduledReport> {
    const report = this.scheduledReports.get(scheduleId);
    if (!report) {
      throw new Error('Scheduled report not found');
    }

    const updatedReport = {
      ...report,
      ...updates,
      nextRun: updates.schedule ? this.calculateNextRun(updates.schedule) : report.nextRun,
    };

    this.scheduledReports.set(scheduleId, updatedReport);
    return updatedReport;
  }

  /**
   * Get report generation history
   */
  async getReportHistory(formId: string, query: ReportHistoryQuery): Promise<{
    data: ReportHistoryItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const allReports = Array.from(this.reportHistory.values())
      .filter(report => report.formId === formId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

    const start = (query.page - 1) * query.limit;
    const end = start + query.limit;
    const data = allReports.slice(start, end);

    return {
      data,
      total: allReports.length,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(allReports.length / query.limit),
    };
  }

  /**
   * Get a specific report from history
   */
  async getReportFromHistory(historyId: string): Promise<{
    filename: string;
    buffer: Buffer;
  } | null> {
    const reportHistory = this.reportHistory.get(historyId);
    if (!reportHistory) return null;

    // In production, retrieve from file storage
    // For now, regenerate the report
    try {
      const buffer = await this.generateFormReport(reportHistory.formId, reportHistory.config);
      return {
        filename: reportHistory.filename,
        buffer
      };
    } catch (error) {
      console.error('Error retrieving report from history:', error);
      return null;
    }
  }

  /**
   * Export report data to Exceln
   */
  async exportReportToExcel(formId: string, config: ReportConfig): Promise<Buffer> {
    const reportData = await this.gatherReportData(formId, config);
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Form Analytics System';
    workbook.created = new Date();

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Form Report Summary']);
    summarySheet.addRow(['Form Title', reportData.form.title]);
    summarySheet.addRow(['Total Submissions', reportData.summary.totalSubmissions]);
    summarySheet.addRow(['Completion Rate', `${reportData.summary.completionRate.toFixed(1)}%`]);
    summarySheet.addRow(['Average Time', `${Math.round(reportData.summary.averageTime / 60)} minutes`]);

    // Field Analysis sheet
    const fieldSheet = workbook.addWorksheet('Field Analysis');
    fieldSheet.addRow(['Field Name', 'Field Type', 'Response Count', 'Response Rate %', 'Most Common', 'Unique Values']);
    
    reportData.fieldAnalysis.forEach(field => {
      fieldSheet.addRow([
        field.fieldName,
        field.fieldType,
        field.responseCount,
        field.responseRate.toFixed(1),
        field.mostCommon || '',
        field.uniqueValues || ''
      ]);
    });

    // Raw data sheet (if requested)
    if (config.includeRawData && reportData.submissions.length <= 1000) {
      const dataSheet = workbook.addWorksheet('Raw Data');
      
      if (reportData.submissions.length > 0) {
        const headers = ['ID', 'Status', 'Submitted By', 'Created At'];
        const allFields = this.extractAllFormFields(reportData.form);
        headers.push(...allFields.map(f => f.name));
        
        dataSheet.addRow(headers);
        
        reportData.submissions.forEach(submission => {
          const row = [
            submission.id,
            submission.status,
            submission.submittedBy || 'Anonymous',
            submission.createdAt
          ];
          
          allFields.forEach(field => {
            row.push(submission.data?.[field.name] || '');
          });
          
          dataSheet.addRow(row);
        });
      }
    }

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  // Helper methods
  private generateChartData(reportData: ReportData) {
    return {
      statusDistribution: reportData.summary.statusBreakdown,
      fieldResponseRates: reportData.fieldAnalysis.map(field => ({
        field: field.fieldName,
        rate: field.responseRate,
      })),
      submissionTrend: reportData.summary.submissionTrend,
      fieldTypeDistribution: this.getFieldTypeDistribution(reportData.fieldAnalysis),
    };
  }

  private getFieldTypeDistribution(fieldAnalysis: any[]): Record<string, number> {
    return fieldAnalysis.reduce((acc, field) => {
      acc[field.fieldType] = (acc[field.fieldType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private estimatePdfPages(reportData: ReportData, config: ReportConfig): number {
    let pages = 3; // Cover, TOC, Summary

    if (config.includeAnalytics) {
      pages += Math.ceil(reportData.fieldAnalysis.length / 8);
    }

    if (config.includeCharts) {
      pages += 2;
    }

    if (config.includeRawData && reportData.submissions.length <= 100) {
      pages += Math.ceil(reportData.submissions.length / 15);
    }

    pages += 2; // Trends and recommendations

    return pages;
  }

  private calculateNextRun(schedule: string): Date {
    const now = new Date();
    switch (schedule) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(now.getMonth() + 1);
        return nextMonth;
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async saveReportToHistory(
    formId: string,
    buffer: Buffer,
    config: ReportConfig,
    generatedBy: string,
    type: 'pdf' | 'csv' | 'excel' = 'pdf'
  ): Promise<string> {
    const historyItem: ReportHistoryItem = {
      id: this.generateId(),
      formId,
      generatedAt: new Date(),
      generatedBy,
      filename: `report_${formId}_${Date.now()}.${type}`,
      config,
      size: buffer.length,
      type,
    };

    this.reportHistory.set(historyItem.id, historyItem);
    console.log(`Report saved to history for form ${formId}`);
    return historyItem.id;
  }

  /**
   * Process scheduled reports (called by job queue)
   */
  async processScheduledReports(): Promise<void> {
    const now = new Date();
    const dueReports = Array.from(this.scheduledReports.values())
      .filter(report => report.isActive && report.nextRun <= now);

    for (const report of dueReports) {
      try {
        console.log(`Processing scheduled report: ${report.name}`);
        
        const pdfBuffer = await this.generateFormReport(report.formId, report.config);
        
        // In production, send email here
        console.log(`Report would be sent to: ${report.recipients.join(', ')}`);
        
        // Update next run time
        report.lastRun = now;
        report.nextRun = this.calculateNextRun(report.schedule);
        this.scheduledReports.set(report.id, report);
        
        // Save to history
        await this.saveReportToHistory(report.formId, pdfBuffer, report.config, 'system');
        
      } catch (error) {
        console.error(`Error processing scheduled report ${report.id}:`, error);
      }
    }
  }
}