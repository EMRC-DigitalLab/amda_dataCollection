// src/forms/routes/completion.routes.ts
import { adminMiddleware } from '@/shared/middleware/admin.middleware';
import { authMiddleware } from '@/shared/middleware/auth.middleware';
import { Router } from 'express';
import { DataSource } from 'typeorm';
import { CompletionController } from '../controllers/completion.controller';

export function createCompletionRoutes(dataSource: DataSource): Router {
  const router = Router();
  const completionController = new CompletionController(dataSource);

  /* ============================================================================ */
  /* Member Completion Tracking Routes                                            */
  /* ============================================================================ */

  // Get completion rates for all forms for a specific member
  // Example: GET /api/completion/members/member-123/rates?formType=FINANCE&status=PUBLISHED
  router.get(
    '/members/:memberId/rates',
    authMiddleware,
    completionController.getMemberCompletionRates
  );

  // Get detailed completion breakdown for a specific form and member
  // Example: GET /api/completion/members/member-123/forms/form-456
  router.get(
    '/members/:memberId/forms/:formId',
    authMiddleware,
    completionController.getMemberFormCompletion
  );

  // Get completion rates for all member's minigrid sites
  // Example: GET /api/completion/members/member-123/sites?formType=PROJECT&formId=form-456
  router.get(
    '/members/:memberId/sites',
    authMiddleware,
    completionController.getMemberSitesCompletion
  );

  // Get incomplete forms for a member (forms they haven't submitted yet)
  // Example: GET /api/completion/members/member-123/incomplete?formType=FINANCE&priority=high
  router.get(
    '/members/:memberId/incomplete',
    authMiddleware,
    completionController.getMemberIncompleteForm
  );

  // Get completion progress over time for a member
  // Example: GET /api/completion/members/member-123/trend?formType=FINANCE&period=30&groupBy=week
  router.get(
    '/members/:memberId/trend',
    authMiddleware,
    completionController.getMemberCompletionTrend
  );

  /* ============================================================================ */
  /* Site-specific Completion Routes                                              */
  /* ============================================================================ */

  // Get completion rate for a specific minigrid site
  // Example: GET /api/completion/sites/site-789?formId=form-456&formType=PROJECT
  router.get('/sites/:siteId', authMiddleware, completionController.getSiteCompletion);

  /* ============================================================================ */
  /* Overall Analytics Routes (Admin only)                                        */
  /* ============================================================================ */

  // Get overall completion statistics across all members and forms
  // Example: GET /api/completion/stats?formType=FINANCE&dateFrom=2024-01-01&dateTo=2024-12-31
  router.get(
    '/stats',
    authMiddleware,
    adminMiddleware,
    completionController.getOverallCompletionStats
  );

  // Get member completion leaderboard
  // Example: GET /api/completion/leaderboard?formType=PROJECT&limit=20
  router.get(
    '/leaderboard',
    authMiddleware,
    adminMiddleware,
    completionController.getMemberCompletionLeaderboard
  );

  // /* ============================================================================ */
  // /* Bulk Analytics Routes (Admin only)                                           */
  // /* ============================================================================ */

  // // Get completion analytics for multiple members
  // // Example: POST /api/completion/bulk/members with body: { memberIds: ["member-1", "member-2"] }
  // router.post(
  //   '/bulk/members',
  //   authMiddleware,
  //   adminMiddleware,
  //   async (req, res, next) => {
  //     try {
  //       const { memberIds, formType, status } = req.body;

  //       if (!Array.isArray(memberIds)) {
  //         return res.status(400).json({
  //           success: false,
  //           message: 'memberIds must be an array'
  //         });
  //       }

  //       const results = [];
  //       for (const memberId of memberIds) {
  //         try {
  //           const completion = await completionController.service.getMemberCompletionRates(
  //             memberId,
  //             formType,
  //             status
  //           );
  //           results.push(completion);
  //         } catch (error) {
  //           console.error(`Error getting completion for member ${memberId}:`, error);
  //           results.push({
  //             memberId,
  //             error: error.message,
  //             totalForms: 0,
  //             completedForms: 0,
  //             completionRate: 0,
  //             formBreakdown: []
  //           });
  //         }
  //       }

  //       res.json({
  //         success: true,
  //         data: results,
  //         message: 'Bulk member completion data retrieved successfully'
  //       });
  //     } catch (error) {
  //       res.status(400).json({
  //         success: false,
  //         message: error.message
  //       });
  //     }
  //   }
  // );

  // // Get completion analytics for multiple sites
  // // Example: POST /api/completion/bulk/sites with body: { siteIds: ["site-1", "site-2"] }
  // router.post(
  //   '/bulk/sites',
  //   authMiddleware,
  //   adminMiddleware,
  //   async (req, res, next) => {
  //     try {
  //       const { siteIds, formType, formId } = req.body;

  //       if (!Array.isArray(siteIds)) {
  //         return res.status(400).json({
  //           success: false,
  //           message: 'siteIds must be an array'
  //         });
  //       }

  //       const results = [];
  //       for (const siteId of siteIds) {
  //         try {
  //           const completion = await completionController.service.getSiteCompletion(
  //             siteId,
  //             formId,
  //             formType
  //           );
  //           results.push({
  //             siteId,
  //             ...completion
  //           });
  //         } catch (error) {
  //           console.error(`Error getting completion for site ${siteId}:`, error);
  //           results.push({
  //             siteId,
  //             error: error.message,
  //             totalForms: 0,
  //             completedForms: 0,
  //             completionRate: 0,
  //             formBreakdown: []
  //           });
  //         }
  //       }

  //       res.json({
  //         success: true,
  //         data: results,
  //         message: 'Bulk site completion data retrieved successfully'
  //       });
  //     } catch (error) {
  //       res.status(400).json({
  //         success: false,
  //         message: error.message
  //       });
  //     }
  //   }
  // );

  // /* ============================================================================ */
  // /* Export Routes (Admin only)                                                   */
  // /* ============================================================================ */

  // // Export member completion data as CSV
  // // Example: GET /api/completion/export/csv?formType=FINANCE&memberIds=member-1,member-2
  // router.get(
  //   '/export/csv',
  //   authMiddleware,
  //   adminMiddleware,
  //   async (req, res, next) => {
  //     try {
  //       const { formType, memberIds, status = 'PUBLISHED' } = req.query;

  //       // Get member completion data
  //       let members: string[] = [];
  //       if (memberIds) {
  //         members = (memberIds as string).split(',');
  //       } else {
  //         // Get all members with sites
  //         const allMembers = await completionController.service.getMembersWithSites();
  //         members = allMembers.map(m => m.id);
  //       }

  //       const completionData = [];
  //       for (const memberId of members) {
  //         const completion = await completionController.service.getMemberCompletionRates(
  //           memberId,
  //           formType as string,
  //           status as string
  //         );
  //         completionData.push(completion);
  //       }

  //       // Convert to CSV
  //       const csvHeader = 'Member ID,Member Name,Total Forms,Completed Forms,Completion Rate (%),Form Details\n';
  //       let csvContent = csvHeader;

  //       for (const member of completionData) {
  //         const formDetails = member.formBreakdown
  //           .map(f => `${f.formTitle}:${f.completionRate}%`)
  //           .join(';');

  //         csvContent += `${member.memberId},"${member.memberName || 'Unknown'}",${member.totalForms},${member.completedForms},${member.completionRate},"${formDetails}"\n`;
  //       }

  //       res.setHeader('Content-Type', 'text/csv');
  //       res.setHeader('Content-Disposition', `attachment; filename="form_completion_report_${new Date().toISOString().split('T')[0]}.csv"`);
  //       res.send(csvContent);

  //     } catch (error) {
  //       res.status(400).json({
  //         success: false,
  //         message: error.message
  //       });
  //     }
  //   }
  // );

  // /* ============================================================================ */
  // /* Real-time Analytics Routes (Admin only)                                      */
  // /* ============================================================================ */

  // // Get real-time completion statistics (cached for performance)
  // router.get(
  //   '/realtime/stats',
  //   authMiddleware,
  //   adminMiddleware,
  //   async (req, res, next) => {
  //     try {
  //       // This would typically be cached using Redis or similar
  //       const stats = await completionController.service.getOverallCompletionStats();

  //       res.json({
  //         success: true,
  //         data: {
  //           ...stats,
  //           lastUpdated: new Date().toISOString(),
  //           cacheExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
  //         },
  //         message: 'Real-time completion statistics retrieved successfully'
  //       });
  //     } catch (error) {
  //       res.status(400).json({
  //         success: false,
  //         message: error.message
  //       });
  //     }
  //   }
  // );

  // // Get completion alerts (members/forms with low completion rates)
  // router.get(
  //   '/alerts',
  //   authMiddleware,
  //   adminMiddleware,
  //   async (req, res, next) => {
  //     try {
  //       const { threshold = 50, limit = 10 } = req.query;

  //       // Get members with low completion rates
  //       const leaderboard = await completionController.service.getMemberCompletionLeaderboard();
  //       const lowPerformers = leaderboard
  //         .filter(member => member.completionRate < Number(threshold))
  //         .slice(0, Number(limit));

  //       const alerts = lowPerformers.map(member => ({
  //         type: 'low_completion',
  //         severity: member.completionRate < 25 ? 'high' : member.completionRate < 50 ? 'medium' : 'low',
  //         memberId: member.memberId,
  //         memberName: member.memberName,
  //         completionRate: member.completionRate,
  //         message: `Member has low completion rate: ${member.completionRate}%`,
  //         actionRequired: member.completionRate < 25 ? 'immediate_attention' : 'follow_up',
  //         createdAt: new Date().toISOString()
  //       }));

  //       res.json({
  //         success: true,
  //         data: {
  //           alerts,
  //           summary: {
  //             total: alerts.length,
  //             high: alerts.filter(a => a.severity === 'high').length,
  //             medium: alerts.filter(a => a.severity === 'medium').length,
  //             low: alerts.filter(a => a.severity === 'low').length,
  //           }
  //         },
  //         message: 'Completion alerts retrieved successfully'
  //       });
  //     } catch (error) {
  //       res.status(400).json({
  //         success: false,
  //         message: error.message
  //       });
  //     }
  //   }
  // );

  return router;
}
