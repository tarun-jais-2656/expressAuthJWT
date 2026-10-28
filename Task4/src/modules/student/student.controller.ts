import { Router } from 'express';
import { currentActor, authenticate } from '../../middlewares/authenticate.js';
import { requireAnyPermission, requirePermission } from '../../middlewares/authorize.js';
import { marksWriteLimiter } from '../../middlewares/rateLimit.js';
import { createMarksDto } from '../mark/mark.dto.js';
import * as markService from '../mark/mark.service.js';
import { idParam } from '../../utils/validators.js';
import { sendSuccess } from '../../utils/response.js';
import { createStudentDto, listStudentsQueryDto, updateStudentDto } from './student.dto.js';
import * as studentService from './student.service.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireAnyPermission('students:read:own', 'students:read:class', 'students:read:any'),
  async (req, res) => {
    const query = listStudentsQueryDto.parse(req.query);
    sendSuccess(res, await studentService.listStudents(currentActor(req), query));
  },
);

router.get(
  '/:id',
  requireAnyPermission('students:read:own', 'students:read:class', 'students:read:any'),
  async (req, res) => {
    const { id } = idParam.parse(req.params);
    sendSuccess(res, await studentService.getStudent(currentActor(req), id));
  },
);

router.post('/', requirePermission('students:write:any'), async (req, res) => {
  const body = createStudentDto.parse(req.body);
  sendSuccess(res, await studentService.createStudent(currentActor(req), body), 201);
});

router.post(
  '/:id/marks',
  marksWriteLimiter,
  requireAnyPermission('marks:write:class', 'marks:write:any'),
  async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = createMarksDto.parse(req.body);
    sendSuccess(res, await markService.createMarks(currentActor(req), id, body), 201);
  },
);

router.patch('/:id', requirePermission('students:write:any'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = updateStudentDto.parse(req.body);
  sendSuccess(res, await studentService.updateStudent(currentActor(req), id, body));
});

router.delete('/:id', requirePermission('students:write:any'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  await studentService.deleteStudent(currentActor(req), id);
  sendSuccess(res, null, 204);
});

export default router;
