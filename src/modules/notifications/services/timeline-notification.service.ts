// @ts-nocheck
import { DataSource, Repository } from 'typeorm';
import { Form } from '../../../database/entities/form.entity';
import { User } from '../../../database/entities/user.entity';

import { Category } from '../../../database/entities/category.entity';
import { NotificationChannelType } from '../../../database/entities/notification.entity';
import { Question } from '../../../database/entities/question.entity';
import { NotificationService } from './notification.service';

export interface TimelineEvent {
  id: string;
  type:
    | 'form_created'
    | 'form_updated'
    | 'form_deleted'
    | 'question_added'
    | 'question_updated'
    | 'question_deleted'
    | 'category_added'
    | 'category_updated'
    | 'category_deleted';
  title: string;
  description: string;
  formId?: string;
  formTitle?: string;
  questionId?: string;
  questionText?: string;
  categoryId?: string;
  categoryName?: string;
  adminId: string;
  adminName: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface TimelineNotificationData {
  eventType: string;
  title: string;
  message: string;
  formTitle?: string;
  changes: Record<string, any>;
  adminName: string;
}

export class TimelineNotificationService {
  private userRepository: Repository<User>;
  private formRepository: Repository<Form>;
  private questionRepository: Repository<Question>;
  private categoryRepository: Repository<Category>;
  private notificationService: NotificationService;

  constructor(dataSource: DataSource, notificationService?: NotificationService) {
    this.userRepository = dataSource.getRepository(User);
    this.formRepository = dataSource.getRepository(Form);
    this.questionRepository = dataSource.getRepository(Question);
    this.categoryRepository = dataSource.getRepository(Category);
    this.notificationService = notificationService || new NotificationService();
  }

  // Form Events
  async notifyFormCreated(formId: string, adminId: string, changes: any = {}): Promise<void> {
    const form = await this.formRepository.findOne({
      where: { id: formId },
      relations: ['admin', 'formType'],
    });

    if (!form) return;

    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin) return;

    const event: TimelineEvent = {
      id: this.generateEventId(),
      type: 'form_created',
      title: 'New Form Created',
      description: `A new form "${form.title}" has been created`,
      formId: form.id,
      formTitle: form.title,
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`,
      timestamp: new Date(),
      metadata: {
        formType: form.formType?.name,
        formSlug: form.slug,
        changes,
      },
    };

    await this.createTimelineNotification(event);
    await this.sendNotificationToAllUsers(event);
  }

  async notifyFormUpdated(formId: string, adminId: string, changes: any = {}): Promise<void> {
    const form = await this.formRepository.findOne({
      where: { id: formId },
      relations: ['admin', 'formType'],
    });

    if (!form) return;

    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin) return;

    const changesList = Object.keys(changes).join(', ');

    const event: TimelineEvent = {
      id: this.generateEventId(),
      type: 'form_updated',
      title: 'Form Updated',
      description: `Form "${form.title}" has been updated. Changes: ${changesList}`,
      formId: form.id,
      formTitle: form.title,
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`,
      timestamp: new Date(),
      metadata: {
        formType: form.formType?.name,
        formSlug: form.slug,
        changes,
        changesList,
      },
    };

    await this.createTimelineNotification(event);
    await this.sendNotificationToAllUsers(event);
  }

  async notifyFormDeleted(formTitle: string, adminId: string, metadata: any = {}): Promise<void> {
    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin) return;

    const event: TimelineEvent = {
      id: this.generateEventId(),
      type: 'form_deleted',
      title: 'Form Deleted',
      description: `Form "${formTitle}" has been permanently deleted`,
      formTitle,
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`,
      timestamp: new Date(),
      metadata,
    };

    await this.createTimelineNotification(event);
    await this.sendNotificationToAllUsers(event);
  }

  // Question Events
  async notifyQuestionAdded(questionId: string, adminId: string, changes: any = {}): Promise<void> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['form', 'category'],
    });

    if (!question) return;

    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin) return;

    const event: TimelineEvent = {
      id: this.generateEventId(),
      type: 'question_added',
      title: 'New Question Added',
      description: `A new question "${question.questionText}" has been added to form "${question.form?.title}"`,
      formId: question.form?.id,
      formTitle: question.form?.title,
      questionId: question.id,
      questionText: question.questionText,
      categoryId: question.category?.id,
      categoryName: question.category?.name,
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`,
      timestamp: new Date(),
      metadata: {
        questionType: question.questionType,
        isRequired: question.isRequired,
        changes,
      },
    };

    await this.createTimelineNotification(event);
    await this.sendNotificationToAllUsers(event);
  }

  async notifyQuestionUpdated(
    questionId: string,
    adminId: string,
    changes: any = {}
  ): Promise<void> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['form', 'category'],
    });

    if (!question) return;

    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin) return;

    const changesList = Object.keys(changes).join(', ');

    const event: TimelineEvent = {
      id: this.generateEventId(),
      type: 'question_updated',
      title: 'Question Updated',
      description: `Question "${question.questionText}" in form "${question.form?.title}" has been updated. Changes: ${changesList}`,
      formId: question.form?.id,
      formTitle: question.form?.title,
      questionId: question.id,
      questionText: question.questionText,
      categoryId: question.category?.id,
      categoryName: question.category?.name,
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`,
      timestamp: new Date(),
      metadata: {
        questionType: question.questionType,
        isRequired: question.isRequired,
        changes,
        changesList,
      },
    };

    await this.createTimelineNotification(event);
    await this.sendNotificationToAllUsers(event);
  }

  async notifyQuestionDeleted(
    questionText: string,
    formTitle: string,
    adminId: string,
    metadata: any = {}
  ): Promise<void> {
    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin) return;

    const event: TimelineEvent = {
      id: this.generateEventId(),
      type: 'question_deleted',
      title: 'Question Deleted',
      description: `Question "${questionText}" has been removed from form "${formTitle}"`,
      formTitle,
      questionText,
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`,
      timestamp: new Date(),
      metadata,
    };

    await this.createTimelineNotification(event);
    await this.sendNotificationToAllUsers(event);
  }

  // Category Events
  async notifyCategoryAdded(categoryId: string, adminId: string, changes: any = {}): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['form'],
    });

    if (!category) return;

    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin) return;

    const event: TimelineEvent = {
      id: this.generateEventId(),
      type: 'category_added',
      title: 'New Category Added',
      description: `A new category "${category.name}" has been added to form "${category.form?.title}"`,
      formId: category.form?.id,
      formTitle: category.form?.title,
      categoryId: category.id,
      categoryName: category.name,
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`,
      timestamp: new Date(),
      metadata: {
        description: category.description,
        sortOrder: category.sortOrder,
        changes,
      },
    };

    await this.createTimelineNotification(event);
    await this.sendNotificationToAllUsers(event);
  }

  async notifyCategoryUpdated(
    categoryId: string,
    adminId: string,
    changes: any = {}
  ): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['form'],
    });

    if (!category) return;

    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin) return;

    const changesList = Object.keys(changes).join(', ');

    const event: TimelineEvent = {
      id: this.generateEventId(),
      type: 'category_updated',
      title: 'Category Updated',
      description: `Category "${category.name}" in form "${category.form?.title}" has been updated. Changes: ${changesList}`,
      formId: category.form?.id,
      formTitle: category.form?.title,
      categoryId: category.id,
      categoryName: category.name,
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`,
      timestamp: new Date(),
      metadata: {
        description: category.description,
        sortOrder: category.sortOrder,
        changes,
        changesList,
      },
    };

    await this.createTimelineNotification(event);
    await this.sendNotificationToAllUsers(event);
  }

  async notifyCategoryDeleted(
    categoryName: string,
    formTitle: string,
    adminId: string,
    metadata: any = {}
  ): Promise<void> {
    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin) return;

    const event: TimelineEvent = {
      id: this.generateEventId(),
      type: 'category_deleted',
      title: 'Category Deleted',
      description: `Category "${categoryName}" has been removed from form "${formTitle}"`,
      formTitle,
      categoryName,
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`,
      timestamp: new Date(),
      metadata,
    };

    await this.createTimelineNotification(event);
    await this.sendNotificationToAllUsers(event);
  }

  // Timeline Management
  async getTimelineEvents(
    filters: {
      formId?: string;
      adminId?: string;
      type?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<TimelineEvent[]> {
    // This would typically be stored in a dedicated timeline table
    // For now, we'll fetch from notifications with timeline metadata

    const { limit = 50, offset = 0 } = filters;

    // Mock timeline events - in a real implementation, you'd query a timeline table
    const events: TimelineEvent[] = [
      {
        id: '1',
        type: 'form_updated',
        title: 'Form Updated',
        description:
          'BAM 2024 Data Collection Template has been updated. Changes: title, description',
        formId: 'form-1',
        formTitle: 'BAM 2024 Data Collection Template',
        adminId: 'admin-1',
        adminName: 'John Admin',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        metadata: {
          changes: { title: 'Updated title', description: 'Updated description' },
          changesList: 'title, description',
        },
      },
      {
        id: '2',
        type: 'question_added',
        title: 'New Question Added',
        description:
          'A new question "What is your organization\'s annual revenue?" has been added to form "BAM 2024 Data Collection Template"',
        formId: 'form-1',
        formTitle: 'BAM 2024 Data Collection Template',
        questionId: 'question-1',
        questionText: "What is your organization's annual revenue?",
        adminId: 'admin-1',
        adminName: 'John Admin',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        metadata: {
          questionType: 'MULTIPLE_CHOICE',
          isRequired: true,
        },
      },
      {
        id: '3',
        type: 'category_updated',
        title: 'Category Updated',
        description:
          'Category "Financial Information" in form "BAM 2024 Data Collection Template" has been updated. Changes: description',
        formId: 'form-1',
        formTitle: 'BAM 2024 Data Collection Template',
        categoryId: 'category-1',
        categoryName: 'Financial Information',
        adminId: 'admin-2',
        adminName: 'Jane Admin',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        metadata: {
          description: 'Updated category description',
          changes: { description: 'Updated category description' },
          changesList: 'description',
        },
      },
    ];

    return events.slice(offset, offset + limit);
  }

  // Private methods
  private async createTimelineNotification(event: TimelineEvent): Promise<void> {
    // Store timeline event in database - you might want a dedicated timeline table
    // For now, we'll use the notification metadata to store timeline events

    await this.notificationService.createNotification({
      title: event.title,
      message: event.description,
      type: 'timeline_event',
      channels: [NotificationChannelType.IN_APP],
      priority: 'medium',
      metadata: {
        timelineEvent: event,
        eventType: event.type,
        formId: event.formId,
        formTitle: event.formTitle,
      },
    });
  }

  private async sendNotificationToAllUsers(event: TimelineEvent): Promise<void> {
    // Get all active users to notify them of form changes
    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :active', { active: true })
      .select(['user.id', 'user.email', 'user.firstName', 'user.lastName'])
      .getMany();

    const notificationPromises = users.map(user =>
      this.notificationService.createNotification({
        userId: user.id,
        title: event.title,
        message: this.generateUserNotificationMessage(event),
        type: 'form_update',
        channels: [NotificationChannelType.EMAIL, NotificationChannelType.IN_APP],
        priority: this.getNotificationPriority(event.type),
        templateId: this.getTemplateId(event.type),
        templateData: this.generateTemplateData(event, user),
        metadata: {
          timelineEvent: event,
          eventType: event.type,
          formId: event.formId,
        },
      })
    );

    await Promise.allSettled(notificationPromises);
  }

  private generateUserNotificationMessage(event: TimelineEvent): string {
    switch (event.type) {
      case 'form_created':
        return `A new form "${event.formTitle}" has been created by ${event.adminName}. You can now access and fill out this form.`;

      case 'form_updated':
        return `The form "${event.formTitle}" has been updated by ${event.adminName}. Please review the changes and update your submission if necessary.`;

      case 'question_added':
        return `A new question has been added to the form "${event.formTitle}" by ${event.adminName}. Please complete the new question.`;

      case 'question_updated':
        return `A question in form "${event.formTitle}" has been updated by ${event.adminName}. Please review and update your answer if needed.`;

      case 'category_added':
        return `A new section "${event.categoryName}" has been added to form "${event.formTitle}" by ${event.adminName}.`;

      case 'category_updated':
        return `The section "${event.categoryName}" in form "${event.formTitle}" has been updated by ${event.adminName}.`;

      default:
        return `Form "${event.formTitle}" has been modified by ${event.adminName}. Please check for any required updates.`;
    }
  }

  private getNotificationPriority(eventType: string): 'low' | 'medium' | 'high' | 'urgent' {
    switch (eventType) {
      case 'form_created':
      case 'question_added':
        return 'high';
      case 'form_updated':
      case 'question_updated':
        return 'medium';
      case 'form_deleted':
        return 'urgent';
      default:
        return 'medium';
    }
  }

  private getTemplateId(eventType: string): string {
    switch (eventType) {
      case 'form_created':
        return 'form_created_notification';
      case 'form_updated':
        return 'form_updated_notification';
      case 'question_added':
        return 'question_added_notification';
      case 'question_updated':
        return 'question_updated_notification';
      default:
        return 'general_form_notification';
    }
  }

  private generateTemplateData(event: TimelineEvent, user: any): Record<string, any> {
    return {
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      adminName: event.adminName,
      formTitle: event.formTitle,
      formId: event.formId,
      questionText: event.questionText,
      categoryName: event.categoryName,
      eventDescription: event.description,
      timestamp: event.timestamp.toISOString(),
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard/forms`,
      formUrl: event.formId ? `${process.env.FRONTEND_URL}/dashboard/forms/${event.formId}` : null,
    };
  }

  private generateEventId(): string {
    return `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
