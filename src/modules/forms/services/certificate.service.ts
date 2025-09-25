// @ts-nocheck

import * as fs from 'fs/promises';
import jsPDF from 'jspdf';
import * as path from 'path';
import * as QRCode from 'qrcode';
import { DataSource } from 'typeorm';
import { Certificate } from '../../../database/entities/certificate.entity';
import { CertificateRepository } from '../../../database/repositories/forms/certificate.repository';

interface CertificateData {
  recipientName: string;
  badgeType: string;
  completionDate: string;
  certificateId?: string;
  formType?: string;
  completionRate?: number;
  signatoryName?: string;
  signatoryTitle?: string;
  siteName?: string;
  memberId: string;
  siteId?: string;
}

export class CertificateService {
  private certificateRepository: CertificateRepository;
  private baseUrl: string;

  constructor(private readonly dataSource: DataSource) {
    this.certificateRepository = new CertificateRepository();
    this.baseUrl = process.env.BASE_URL || 'http://localhost:5173/';
  }

  async createCertificate(data: CertificateData): Promise<Certificate> {
    const certificate = await this.certificateRepository.create({
      recipientName: data.recipientName,
      badgeType: data.badgeType,
      completionDate: new Date(data.completionDate),
      memberId: data.memberId,
      siteId: data.siteId,
    });

    return certificate;
  }

  async generatePDF(certificateId: string): Promise<Buffer> {
    const certificate = await this.certificateRepository.findByCertificateId(certificateId);

    if (!certificate) {
      throw new Error('Certificate not found');
    }

    // Create certificate data object with all necessary fields
    const certificateData = {
      recipientName: certificate.recipientName,
      badgeType: certificate.badgeType || 'Financial Data',
      completionDate: certificate.completionDate.toISOString().split('T')[0],
      certificateId: certificate.certificateId,
      siteName: certificate.site?.name,
      formType: undefined, // Add if needed from certificate data
      completionRate: undefined, // Add if needed from certificate data
      signatoryName: undefined, // Add if needed from certificate data
      signatoryTitle: undefined, // Add if needed from certificate data
    };

    // Generate QR Code for certificate verification
    const verificationUrl = `${this.baseUrl}/api/certificates/verify/${certificate.certificateId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#1f2937',
        light: '#FFFFFF',
      },
      width: 120,
    });

    const pdf = await this.generateReliableCertificatePDF(certificateData, qrCodeDataUrl!);
    return Buffer.from(pdf.output('arraybuffer'));
  }

  private async generateReliableCertificatePDF(data: any, qrCodeDataUrl: string): Promise<jsPDF> {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [792, 612], // 11" x 8.5"
    });

    const pageWidth = 792;
    const pageHeight = 612;

    // Wait for fonts to load before proceeding
    const [customFontsLoaded, logoBase64, badgeBase64] = await Promise.all([
      this.loadFontsFromPublic(pdf),
      this.loadImageAsBase64('amda-logo.png'),
      this.loadImageAsBase64('digital.png'),
    ]);

    // Helper function for text positioning with custom font support
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      if (!text) return; // Guard against empty text

      pdf.setFontSize(options.fontSize || 12);

      // Use custom fonts if loaded, otherwise fall back to built-in fonts
      let fontFamily = 'helvetica';
      let fontWeight = options.style || 'normal';

      if (customFontsLoaded) {
        fontFamily = 'ClashGrotesk';

        // Map font weights to available ClashGrotesk variants
        if (options.fontType === 'title') {
          if (options.style === 'bold') {
            fontWeight = 'bold';
          } else {
            fontWeight = 'medium';
          }
        } else if (options.fontType === 'body') {
          if (options.style === 'bold') {
            fontWeight = 'medium';
          } else {
            fontWeight = 'normal';
          }
        }
      } else {
        // Fallback to built-in fonts
        if (options.fontType === 'title') {
          fontFamily = 'times';
        } else if (options.fontType === 'body') {
          fontFamily = 'helvetica';
        }
      }

      try {
        pdf.setFont(fontFamily, fontWeight);
      } catch (fontError) {
        console.warn('Font setting failed, using default:', fontError);
        pdf.setFont('helvetica', 'normal');
      }

      pdf.setTextColor(options.color || '#000000');

      if (options.align === 'center') {
        const textWidth =
          (pdf.getStringUnitWidth(text) * (options.fontSize || 12)) / pdf.internal.scaleFactor;
        x = x - textWidth / 2;
      } else if (options.align === 'right') {
        const textWidth =
          (pdf.getStringUnitWidth(text) * (options.fontSize || 12)) / pdf.internal.scaleFactor;
        x = x - textWidth;
      }

      pdf.text(text, x, y);
    };

    // Background - Light gray/off-white like in image
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Green curved corner (top-right) - using simple triangle
    pdf.setFillColor(34, 197, 94); // Green color
    pdf.triangle(pageWidth - 150, 0, pageWidth, 0, pageWidth, 150, 'F');

    // Green curved corner (bottom-left)
    pdf.triangle(0, pageHeight - 150, 0, pageHeight, 150, pageHeight, 'F');

    // Main white content area with subtle border
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(1);
    pdf.roundedRect(40, 40, pageWidth - 80, pageHeight - 80, 8, 8, 'FD');

    // Header - AMDA Logo area (colorful circles like in image)
    const logoX = pageWidth / 2 - 60;
    const logoY = 100;

    if (logoBase64) {
      try {
        // Determine image format from base64 string
        const imageFormat = logoBase64.includes('data:image/png')
          ? 'PNG'
          : logoBase64.includes('data:image/jpeg')
            ? 'JPEG'
            : 'PNG';

        pdf.addImage(logoBase64, imageFormat, logoX, logoY, 80, 40);
      } catch (error) {
        console.warn('Failed to add logo image:', error);
        // Fallback to colored circles
        this.drawColoredCircles(pdf, logoX, logoY);
      }
    } else {
      this.drawColoredCircles(pdf, logoX, logoY);
    }

    // Divider line
    pdf.setDrawColor(107, 114, 128);
    pdf.setLineWidth(2);
    pdf.line(pageWidth / 2 + 30, logoY - 20, pageWidth / 2 + 30, logoY + 40);

    // Header text
    addText('Data Compliance', pageWidth / 2 + 60, logoY - 5, {
      fontSize: 20,
      fontType: 'title',
      style: 'bold',
      color: '#1f2937',
    });

    addText('Certificate', pageWidth / 2 + 60, logoY + 15, {
      fontSize: 20,
      fontType: 'title',
      style: 'bold',
      color: '#1f2937',
    });

    addText('African Mini-grid Developers Association', pageWidth / 2 + 60, logoY + 35, {
      fontSize: 12,
      fontType: 'body',
      color: '#6b7280',
    });

    // Main title
    addText('Certificate of Completion', pageWidth / 2, 200, {
      fontSize: 40,
      fontType: 'title',
      style: 'normal',
      color: '#1f2937',
      align: 'center',
    });

    // Site name (bigger) - Added siteName display
    if (data.siteName) {
      addText(data.siteName, pageWidth / 2, 240, {
        fontSize: 36,
        fontType: 'title',
        style: 'semi-bold',
        color: '#059669', // Green color to make it stand out
        align: 'center',
      });

      // Presented to text (adjusted position)
      addText('Presented to', pageWidth / 2, 275, {
        fontSize: 16,
        fontType: 'body',
        color: '#6b7280',
        align: 'center',
      });

      // Recipient name (smaller) - Reduced from 32 to 24
      addText(data.recipientName, pageWidth / 2, 305, {
        fontSize: 24,
        fontType: 'normal',
        style: 'semi-bold',
        color: '#1f2937',
        align: 'center',
      });

      // Underline for name (adjusted position)
      const nameWidth =
        (pdf.getStringUnitWidth(data.recipientName) * 24) / pdf.internal.scaleFactor;
      pdf.setDrawColor(209, 213, 219);
      pdf.setLineWidth(2);
      pdf.line(pageWidth / 2 - nameWidth / 2, 315, pageWidth / 2 + nameWidth / 2, 315);

      // Description text (adjusted position)
      const description = `This certifies that the above-named individual has completed the required data\ncompliance steps in accordance with AMDA's policies.`;

      const lines = description.split('\n');
      let yPos = 340;
      lines.forEach(line => {
        addText(line, pageWidth / 2, yPos, {
          fontSize: 14,
          fontType: 'body',
          color: '#374151',
          align: 'center',
        });
        yPos += 20;
      });
    } else {
      // Original layout when no siteName
      // Presented to text
      addText('Presented to', pageWidth / 2, 250, {
        fontSize: 16,
        fontType: 'body',
        color: '#6b7280',
        align: 'center',
      });

      // Recipient name with underline
      addText(data.recipientName, pageWidth / 2, 290, {
        fontSize: 32,
        fontType: 'title',
        style: 'bold',
        color: '#1f2937',
        align: 'center',
      });

      // Underline for name
      const nameWidth =
        (pdf.getStringUnitWidth(data.recipientName) * 32) / pdf.internal.scaleFactor;
      pdf.setDrawColor(209, 213, 219);
      pdf.setLineWidth(2);
      pdf.line(pageWidth / 2 - nameWidth / 2, 305, pageWidth / 2 + nameWidth / 2, 305);

      // Description text
      const description = `This certifies that the above-named individual has completed the required data\ncompliance steps in accordance with AMDA's policies.`;

      const lines = description.split('\n');
      let yPos = 340;
      lines.forEach(line => {
        addText(line, pageWidth / 2, yPos, {
          fontSize: 14,
          fontType: 'body',
          color: '#374151',
          align: 'center',
        });
        yPos += 20;
      });
    }

    // Badge - Shield shape like in the image (adjusted position based on siteName)
    const badgeX = pageWidth / 2;
    const badgeY = data.siteName ? 420 : 440;

    if (badgeBase64) {
      try {
        // Use the digital.png badge image
        const imageFormat = badgeBase64.includes('data:image/png')
          ? 'PNG'
          : badgeBase64.includes('data:image/jpeg')
            ? 'JPEG'
            : 'PNG';

        // Add badge image - adjust size as needed
        pdf.addImage(badgeBase64, imageFormat, badgeX - 40, badgeY - 30, 80, 80);
      } catch (error) {
        console.warn('Failed to add badge image:', error);
        // Fallback to the original shield design
        this.drawOriginalBadge(pdf, badgeX, badgeY, data);
      }
    } else {
      // Fallback to the original shield design
      this.drawOriginalBadge(pdf, badgeX, badgeY, data);
    }

    // Signature sections
    const signatureY = pageHeight - 100;

    // Left signature line and text
    pdf.setDrawColor(156, 163, 175);
    pdf.setLineWidth(1);
    pdf.line(80, signatureY, 250, signatureY);

    // Add signatory name if provided
    if (data.signatoryName) {
      addText(data.signatoryName, 165, signatureY - 10, {
        fontSize: 12,
        fontType: 'body',
        style: 'bold',
        color: '#374151',
        align: 'center',
      });
    }

    addText(data.signatoryTitle || 'Signature', 165, signatureY + 20, {
      fontSize: 14,
      fontType: 'body',
      color: '#6b7280',
      align: 'center',
    });

    // Right date line and text
    pdf.line(540, signatureY, 710, signatureY);

    // Add completion date above the line
    const completedDate = new Date(data.completionDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    addText(completedDate, 625, signatureY - 10, {
      fontSize: 12,
      fontType: 'body',
      style: 'bold',
      color: '#374151',
      align: 'center',
    });

    addText('Date', 625, signatureY + 20, {
      fontSize: 14,
      fontType: 'body',
      color: '#6b7280',
      align: 'center',
    });

    // QR Code for verification (positioned in top-right corner of white area)
    if (qrCodeDataUrl) {
      try {
        pdf.addImage(qrCodeDataUrl, 'PNG', pageWidth - 140, 60, 80, 80);

        // QR Code label
        addText('Scan to Verify', pageWidth - 100, 150, {
          fontSize: 8,
          fontType: 'body',
          color: '#6b7280',
          align: 'center',
        });
      } catch (error) {
        console.warn('Failed to add QR code:', error);
      }
    }

    // Footer details (smaller text at bottom)
    const footerCompletedDate = new Date(data.completionDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Bottom left details
    addText(`Completion Date: ${footerCompletedDate}`, 60, pageHeight - 30, {
      fontSize: 9,
      fontType: 'body',
      color: '#9ca3af',
    });

    if (data.certificateId) {
      addText(`Certificate ID: ${data.certificateId}`, 60, pageHeight - 15, {
        fontSize: 9,
        fontType: 'body',
        color: '#9ca3af',
      });
    }

    // Bottom center details (if formType and completionRate exist)
    if (data.formType && data.completionRate) {
      addText(
        `Program: ${data.formType} (${data.completionRate}% completion)`,
        pageWidth / 2,
        pageHeight - 22,
        {
          fontSize: 9,
          fontType: 'body',
          color: '#9ca3af',
          align: 'center',
        }
      );
    }

    // Bottom right details
    addText('Verify at: www.amda.org/verify', pageWidth - 60, pageHeight - 30, {
      fontSize: 9,
      fontType: 'body',
      color: '#9ca3af',
      align: 'right',
    });

    addText(
      `© ${new Date().getFullYear()} African Mini-grid Developers Association`,
      pageWidth - 60,
      pageHeight - 15,
      {
        fontSize: 9,
        fontType: 'body',
        color: '#9ca3af',
        align: 'right',
      }
    );

    return pdf;
  }

  private async loadImageAsBase64(imagePath: string): Promise<string | null> {
    // Primary path: public folder in the same directory as this service file
    const publicPath = path.join(__dirname, 'public', imagePath);
    
    try {
      console.log(`Loading image from: ${publicPath}`);
      const imageBuffer = await fs.readFile(publicPath);
      const base64 = imageBuffer.toString('base64');
      const ext = path.extname(imagePath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 
                      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                      ext === '.gif' ? 'image/gif' : 'image/png';
      console.log(`Successfully loaded image from: ${publicPath}`);
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.warn(`Could not load image from: ${publicPath}`, error);
      return null;
    }
  }

  private async loadFontsFromPublic(pdf: jsPDF): Promise<boolean> {
    try {
      console.log('Starting font loading process from public folder...');
      
      // Font file names and configurations
      const fontConfigs = [
        { filename: 'ClashGrotesk-Regular.ttf', family: 'ClashGrotesk', style: 'normal' },
        { filename: 'ClashGrotesk-Bold.ttf', family: 'ClashGrotesk', style: 'bold' },
        { filename: 'ClashGrotesk-Light.ttf', family: 'ClashGrotesk', style: 'light' },
        { filename: 'ClashGrotesk-Medium.ttf', family: 'ClashGrotesk', style: 'medium' },
      ];

      const fontPromises = fontConfigs.map(config => this.loadFontFromFile(config.filename));
      const responses = await Promise.all(fontPromises);
      
      let fontsLoaded = 0;

      responses.forEach((base64, index) => {
        if (base64) {
          try {
            const config = fontConfigs[index];
            pdf.addFileToVFS(config.filename, base64);
            pdf.addFont(config.filename, config.family, config.style);
            fontsLoaded++;
            console.log(`Successfully loaded font: ${config.filename}`);
          } catch (fontError) {
            console.warn(`Failed to add font ${config.filename} to PDF:`, fontError);
          }
        }
      });

      console.log(`Total fonts loaded: ${fontsLoaded} out of ${fontConfigs.length}`);
      return fontsLoaded > 0;
    } catch (error) {
      console.warn('Could not load custom fonts, using defaults:', error);
      return false;
    }
  }

  private async loadFontFromFile(fontFilename: string): Promise<string | null> {
    // Load fonts from public/fonts folder in the same directory as this service file
    const fontPath = path.join(__dirname, 'public', 'fonts', fontFilename);
    
    try {
      console.log(`Loading font from: ${fontPath}`);
      const fontBuffer = await fs.readFile(fontPath);
      const base64 = fontBuffer.toString('base64');
      console.log(`Successfully loaded font: ${fontFilename}`);
      return base64;
    } catch (error) {
      console.warn(`Could not load font: ${fontFilename} from ${fontPath}`, error);
      return null;
    }
  }

  private drawColoredCircles(pdf: jsPDF, logoX: number, logoY: number): void {
    // Colorful logo circles as fallback
    pdf.setFillColor(239, 68, 68); // Red
    pdf.circle(logoX + 20, logoY + 20, 8, 'F');
    pdf.setFillColor(34, 197, 94); // Green
    pdf.circle(logoX + 40, logoY + 10, 8, 'F');
    pdf.setFillColor(59, 130, 246); // Blue
    pdf.circle(logoX + 60, logoY + 20, 8, 'F');
    pdf.setFillColor(245, 158, 11); // Orange
    pdf.circle(logoX + 80, logoY + 15, 8, 'F');
    pdf.setFillColor(168, 85, 247); // Purple
    pdf.circle(logoX + 100, logoY + 25, 8, 'F');

    // Additional smaller circles
    pdf.setFillColor(34, 197, 94);
    pdf.circle(logoX + 30, logoY + 35, 5, 'F');
    pdf.setFillColor(245, 158, 11);
    pdf.circle(logoX + 70, logoY + 32, 5, 'F');
  }

  async generateQRCode(certificateId: string): Promise<string | any> {
    const certificate = await this.certificateRepository.findByCertificateId(certificateId);

    if (!certificate) {
      return null;
    }

    const verificationUrl = `${this.baseUrl}/api/certificates/verify/${certificate.certificateId}`;

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#1f2937',
          light: '#FFFFFF',
        },
        width: 200,
      });

      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  }

  async getCertificateById(id: string): Promise<Certificate | null> {
    return await this.certificateRepository.findById(id);
  }

  async getCertificateByCertificateId(certificateId: string): Promise<Certificate | null> {
    return await this.certificateRepository.findByCertificateId(certificateId);
  }

  async getCertificatesByMember(memberId: string): Promise<Certificate[]> {
    return await this.certificateRepository.findByMemberId(memberId);
  }

  async getCertificatesBySite(siteId: string): Promise<Certificate[]> {
    return await this.certificateRepository.findBySiteId(siteId);
  }

  async getAllCertificates(): Promise<Certificate[]> {
    return await this.certificateRepository.findAll();
  }

  async deleteCertificate(id: string): Promise<boolean> {
    return await this.certificateRepository.delete(id);
  }
}