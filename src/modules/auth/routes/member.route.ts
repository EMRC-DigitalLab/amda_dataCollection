import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { MemberController } from '../controllers/member.controller';

const createMemberRoutes = (dataSource: DataSource): Router => {
  const router = Router();
  const memberController = new MemberController(dataSource);

  // GET routes
  router.get('/', memberController.getAllMembers);
  router.get('/search', authMiddleware, memberController.searchMembers);
  router.get('/filters', authMiddleware, memberController.getMembersWithFilters);
  router.get('/status/:status', authMiddleware, memberController.getMembersByStatus);
  router.get('/country/:country', authMiddleware, memberController.getMembersByCountry);
  router.get('/user/:userId', authMiddleware, memberController.getMemberByUserId);
  router.get('/email/:email', authMiddleware, memberController.getMemberByEmail);

  // NEW VERIFICATION ROUTES
  router.get(
    '/verification/all',
    authMiddleware,
    memberController.getAllMembersWithVerificationStatus
  );
  router.get('/verification/verified', authMiddleware, memberController.getVerifiedMembers);
  router.get('/verification/unverified', authMiddleware, memberController.getUnverifiedMembers);

  router.get('/:id', authMiddleware, memberController.getMemberById);

  // POST routes
  router.post('/', memberController.createMember);
  router.post('/validate', authMiddleware, memberController.validateMembershipData);

  // PUT routes
  router.put('/:id', memberController.updateMember);
  router.put('/:id/status', memberController.updateMemberStatus);

  // NEW VERIFICATION ROUTES
  router.put('/:id/verify', authMiddleware, memberController.verifyMember);
  router.put('/:id/unverify', authMiddleware, memberController.unverifyMember);

  // DELETE routes
  router.delete('/:id', memberController.deleteMember);

  return router;
};

export { createMemberRoutes };
