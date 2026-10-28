import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission } from '../../middlewares/authorize.js';
import { sendSuccess } from '../../utils/response.js';
import { studentLinkDto, teacherClassDto } from './admin.dto.js';
import * as adminService from './admin.service.js';

const router = Router();

router.use(authenticate);

router.post('/teacher-classes', requirePermission('accounts:link'), async (req, res) => {
  const body = teacherClassDto.parse(req.body);
  sendSuccess(res, await adminService.linkTeacherClass(body), 201);
});

router.post('/student-links', requirePermission('accounts:link'), async (req, res) => {
  const body = studentLinkDto.parse(req.body);
  sendSuccess(res, await adminService.linkStudentAccount(body), 201);
});

export default router;
