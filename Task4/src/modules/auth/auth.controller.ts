import { Router } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { loginDto, registerDto } from './auth.dto.js';
import * as authService from './auth.service.js';

const router = Router();

router.post('/register', async (req, res) => {
  const body = registerDto.parse(req.body);
  sendSuccess(res, await authService.register(body), 201);
});

router.post('/login', async (req, res) => {
  const body = loginDto.parse(req.body);
  sendSuccess(res, await authService.login(body));
});

export default router;
