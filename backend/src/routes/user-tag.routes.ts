import { Router } from 'express';
import { body, param } from 'express-validator';
import * as userTagController from '../controllers/user-tag.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const createTagValidation = [
    body('label').isString().notEmpty().trim().isLength({ max: 50 }),
    body('color').optional().isString().trim().isLength({ max: 30 }),
];

const updateTagValidation = [
    param('id').isUUID(),
    body('label').optional().isString().notEmpty().trim().isLength({ max: 50 }),
    body('color').optional().isString().trim().isLength({ max: 30 }),
];

const idParamValidation = [
    param('id').isUUID(),
];

router.use(requireAuth);

router.get('/', userTagController.list);
router.post('/', validate(createTagValidation), userTagController.create);
router.patch('/:id', validate(updateTagValidation), userTagController.update);
router.delete('/:id', validate(idParamValidation), userTagController.remove);

export default router;
