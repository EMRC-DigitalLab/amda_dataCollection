// @ts-nocheck
import { NextFunction, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { ResponseHelper } from '../../../shared/utils/response';
import { CompletionService } from '../services/completion.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: any;
  };
}

export class CompletionController {
  private service: CompletionService;

  constructor(private readonly dataSource: DataSource) {
    this.service = new CompletionService(dataSource);
  }

  /* ============================================================================ */
  /* Member Completion Tracking                                                   */
  /* ============================================================================ */

  // Get completion rates for all forms for a specific member
  getMemberCompletionRates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { memberId } = req.params;
      const { formType, status = 'PUBLISHED' } = req.query;

      const completionData = await this.service.getMemberCompletionRates(
        memberId,
        formType as string,
        status as string
      );

      res.json({
        success: true,
        data: completionData,
        message: 'Member completion rates retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  // Get detailed completion breakdown for a specific form and member
  getMemberFormCompletion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { memberId, formId } = req.params;

      const completion = await this.service.getMemberFormCompletion(memberId, formId);

      res.json({
        success: true,
        data: completion,
        message: 'Member form completion details retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  // Get completion rates for all member's minigrid sites
  getMemberSitesCompletion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { memberId } = req.params;
      const { formType, formId } = req.query;

      const sitesCompletion = await this.service.getMemberSitesCompletion(
        memberId,
        formId as string,
        formType as string
      );

      res.json({
        success: true,
        data: sitesCompletion,
        message: 'Member sites completion rates retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /* ============================================================================ */
  /* Site-specific Completion                                                     */
  /* ============================================================================ */

  // Get completion rate for a specific minigrid site
  getSiteCompletion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { siteId } = req.params;
      const { formId, formType } = req.query;

      const siteCompletion = await this.service.getSiteCompletion(
        siteId,
        formId as string,
        formType as string
      );

      res.json({
        success: true,
        data: siteCompletion,
        message: 'Site completion rates retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /* ============================================================================ */
  /* Overall Analytics                                                            */
  /* ============================================================================ */

  // Get overall completion statistics across all members and forms
  getOverallCompletionStats = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { formType, dateFrom, dateTo } = req.query;

      const stats = await this.service.getOverallCompletionStats({
        formType: formType as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      });

      res.json({
        success: true,
        data: stats,
        message: 'Overall completion statistics retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  // Get member completion leaderboard
  getMemberCompletionLeaderboard = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { formType, limit = 20 } = req.query;

      const leaderboard = await this.service.getMemberCompletionLeaderboard(
        formType as string,
        Number(limit)
      );

      res.json({
        success: true,
        data: leaderboard,
        message: 'Member completion leaderboard retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /* ============================================================================ */
  /* Completion Progress Tracking                                                 */
  /* ============================================================================ */

  // Get incomplete forms for a member (forms they haven't submitted yet)
  getMemberIncompleteForm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { memberId } = req.params;
      const { formType, priority } = req.query;

      const incompleteForms = await this.service.getMemberIncompleteForms(
        memberId,
        formType as string,
        priority as string
      );

      res.json({
        success: true,
        data: incompleteForms,
        message: 'Incomplete forms retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  // Get completion progress over time for a member
  getMemberCompletionTrend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { memberId } = req.params;
      const { formType, period = '30', groupBy = 'week' } = req.query;

      const trend = await this.service.getMemberCompletionTrend(
        memberId,
        formType as string,
        Number(period),
        groupBy as 'day' | 'week' | 'month'
      );

      res.json({
        success: true,
        data: trend,
        message: 'Member completion trend retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };
}
