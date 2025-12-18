// @ts-nocheck
import { Request, Response } from 'express';
import { AppDataSource } from '../../../config/database';
import { TimelineNotificationService } from '../services/timeline-notification.service';
import { NotificationService } from '../services/notification.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: any;
  };
}

export class TimelineController {
  private timelineService: TimelineNotificationService;

  constructor() {
    const notificationService = new NotificationService();
    this.timelineService = new TimelineNotificationService(AppDataSource, notificationService);
  }

  /**
   * Get timeline events
   * GET /api/notifications/timeline
   */
  async getTimelineEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        formId,
        adminId,
        type,
        dateFrom,
        dateTo,
        limit = '50',
        offset = '0',
      } = req.query as Record<string, string>;

      const filters = {
        formId,
        adminId,
        type,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        limit: parseInt(limit),
        offset: parseInt(offset),
      };

      const events = await this.timelineService.getTimelineEvents(filters);

      res.status(200).json({
        success: true,
        message: 'Timeline events retrieved successfully',
        data: {
          events,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: events.length,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching timeline events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve timeline events',
        error: error.message,
      });
    }
  }

  /**
   * Notify form created
   * POST /api/notifications/timeline/form-created
   */
  async notifyFormCreated(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { formId, changes = {} } = req.body;
      const adminId = req.user?.id;

      if (!formId || !adminId) {
        res.status(400).json({
          success: false,
          message: 'Form ID and admin ID are required',
        });
        return;
      }

      await this.timelineService.notifyFormCreated(formId, adminId, changes);

      res.status(200).json({
        success: true,
        message: 'Form creation notification sent successfully',
      });
    } catch (error) {
      console.error('Error sending form creation notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send form creation notification',
        error: error.message,
      });
    }
  }

  /**
   * Notify form updated
   * POST /api/notifications/timeline/form-updated
   */
  async notifyFormUpdated(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { formId, changes = {} } = req.body;
      const adminId = req.user?.id;

      if (!formId || !adminId) {
        res.status(400).json({
          success: false,
          message: 'Form ID and admin ID are required',
        });
        return;
      }

      await this.timelineService.notifyFormUpdated(formId, adminId, changes);

      res.status(200).json({
        success: true,
        message: 'Form update notification sent successfully',
      });
    } catch (error) {
      console.error('Error sending form update notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send form update notification',
        error: error.message,
      });
    }
  }

  /**
   * Notify form deleted
   * POST /api/notifications/timeline/form-deleted
   */
  async notifyFormDeleted(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { formTitle, metadata = {} } = req.body;
      const adminId = req.user?.id;

      if (!formTitle || !adminId) {
        res.status(400).json({
          success: false,
          message: 'Form title and admin ID are required',
        });
        return;
      }

      await this.timelineService.notifyFormDeleted(formTitle, adminId, metadata);

      res.status(200).json({
        success: true,
        message: 'Form deletion notification sent successfully',
      });
    } catch (error) {
      console.error('Error sending form deletion notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send form deletion notification',
        error: error.message,
      });
    }
  }

  /**
   * Notify question added
   * POST /api/notifications/timeline/question-added
   */
  async notifyQuestionAdded(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { questionId, changes = {} } = req.body;
      const adminId = req.user?.id;

      if (!questionId || !adminId) {
        res.status(400).json({
          success: false,
          message: 'Question ID and admin ID are required',
        });
        return;
      }

      await this.timelineService.notifyQuestionAdded(questionId, adminId, changes);

      res.status(200).json({
        success: true,
        message: 'Question addition notification sent successfully',
      });
    } catch (error) {
      console.error('Error sending question addition notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send question addition notification',
        error: error.message,
      });
    }
  }

  /**
   * Notify question updated
   * POST /api/notifications/timeline/question-updated
   */
  async notifyQuestionUpdated(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { questionId, changes = {} } = req.body;
      const adminId = req.user?.id;

      if (!questionId || !adminId) {
        res.status(400).json({
          success: false,
          message: 'Question ID and admin ID are required',
        });
        return;
      }

      await this.timelineService.notifyQuestionUpdated(questionId, adminId, changes);

      res.status(200).json({
        success: true,
        message: 'Question update notification sent successfully',
      });
    } catch (error) {
      console.error('Error sending question update notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send question update notification',
        error: error.message,
      });
    }
  }

  /**
   * Notify question deleted
   * POST /api/notifications/timeline/question-deleted
   */
  async notifyQuestionDeleted(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { questionText, formTitle, metadata = {} } = req.body;
      const adminId = req.user?.id;

      if (!questionText || !formTitle || !adminId) {
        res.status(400).json({
          success: false,
          message: 'Question text, form title, and admin ID are required',
        });
        return;
      }

      await this.timelineService.notifyQuestionDeleted(questionText, formTitle, adminId, metadata);

      res.status(200).json({
        success: true,
        message: 'Question deletion notification sent successfully',
      });
    } catch (error) {
      console.error('Error sending question deletion notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send question deletion notification',
        error: error.message,
      });
    }
  }

  /**
   * Notify category added
   * POST /api/notifications/timeline/category-added
   */
  async notifyCategoryAdded(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { categoryId, changes = {} } = req.body;
      const adminId = req.user?.id;

      if (!categoryId || !adminId) {
        res.status(400).json({
          success: false,
          message: 'Category ID and admin ID are required',
        });
        return;
      }

      await this.timelineService.notifyCategoryAdded(categoryId, adminId, changes);

      res.status(200).json({
        success: true,
        message: 'Category addition notification sent successfully',
      });
    } catch (error) {
      console.error('Error sending category addition notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send category addition notification',
        error: error.message,
      });
    }
  }

  /**
   * Notify category updated
   * POST /api/notifications/timeline/category-updated
   */
  async notifyCategoryUpdated(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { categoryId, changes = {} } = req.body;
      const adminId = req.user?.id;

      if (!categoryId || !adminId) {
        res.status(400).json({
          success: false,
          message: 'Category ID and admin ID are required',
        });
        return;
      }

      await this.timelineService.notifyCategoryUpdated(categoryId, adminId, changes);

      res.status(200).json({
        success: true,
        message: 'Category update notification sent successfully',
      });
    } catch (error) {
      console.error('Error sending category update notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send category update notification',
        error: error.message,
      });
    }
  }

  /**
   * Notify category deleted
   * POST /api/notifications/timeline/category-deleted
   */
  async notifyCategoryDeleted(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { categoryName, formTitle, metadata = {} } = req.body;
      const adminId = req.user?.id;

      if (!categoryName || !formTitle || !adminId) {
        res.status(400).json({
          success: false,
          message: 'Category name, form title, and admin ID are required',
        });
        return;
      }

      await this.timelineService.notifyCategoryDeleted(categoryName, formTitle, adminId, metadata);

      res.status(200).json({
        success: true,
        message: 'Category deletion notification sent successfully',
      });
    } catch (error) {
      console.error('Error sending category deletion notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send category deletion notification',
        error: error.message,
      });
    }
  }
}
