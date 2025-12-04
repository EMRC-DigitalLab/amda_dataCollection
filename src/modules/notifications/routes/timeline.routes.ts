import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { adminMiddleware } from '../../../shared/middleware/admin.middleware';
import { TimelineController } from '../controllers/timeline.controller';

export function createTimelineRoutes(dataSource: DataSource): Router {
  const router = Router();
  const timelineController = new TimelineController();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  /**
   * @route   GET /api/notifications/timeline
   * @desc    Get timeline events for form changes
   * @query   formId (optional) - Filter by form ID
   * @query   adminId (optional) - Filter by admin ID
   * @query   type (optional) - Filter by event type
   * @query   dateFrom (optional) - Start date filter
   * @query   dateTo (optional) - End date filter
   * @query   limit (optional) - Number of events to return (default 50)
   * @query   offset (optional) - Number of events to skip (default 0)
   * @access  Authenticated users
   */
  router.get(
    '/',
    timelineController.getTimelineEvents.bind(timelineController)
  );

  // Admin-only notification routes
  /**
   * @route   POST /api/notifications/timeline/form-created
   * @desc    Send notifications when a form is created
   * @body    formId (required) - ID of the created form
   * @body    changes (optional) - Object containing form creation details
   * @access  Admin users only
   */
  router.post(
    '/form-created',
    adminMiddleware,
    timelineController.notifyFormCreated.bind(timelineController)
  );

  /**
   * @route   POST /api/notifications/timeline/form-updated
   * @desc    Send notifications when a form is updated
   * @body    formId (required) - ID of the updated form
   * @body    changes (required) - Object containing the changes made
   * @access  Admin users only
   */
  router.post(
    '/form-updated',
    adminMiddleware,
    timelineController.notifyFormUpdated.bind(timelineController)
  );

  /**
   * @route   POST /api/notifications/timeline/form-deleted
   * @desc    Send notifications when a form is deleted
   * @body    formTitle (required) - Title of the deleted form
   * @body    metadata (optional) - Additional metadata about the deletion
   * @access  Admin users only
   */
  router.post(
    '/form-deleted',
    adminMiddleware,
    timelineController.notifyFormDeleted.bind(timelineController)
  );

  /**
   * @route   POST /api/notifications/timeline/question-added
   * @desc    Send notifications when a question is added to a form
   * @body    questionId (required) - ID of the added question
   * @body    changes (optional) - Object containing question creation details
   * @access  Admin users only
   */
  router.post(
    '/question-added',
    adminMiddleware,
    timelineController.notifyQuestionAdded.bind(timelineController)
  );

  /**
   * @route   POST /api/notifications/timeline/question-updated
   * @desc    Send notifications when a question is updated
   * @body    questionId (required) - ID of the updated question
   * @body    changes (required) - Object containing the changes made
   * @access  Admin users only
   */
  router.post(
    '/question-updated',
    adminMiddleware,
    timelineController.notifyQuestionUpdated.bind(timelineController)
  );

  /**
   * @route   POST /api/notifications/timeline/question-deleted
   * @desc    Send notifications when a question is deleted
   * @body    questionText (required) - Text of the deleted question
   * @body    formTitle (required) - Title of the form the question belonged to
   * @body    metadata (optional) - Additional metadata about the deletion
   * @access  Admin users only
   */
  router.post(
    '/question-deleted',
    adminMiddleware,
    timelineController.notifyQuestionDeleted.bind(timelineController)
  );

  /**
   * @route   POST /api/notifications/timeline/category-added
   * @desc    Send notifications when a category is added to a form
   * @body    categoryId (required) - ID of the added category
   * @body    changes (optional) - Object containing category creation details
   * @access  Admin users only
   */
  router.post(
    '/category-added',
    adminMiddleware,
    timelineController.notifyCategoryAdded.bind(timelineController)
  );

  /**
   * @route   POST /api/notifications/timeline/category-updated
   * @desc    Send notifications when a category is updated
   * @body    categoryId (required) - ID of the updated category
   * @body    changes (required) - Object containing the changes made
   * @access  Admin users only
   */
  router.post(
    '/category-updated',
    adminMiddleware,
    timelineController.notifyCategoryUpdated.bind(timelineController)
  );

  /**
   * @route   POST /api/notifications/timeline/category-deleted
   * @desc    Send notifications when a category is deleted
   * @body    categoryName (required) - Name of the deleted category
   * @body    formTitle (required) - Title of the form the category belonged to
   * @body    metadata (optional) - Additional metadata about the deletion
   * @access  Admin users only
   */
  router.post(
    '/category-deleted',
    adminMiddleware,
    timelineController.notifyCategoryDeleted.bind(timelineController)
  );

  return router;
}