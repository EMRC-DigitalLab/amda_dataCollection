import { Router } from 'express';
import { adminOnly, authMiddleware } from '../../../shared/middleware/auth.middleware';
import { AuditLogController } from '../controllers/audit-log.controller';

export class AuditLogRoutes {
  public router: Router;
  private controller: AuditLogController;

  constructor() {
    this.router = Router();
    this.controller = new AuditLogController();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // All routes require authentication
    this.router.use(authMiddleware);
    this.router.use(adminOnly);

    this.router.get('/', this.controller.getAuditLogs);
    this.router.get('/stats', this.controller.getAuditStats);
  }
}

export const createAuditLogRoutes = () => new AuditLogRoutes().router;
