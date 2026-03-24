export interface UserTag {
    id: string;
    user_id: string;
    label: string;
    color: string;
    created_at: string;
    updated_at: string;
}

export interface CreateUserTagInput {
    label: string;
    color?: string;
}

export interface UpdateUserTagInput {
    label?: string;
    color?: string;
}
