import { Router } from 'express';
import { authenticate, currentActor } from '../../middlewares/authenticate.js';
import { requireAnyPermission } from '../../middlewares/authorize.js';
import { idParam } from '../../utils/validators.js';
import { sendSuccess } from '../../utils/response.js';
import { averagesQueryDto, updateMarkDto } from './mark.dto.js';
import * as markService from './mark.service.js';

const router = Router();

router.use(authenticate);

router.get(
  '/averages',
  requireAnyPermission('marks:averages:class', 'marks:averages:any'),
  async (req, res) => {
    const query = averagesQueryDto.parse(req.query);
    sendSuccess(res, await markService.subjectAverages(currentActor(req), query));
  },
);

router.patch(
  '/:id',
  requireAnyPermission('marks:write:class', 'marks:write:any'),
  async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = updateMarkDto.parse(req.body);
    sendSuccess(res, await markService.updateMark(currentActor(req), id, body));
  },
);

router.delete(
  '/:id',
  requireAnyPermission('marks:write:class', 'marks:write:any'),
  async (req, res) => {
    const { id } = idParam.parse(req.params);
    await markService.deleteMark(currentActor(req), id);
    sendSuccess(res, null, 204);
  },
);

export default router;
