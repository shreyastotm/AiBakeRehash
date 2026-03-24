import { Request, Response, NextFunction } from 'express';
import * as userTagService from '../services/user-tag.service';

function paramStr(val: any): string {
    return Array.isArray(val) ? val[0] : val;
}

export async function list(req: Request, res: Response, next: NextFunction) {
    try {
        const tags = await userTagService.listUserTags(req.user!.userId);
        res.json({ success: true, data: tags });
    } catch (err) {
        next(err);
    }
}

export async function create(req: Request, res: Response, next: NextFunction) {
    try {
        const tag = await userTagService.createUserTag(req.user!.userId, req.body);
        res.json({ success: true, data: tag });
    } catch (err) {
        next(err);
    }
}

export async function update(req: Request, res: Response, next: NextFunction) {
    try {
        const tag = await userTagService.updateUserTag(req.user!.userId, paramStr(req.params.id), req.body);
        res.json({ success: true, data: tag });
    } catch (err) {
        next(err);
    }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
    try {
        await userTagService.deleteUserTag(req.user!.userId, paramStr(req.params.id));
        res.json({ success: true, message: 'Tag deleted successfully' });
    } catch (err) {
        next(err);
    }
}
