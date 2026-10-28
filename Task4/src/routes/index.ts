import { Router } from 'express';
import { curlResponse } from '../middlewares/curlResponse.js';
import { noStore } from '../middlewares/noStore.js';
import adminController from '../modules/admin/admin.controller.js';
import authController from '../modules/auth/auth.controller.js';
import markController from '../modules/mark/mark.controller.js';
import postController from '../modules/post/post.controller.js';
import studentController from '../modules/student/student.controller.js';
import userController from '../modules/user/user.controller.js';

const router = Router();

router.use('/auth', noStore, authController);
router.use('/users', curlResponse, userController);
router.use('/posts', curlResponse, postController);
router.use('/students', noStore, curlResponse, studentController);
router.use('/marks', noStore, curlResponse, markController);
router.use('/admin', noStore, adminController);

export default router;
