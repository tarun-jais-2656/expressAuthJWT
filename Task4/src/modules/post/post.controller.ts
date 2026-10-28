import { Router } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { createPostDto } from './post.dto.js';
import * as postService from './post.service.js';

const router = Router();

router.post('/', async (req, res) => {
  const body = createPostDto.parse(req.body);
  sendSuccess(res, await postService.createPost(body), 201);
});

export default router;
