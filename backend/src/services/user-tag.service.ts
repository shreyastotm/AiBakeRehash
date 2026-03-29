import { db } from '../config/database';
import { NotFoundError } from '../middleware/errorHandler';
import { UserTag, CreateUserTagInput, UpdateUserTagInput } from '../models/user-tag.model';

export async function listUserTags(userId: string): Promise<UserTag[]> {
    const result = await db.query<UserTag>(
        'SELECT * FROM user_tags WHERE user_id = $1 ORDER BY label ASC',
        [userId]
    );
    return result.rows;
}

export async function createUserTag(userId: string, input: CreateUserTagInput): Promise<UserTag> {
    const result = await db.query<UserTag>(
        'INSERT INTO user_tags (user_id, label, color) VALUES ($1, $2, $3) RETURNING *',
        [userId, input.label, input.color || 'default']
    );
    return result.rows[0];
}

export async function updateUserTag(userId: string, tagId: string, input: UpdateUserTagInput): Promise<UserTag> {
    const fields: string[] = [];
    const params: any[] = [userId, tagId];
    let paramIdx = 3;

    if (input.label !== undefined) {
        fields.push(`label = $${paramIdx++}`);
        params.push(input.label);
    }
    if (input.color !== undefined) {
        fields.push(`color = $${paramIdx++}`);
        params.push(input.color);
    }

    if (fields.length === 0) {
        const current = await db.query<UserTag>('SELECT * FROM user_tags WHERE id = $2 AND user_id = $1', [userId, tagId]);
        if (current.rows.length === 0) throw new NotFoundError('Tag');
        return current.rows[0];
    }

    const result = await db.query<UserTag>(
        `UPDATE user_tags SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $2 AND user_id = $1 RETURNING *`,
        params
    );

    if (result.rows.length === 0) {
        throw new NotFoundError('Tag');
    }

    return result.rows[0];
}

export async function deleteUserTag(userId: string, tagId: string): Promise<void> {
    const result = await db.query(
        'DELETE FROM user_tags WHERE id = $2 AND user_id = $1',
        [userId, tagId]
    );

    if (result.rowCount === 0) {
        throw new NotFoundError('Tag');
    }
}
