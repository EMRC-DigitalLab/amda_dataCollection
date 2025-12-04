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
  organizationName?: string;
  memberId: string;
  overallCompletionRate?: number;
  totalSitesCount?: number;
  completedFormsCount?: number;
  totalFormsCount?: number;
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
      overallCompletionRate: data.overallCompletionRate,
      totalSitesCount: data.totalSitesCount,
      completedFormsCount: data.completedFormsCount,
      totalFormsCount: data.totalFormsCount,
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
      organizationName: certificate.member?.companyName,
      formType: undefined,
      completionRate: certificate.overallCompletionRate,
      signatoryName: undefined,
      signatoryTitle: undefined,
      overallCompletionRate: certificate.overallCompletionRate,
      totalSitesCount: certificate.totalSitesCount,
      completedFormsCount: certificate.completedFormsCount,
      totalFormsCount: certificate.totalFormsCount,
    };

    // Generate QR Code
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
      format: [792, 612],
    });

    const pageWidth = 792;
    const pageHeight = 612;

    // Check if this is a 100% completion certificate
    const isPerfectCompletion = data.overallCompletionRate === 100;

    const [customFontsLoaded, logoBase64, badgeBase64] = await Promise.all([
      this.loadFontsFromPublic(pdf),
      this.loadImageAsBase64('amda-logo.png'),
      this.loadImageAsBase64('digital.png'),
    ]);

    const addText = (text: string, x: number, y: number, options: any = {}) => {
      if (!text) return;

      pdf.setFontSize(options.fontSize || 12);

      let fontFamily = 'helvetica';
      let fontWeight = options.style || 'normal';

      if (customFontsLoaded) {
        fontFamily = 'ClashGrotesk';

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

    // ============= BACKGROUND STYLING =============
    if (isPerfectCompletion) {
      // GOLD/PREMIUM BACKGROUND for 100% completion
      // Gradient effect using multiple rectangles
      pdf.setFillColor(255, 250, 240); // Warm cream
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Gold accent corners (larger for perfect completion)
      pdf.setFillColor(251, 191, 36); // Gold color
      pdf.triangle(pageWidth - 180, 0, pageWidth, 0, pageWidth, 180, 'F');
      pdf.triangle(0, pageHeight - 180, 0, pageHeight, 180, pageHeight, 'F');

      // Add decorative gold circles in corners
      pdf.setFillColor(251, 191, 36);
      pdf.circle(pageWidth - 100, 100, 15, 'F');
      pdf.circle(100, pageHeight - 100, 15, 'F');

      // Premium border with gold accent
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(251, 191, 36); // Gold border
      pdf.setLineWidth(3);
      pdf.roundedRect(40, 40, pageWidth - 80, pageHeight - 80, 8, 8, 'FD');

      // Inner decorative border
      pdf.setDrawColor(251, 191, 36);
      pdf.setLineWidth(1);
      pdf.roundedRect(50, 50, pageWidth - 100, pageHeight - 100, 8, 8, 'S');
    } else {
      // STANDARD BACKGROUND for partial completion
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Green corners (standard size)
      pdf.setFillColor(34, 197, 94);
      pdf.triangle(pageWidth - 150, 0, pageWidth, 0, pageWidth, 150, 'F');
      pdf.triangle(0, pageHeight - 150, 0, pageHeight, 150, pageHeight, 'F');

      // Standard white content area
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(1);
      pdf.roundedRect(40, 40, pageWidth - 80, pageHeight - 80, 8, 8, 'FD');
    }

    // ============= HEADER SECTION =============
    const logoX = pageWidth / 2 - 60;
    const logoY = 100;

    if (logoBase64) {
      try {
        const imageFormat = logoBase64.includes('data:image/png') ? 'PNG' : 'JPEG';
        pdf.addImage(logoBase64, imageFormat, logoX, logoY, 80, 40);
      } catch (error) {
        console.warn('Failed to add logo image:', error);
        this.drawColoredCircles(pdf, logoX, logoY);
      }
    } else {
      this.drawColoredCircles(pdf, logoX, logoY);
    }

    // Divider line - color changes based on completion
    pdf.setDrawColor(
      isPerfectCompletion ? 251 : 107,
      isPerfectCompletion ? 191 : 114,
      isPerfectCompletion ? 36 : 128
    );
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

    // ============= TITLE SECTION =============
    // Add "PERFECT COMPLETION" banner for 100%
    if (isPerfectCompletion) {
      // Gold banner background
      pdf.setFillColor(251, 191, 36);
      pdf.roundedRect(pageWidth / 2 - 150, 170, 300, 35, 5, 5, 'F');

      addText('★ PERFECT COMPLETION ★', pageWidth / 2, 192, {
        fontSize: 18,
        fontType: 'title',
        style: 'bold',
        color: '#ffffff',
        align: 'center',
      });
    }

    // Main title - position adjusted if perfect completion
    addText('Certificate of Completion', pageWidth / 2, isPerfectCompletion ? 220 : 200, {
      fontSize: 40,
      fontType: 'title',
      style: 'normal',
      color: isPerfectCompletion ? '#b45309' : '#1f2937', // Darker gold for 100%
      align: 'center',
    });

    // ============= RECIPIENT SECTION =============
    const recipientYStart = isPerfectCompletion ? 260 : 250;

    if (data.organizationName) {
     

      addText('Presented to', pageWidth / 2, recipientYStart + 35, {
        fontSize: 16,
        fontType: 'body',
        color: '#6b7280',
        align: 'center',
      });

       addText(data.organizationName, pageWidth / 2, recipientYStart, {
        fontSize: 36,
        fontType: 'title',
        style: 'semi-bold',
        color: isPerfectCompletion ? '#b45309' : '#059669',
        align: 'center',
      });

      // addText(data.recipientName, pageWidth / 2, recipientYStart + 65, {
      //   fontSize: 24,
      //   fontType: 'normal',
      //   style: 'semi-bold',
      //   color: '#1f2937',
      //   align: 'center',
      // });

      // Underline - gold for 100%, gray for others
      const nameWidth =
        (pdf.getStringUnitWidth(data.recipientName) * 24) / pdf.internal.scaleFactor;
      pdf.setDrawColor(
        isPerfectCompletion ? 251 : 209,
        isPerfectCompletion ? 191 : 213,
        isPerfectCompletion ? 36 : 219
      );
      pdf.setLineWidth(2);
      pdf.line(
        pageWidth / 2 - nameWidth / 2,
        recipientYStart + 75,
        pageWidth / 2 + nameWidth / 2,
        recipientYStart + 75
      );
    } else {
      addText('Presented to', pageWidth / 2, recipientYStart, {
        fontSize: 16,
        fontType: 'body',
        color: '#6b7280',
        align: 'center',
      });

      addText(data.recipientName, pageWidth / 2, recipientYStart + 40, {
        fontSize: 32,
        fontType: 'title',
        style: 'bold',
        color: '#1f2937',
        align: 'center',
      });

      const nameWidth =
        (pdf.getStringUnitWidth(data.recipientName) * 32) / pdf.internal.scaleFactor;
      pdf.setDrawColor(
        isPerfectCompletion ? 251 : 209,
        isPerfectCompletion ? 191 : 213,
        isPerfectCompletion ? 36 : 219
      );
      pdf.setLineWidth(2);
      pdf.line(
        pageWidth / 2 - nameWidth / 2,
        recipientYStart + 55,
        pageWidth / 2 + nameWidth / 2,
        recipientYStart + 55
      );
    }

    // ============= DESCRIPTION SECTION =============
    const descriptionYStart = data.organizationName
      ? isPerfectCompletion
        ? 370
        : 360
      : isPerfectCompletion
        ? 330
        : 340;

    let description: string;

    if (isPerfectCompletion && data.totalSitesCount) {
      // Special message for 100% completion
      description = `This certifies that ${data.recipientName} has achieved PERFECT DATA COMPLIANCE\nwith 100% completion across ${data.totalSitesCount} minigrid site${data.totalSitesCount !== 1 ? 's' : ''}, successfully completing all ${data.totalFormsCount || 0} required forms,\ndemonstrating exceptional commitment to AMDA's data compliance standards.`;
    } else if (data.overallCompletionRate && data.totalSitesCount) {
      // Standard message with completion percentage
      description = `This certifies that ${data.recipientName} has achieved ${data.overallCompletionRate}% Data Compliance Completion\nacross ${data.totalSitesCount} minigrid site${data.totalSitesCount !== 1 ? 's' : ''}, completing ${data.completedFormsCount || 0} out of ${data.totalFormsCount || 0} required forms\nin accordance with AMDA's data compliance policies.`;
    } else {
      // Fallback message
      description = `This certifies that the above-named individual has completed the required data\ncompliance steps in accordance with AMDA's policies.`;
    }

    const lines = description.split('\n');
    let yPos = descriptionYStart;
    lines.forEach(line => {
      addText(line, pageWidth / 2, yPos, {
        fontSize: 14,
        fontType: 'body',
        color: '#374151',
        align: 'center',
      });
      yPos += 20;
    });

    // ============= BADGE SECTION =============
    const badgeX = pageWidth / 2;
    const badgeY = isPerfectCompletion ? 460 : data.organizationName ? 420 : 440;

    if (badgeBase64) {
      try {
        const imageFormat = badgeBase64.includes('data:image/png') ? 'PNG' : 'JPEG';

        // Larger badge for 100% completion
        const badgeSize = isPerfectCompletion ? 100 : 80;
        pdf.addImage(
          badgeBase64,
          imageFormat,
          badgeX - badgeSize / 2,
          badgeY - badgeSize / 2 + 10,
          badgeSize,
          badgeSize
        );

        // Add gold ring around badge for perfect completion
        if (isPerfectCompletion) {
          pdf.setDrawColor(251, 191, 36);
          pdf.setLineWidth(3);
          pdf.circle(badgeX, badgeY + 10, badgeSize / 2 + 5, 'S');
        }
      } catch (error) {
        console.warn('Failed to add badge image:', error);
      }
    }

    // ============= SIGNATURE SECTION =============
    const signatureY = pageHeight - 100;

    pdf.setDrawColor(
      isPerfectCompletion ? 251 : 156,
      isPerfectCompletion ? 191 : 163,
      isPerfectCompletion ? 36 : 175
    );
    pdf.setLineWidth(1);
    pdf.line(80, signatureY, 250, signatureY);

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

    pdf.line(540, signatureY, 710, signatureY);

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

    // ============= QR CODE =============
    if (qrCodeDataUrl) {
      try {
        pdf.addImage(qrCodeDataUrl, 'PNG', 60, 60, 80, 80);

        addText('Scan to Verify', 100, 150, {
          fontSize: 8,
          fontType: 'body',
          color: '#6b7280',
          align: 'center',
        });
      } catch (error) {
        console.warn('Failed to add QR code:', error);
      }
    }

    // ============= FOOTER =============
    const footerCompletedDate = new Date(data.completionDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

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

    // Center footer - show completion stats
    if (data.overallCompletionRate !== undefined) {
      const footerText = isPerfectCompletion
        ? `★ PERFECT COMPLETION: 100% across ${data.totalSitesCount || 0} sites (${data.totalFormsCount || 0}/${data.totalFormsCount || 0} forms) ★`
        : `Completion: ${data.overallCompletionRate}% across ${data.totalSitesCount || 0} sites (${data.completedFormsCount || 0}/${data.totalFormsCount || 0} forms)`;

      addText(footerText, pageWidth / 2, pageHeight - 22, {
        fontSize: 9,
        fontType: 'body',
        color: isPerfectCompletion ? '#b45309' : '#9ca3af',
        align: 'center',
      });
    }

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
      const mimeType =
        ext === '.png'
          ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : ext === '.gif'
              ? 'image/gif'
              : 'image/png';
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


  async getAllCertificates(): Promise<Certificate[]> {
    return await this.certificateRepository.findAll();
  }

  async deleteCertificate(id: string): Promise<boolean> {
    return await this.certificateRepository.delete(id);
  }
}
