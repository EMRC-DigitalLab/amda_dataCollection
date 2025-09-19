// src/modules/notifications/services/template.service.ts
import { Repository } from 'typeorm';
import { AppDataSource } from '@/config/database';
import { NotificationTemplate } from '@/database/entities/notification-template.entity';
import { NotificationChannel } from '@/database/entities/notification.entity';
import { TemplateRenderRequest, TemplateRenderResult } from '../interfaces/notification.interface';
import { logger } from '@/shared/utils/logger';

export class TemplateService {
  private templateRepository: Repository<NotificationTemplate>;

  constructor() {
    this.templateRepository = AppDataSource.getRepository(NotificationTemplate);
  }

  /**
   * Render a template with provided data
   */
  async renderTemplate(request: TemplateRenderRequest): Promise<TemplateRenderResult> {
    try {
      let template: NotificationTemplate | null = null;

      if (request.templateId) {
        template = await this.templateRepository.findOne({
          where: { id: request.templateId, isActive: true },
        });
      } else if (request.templateName) {
        template = await this.templateRepository.findOne({
          where: {
            name: request.templateName,
            channel: request.channel,
            isActive: true,
          },
        });
      }

      if (!template) {
        throw new Error(`Template not found: ${request.templateId || request.templateName}`);
      }

      // Merge default data with provided data
      const templateData = {
        ...template.defaultData,
        ...request.data,
        recipientId: request.recipientId,
      };

      // Render subject and content
      const subject = this.renderString(template.subject, templateData);
      const content = this.renderString(template.content, templateData);
      const htmlContent = template.htmlContent
        ? this.renderString(template.htmlContent, templateData)
        : undefined;

      return { subject, content, htmlContent };
    } catch (error) {
      logger.error('Template rendering failed:', error);
      throw error;
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(templateData: {
    name: string;
    type: string;
    channel: NotificationChannel;
    subject: string;
    content: string;
    htmlContent?: string;
    defaultData?: Record<string, any>;
    variables?: string[];
  }): Promise<NotificationTemplate> {
    const template = this.templateRepository.create(templateData);
    return await this.templateRepository.save(template);
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    id: string,
    updates: Partial<NotificationTemplate>
  ): Promise<NotificationTemplate> {
    await this.templateRepository.update(id, updates);
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }
    return template;
  }

  /**
   * Get all templates
   */
  async getTemplates(filters?: {
    type?: string;
    channel?: NotificationChannel;
    isActive?: boolean;
  }): Promise<NotificationTemplate[]> {
    return await this.templateRepository.find({
      where: filters,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get template by name and channel
   */
  async getTemplate(
    name: string,
    channel: NotificationChannel
  ): Promise<NotificationTemplate | null> {
    return await this.templateRepository.findOne({
      where: { name, channel, isActive: true },
    });
  }

  /**
   * Simple template rendering using string replacement
   * In production, consider using a more robust templating engine like Handlebars
   */
  private renderString(template: string, data: Record<string, any>): string {
    let rendered = template;

    // Replace {{variable}} patterns
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value || ''));
    });

    // Handle conditional blocks {{#if variable}}...{{/if}}
    rendered = rendered.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, variable, content) => {
      return data[variable] ? content : '';
    });

    // Handle loops {{#each array}}...{{/each}}
    rendered = rendered.replace(
      /{{#each\s+(\w+)}}(.*?){{\/each}}/gs,
      (match, variable, content) => {
        const array = data[variable];
        if (Array.isArray(array)) {
          return array
            .map(item => {
              let itemContent = content;
              if (typeof item === 'object') {
                Object.entries(item).forEach(([itemKey, itemValue]) => {
                  const itemRegex = new RegExp(`{{\\s*${itemKey}\\s*}}`, 'g');
                  itemContent = itemContent.replace(itemRegex, String(itemValue || ''));
                });
              } else {
                itemContent = itemContent.replace(/{{this}}/g, String(item));
              }
              return itemContent;
            })
            .join('');
        }
        return '';
      }
    );

    return rendered;
  }
}
