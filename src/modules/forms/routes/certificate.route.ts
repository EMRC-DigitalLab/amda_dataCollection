import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { CertificateController } from '../controllers/certificate.controller';

export function createCertificateRoutes(dataSource: DataSource): Router {
  const router = Router();
  const certificateController = new CertificateController(dataSource);

  // Create a new certificate
  router.post('/', authMiddleware, certificateController.createCertificate);

  // Get all certificates
  router.get('/', certificateController.getAllCertificates);

  // Get certificate by ID
  router.get('/:id', certificateController.getCertificateById);

  // Get certificate by certificate ID
  router.get('/certificate-id/:certificateId', certificateController.getCertificateByCertificateId);

  // Get certificates by member
  router.get('/member/:memberId', certificateController.getCertificatesByMember);

  // Get certificates by site
  router.get('/site/:siteId', certificateController.getCertificatesBySite);

  // Download certificate PDF
  router.get('/download/:certificateId', certificateController.downloadCertificatePDF);

  // Preview certificate PDF
  router.get('/preview/:certificateId', certificateController.previewCertificatePDF);

  // Generate QR code for certificate verification
  router.get('/qr-code/:certificateId', certificateController.generateQRCode);

  // Verify certificate (public endpoint)
  router.get('/verify/:certificateId', certificateController.verifyCertificate);

  // Delete certificate
  router.delete('/:id', certificateController.deleteCertificate);

  return router;
}
