import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import * as path from 'path';
import { AuthenticatedRequest } from '../../../shared/middleware/auth.middleware';
import {
  BulkExportRequestDto,
  ExportPreviewDto,
  ExportRequestDto
} from '../dtos/export.dto';
import { ExportFormat, ExportType } from '../interfaces/export.interface';
import { ExportService } from '../services/export.service';

export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  async exportSubmissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const exportDto = plainToClass(ExportRequestDto, req.body);
      const errors = await validate(exportDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => Object.values(err.constraints || {})).flat()
        });
        return;
      }

      const userId = req.user?.id || 'system';
      const result = await this.exportService.exportData(exportDto, userId);

      res.status(200).json({
        success: true,
        message: 'Export completed successfully',
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Export failed',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async bulkExport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const bulkExportDto = plainToClass(BulkExportRequestDto, req.body);
      const errors = await validate(bulkExportDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => Object.values(err.constraints || {})).flat()
        });
        return;
      }

      const userId = req.user?.id || 'system';
      const results = await this.exportService.bulkExport(bulkExportDto, userId);

      res.status(200).json({
        success: true,
        message: 'Bulk export completed successfully',
        data: results
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Bulk export failed',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async getExportPreview(req: Request, res: Response): Promise<void> {
    try {
      const previewDto = plainToClass(ExportPreviewDto, req.query);
      const errors = await validate(previewDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => Object.values(err.constraints || {})).flat()
        });
        return;
      }

      const data = await this.exportService.getExportPreview(previewDto);

      res.status(200).json({
        success: true,
        message: 'Preview data retrieved successfully',
        data
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get preview data',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async getExportSummary(req: Request, res: Response): Promise<void> {
    try {
      const { exportType, formTypeId, year, memberId, siteId, submissionStatus } = req.query;

      if (!exportType) {
        res.status(400).json({
          success: false,
          message: 'Export type is required'
        });
        return;
      }

      const filters = {
        formTypeId: formTypeId as string,
        year: year ? parseInt(year as string) : undefined,
        memberId: memberId as string,
        siteId: siteId as string,
        submissionStatus: submissionStatus as string
      };

      const summary = await this.exportService.getExportSummary(
        exportType as ExportType,
        filters
      );

      res.status(200).json({
        success: true,
        message: 'Export summary retrieved successfully',
        data: summary
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get export summary',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async downloadExportFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileName } = req.params;

      if (!fileName) {
        res.status(400).json({
          success: false,
          message: 'File name is required'
        });
        return;
      }

      const filePath = path.join(process.cwd(), 'exports', fileName);
      
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Download error:', err);
          res.status(404).json({
            success: false,
            message: 'File not found'
          });
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to download file',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async deleteExportFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileName } = req.params;

      if (!fileName) {
        res.status(400).json({
          success: false,
          message: 'File name is required'
        });
        return;
      }

      const filePath = path.join(process.cwd(), 'exports', fileName);
      const deleted = await this.exportService.deleteExportFile(filePath);

      if (deleted) {
        res.status(200).json({
          success: true,
          message: 'File deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete file',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async listExportFiles(req: Request, res: Response): Promise<void> {
    try {
      const files = await this.exportService.listExportFiles();

      res.status(200).json({
        success: true,
        message: 'Export files retrieved successfully',
        data: files
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to list export files',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async exportFormTypeSubmissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { formTypeId } = req.params;
      const { year, format, memberId, siteId } = req.query;

      const exportDto: ExportRequestDto = {
        exportType: year ? ExportType.FORM_TYPE_YEARLY : ExportType.FORM_TYPE_CURRENT,
        format: (format as ExportFormat) || ExportFormat.CSV,
        formTypeId,
        year: year ? parseInt(year as string) : undefined,
        memberId: memberId as string,
        siteId: siteId as string
      };

      const userId = req.user?.id || 'system';
      const result = await this.exportService.exportData(exportDto, userId);

      res.status(200).json({
        success: true,
        message: 'Form type submissions exported successfully',
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Export failed',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async exportMemberSubmissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { memberId } = req.params;
      const { year, format, formTypeId } = req.query;

      const exportDto: ExportRequestDto = {
        exportType: year ? ExportType.MEMBER_SUBMISSIONS_YEARLY : ExportType.MEMBER_SUBMISSIONS_ALL,
        format: (format as ExportFormat) || ExportFormat.CSV,
        memberId,
        year: year ? parseInt(year as string) : undefined,
        formTypeId: formTypeId as string
      };

      const userId = req.user?.id || 'system';
      const result = await this.exportService.exportData(exportDto, userId);

      res.status(200).json({
        success: true,
        message: 'Member submissions exported successfully',
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Export failed',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async exportSiteSubmissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { siteId } = req.params;
      const { year, format, formTypeId } = req.query;

      const exportDto: ExportRequestDto = {
        exportType: year ? ExportType.SITE_SUBMISSIONS_YEARLY : ExportType.SITE_SUBMISSIONS_ALL,
        format: (format as ExportFormat) || ExportFormat.CSV,
        siteId,
        year: year ? parseInt(year as string) : undefined,
        formTypeId: formTypeId as string
      };

      const userId = req.user?.id || 'system';
      const result = await this.exportService.exportData(exportDto, userId);

      res.status(200).json({
        success: true,
        message: 'Site submissions exported successfully',
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Export failed',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async exportAllSubmissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { year, format, formTypeId, memberId, siteId } = req.query;

      const exportDto: ExportRequestDto = {
        exportType: ExportType.ALL_FORM_TYPES_ALL_YEARS,
        format: (format as ExportFormat) || ExportFormat.CSV,
        year: year ? parseInt(year as string) : undefined,
        formTypeId: formTypeId as string,
        memberId: memberId as string,
        siteId: siteId as string
      };

      const userId = req.user?.id || 'system';
      const result = await this.exportService.exportData(exportDto, userId);

      res.status(200).json({
        success: true,
        message: 'All submissions exported successfully',
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Export failed',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async getExportTypes(req: Request, res: Response): Promise<void> {
    try {
      const exportTypes = Object.values(ExportType).map(type => ({
        value: type,
        label: type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      }));

      res.status(200).json({
        success: true,
        message: 'Export types retrieved successfully',
        data: exportTypes
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get export types',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async getExportFormats(req: Request, res: Response): Promise<void> {
    try {
      const exportFormats = Object.values(ExportFormat).map(format => ({
        value: format,
        label: format.toUpperCase()
      }));

      res.status(200).json({
        success: true,
        message: 'Export formats retrieved successfully',
        data: exportFormats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get export formats',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}