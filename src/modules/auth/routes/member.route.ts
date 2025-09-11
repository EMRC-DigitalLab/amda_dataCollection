import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { MemberController } from '../controllers/member.controller';
import { MemberService } from '../services/member.service';

// Dependency injection setup
const createMemberRoutes = (
 dataSource:DataSource
): Router => {
  const router = Router();
  const memberController = new MemberController(dataSource);

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // GET routes
  router.get('/', memberController.getAllMembers);
  router.get('/search', memberController.searchMembers);
  router.get('/filters', memberController.getMembersWithFilters);
  router.get('/status/:status', memberController.getMembersByStatus);
  router.get('/country/:country', memberController.getMembersByCountry);
  router.get('/user/:userId', memberController.getMemberByUserId);
  router.get('/email/:email', memberController.getMemberByEmail);
  router.get('/:id', memberController.getMemberById);

  // POST routes
  router.post('/',  memberController.createMember);
  router.post('/validate', memberController.validateMembershipData);

  // PUT routes
  router.put('/:id',  memberController.updateMember);
  router.put('/:id/status', memberController.updateMemberStatus);

  // DELETE routes
  router.delete('/:id', memberController.deleteMember);

  return router;
};

export { createMemberRoutes };

