import { Router } from 'express';
import { idParam } from '../../utils/validators.js';
import { sendSuccess } from '../../utils/response.js';
import { createUserDto, updateUserDto } from './user.dto.js';
import * as userService from './user.service.js';

const router = Router();

router.post('/', async (req, res) => {
  const body = createUserDto.parse(req.body);
  sendSuccess(res, await userService.createUser(body), 201);
});

router.patch('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = updateUserDto.parse(req.body);
  sendSuccess(res, await userService.updateUser(id, body));
});

export default router;
