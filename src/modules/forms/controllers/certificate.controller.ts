
import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { ResponseHelper } from '../../../shared/utils/response';
import { CertificateService } from '../services/certificate.service';

export class CertificateController {
  private service: CertificateService;

  constructor(private readonly dataSource: DataSource) {
    this.service = new CertificateService(dataSource);
  }

  createCertificate=async (req: Request, res: Response): Promise<void>=> {
    try {

      const {
        recipientName,
        badgeType,
        completionDate,
        memberId,
        siteId,
        formType,
        completionRate,
        signatoryName,
        signatoryTitle,
      } = req.body;

      if (!recipientName || !badgeType || !completionDate || !memberId) {
        res.status(400).json({
          error: 'Missing required fields: recipientName, badgeType, completionDate, memberId',
        });
        return;
      }


      const certificate = await this.service.createCertificate({
        recipientName,
        badgeType,
        completionDate,
        memberId,
        siteId,
        formType,
        completionRate,
        signatoryName,
        signatoryTitle,
      });

      res.status(201).json({
        message: 'Certificate created successfully',
        data: certificate,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 400);
    }
  }

  getCertificateById=async(req: Request, res: Response): Promise<void> =>{
    try {
      const { id } = req.params;
      const certificate = await this.service.getCertificateById(id);

      if (!certificate) {
        res.status(404).json({ error: 'Certificate not found' });
        return;
      }

      res.status(200).json({
        message: 'Certificate retrieved successfully',
        data: certificate,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 400);
    }
  }

  getCertificateByCertificateId=async (req: Request, res: Response): Promise<void>=> {
    try {
      const { certificateId } = req.params;
      const certificate =
        await this.service.getCertificateByCertificateId(certificateId);

      if (!certificate) {
        res.status(404).json({ error: 'Certificate not found' });
        return;
      }

      res.status(200).json({
        message: 'Certificate retrieved successfully',
        data: certificate,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 400);
    }
  }

  getCertificatesByMember=async (req: Request, res: Response): Promise<void>=> {
    try {
      const { memberId } = req.params;
      const certificates = await this.service.getCertificatesByMember(memberId);

      res.status(200).json({
        message: 'Certificates retrieved successfully',
        data: certificates,
        count: certificates.length,
      });
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 400);
    }
  }

  getCertificatesBySite=async (req: Request, res: Response): Promise<void> =>{
    try {
      const { siteId } = req.params;
      const certificates = await this.service.getCertificatesBySite(siteId);

      res.status(200).json({
        message: 'Certificates retrieved successfully',
        data: certificates,
        count: certificates.length,
      });
    } catch (error: any) {
      console.error('Error retrieving certificates:', error);
      ResponseHelper.error(res, error.message, 400);
    }
  }

  getAllCertificates=async (req: Request, res: Response): Promise<void> =>{
    try {
      const certificates = await this.service.getAllCertificates();

      res.status(200).json({
        message: 'All certificates retrieved successfully',
        data: certificates,
        count: certificates.length,
      });
    } catch (error: any) {
      console.error('Error retrieving certificates:', error);
      ResponseHelper.error(res, error.message, 400);
    }
  }

  downloadCertificatePDF= async(req: Request, res: Response): Promise<void>=> {
    try {
      const { certificateId } = req.params;
      const pdfBuffer = await this.service.generatePDF(certificateId);

      if (!pdfBuffer) {
        res.status(404).json({ error: 'Certificate not found or PDF generation failed' });
        return;
      }

      // Get certificate details for filename
      const certificate =
        await this.service.getCertificateByCertificateId(certificateId);
      const fileName = `AMDA_Certificate_${certificate?.recipientName.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.status(200).send(pdfBuffer);
    } catch (error: any) {
      console.error('Error downloading certificate PDF:', error);
      ResponseHelper.error(res, error.message, 400);
    }
  }

  previewCertificatePDF=async(req: Request, res: Response): Promise<void>=> {
    try {
      const { certificateId } = req.params;
      const pdfBuffer = await this.service.generatePDF(certificateId);

      if (!pdfBuffer) {
        res.status(404).json({ error: 'Certificate not found or PDF generation failed' });
        return;
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Content-Length', pdfBuffer.length);

      res.status(200).send(pdfBuffer);
    } catch (error: any) {
      console.error('Error previewing certificate PDF:', error);
      ResponseHelper.error(res, error.message, 400);
    }
  }

  deleteCertificate=async(req: Request, res: Response): Promise<void>=> {
    try {
      const { id } = req.params;
      const deleted = await this.service.deleteCertificate(id);

      if (!deleted) {
        res.status(404).json({ error: 'Certificate not found' });
        return;
      }

      res.status(200).json({
        message: 'Certificate deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting certificate:', error);
      ResponseHelper.error(res, error.message, 400);
    }
  }

  generateQRCode=async(req: Request, res: Response): Promise<void> => {
    try {
      const { certificateId } = req.params;
      const qrCode = await this.service.generateQRCode(certificateId);

      if (!qrCode) {
        res.status(404).json({ error: 'Certificate not found' });
        return;
      }

      res.setHeader('Content-Type', 'image/png');
      const base64Data = qrCode.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      res.status(200).send(buffer);
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      ResponseHelper.error(res, error.message, 400);
    }
  }

  verifyCertificate=async(req: Request, res: Response): Promise<void> => {
    try {
      const { certificateId } = req.params;
      const certificate =
        await this.service.getCertificateByCertificateId(certificateId);

      if (!certificate) {
        res.status(404).json({
          error: 'Certificate not found',
          valid: false,
        });
        return;
      }

      res.status(200).json({
        message: 'Certificate verified successfully',
        valid: true,
        data: {
          certificateId: certificate.certificateId,
          recipientName: certificate.recipientName,
          badgeType: certificate.badgeType,
          completionDate: certificate.completionDate,
          siteName: certificate.site?.name,
          memberCompany: certificate.member?.companyName,
          issuedDate: certificate.createdAt,
        },
      });
    } catch (error: any) {
      console.error('Error verifying certificate:', error);
      ResponseHelper.error(res, error.message, 400);
    }
  }
}
