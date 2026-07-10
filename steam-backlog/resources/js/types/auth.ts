export type User = {
    id: number;
    steam_id: number;
    display_name: string;
    avatar_url: string;
    last_synced_at: string | null;
    sync_status: 'idle' | 'syncing' | 'failed';
    sync_frequency: 'manual' | 'daily' | 'weekly';
    privacy_preferences: {
        show_profile?: boolean;
        show_playtime?: boolean;
        share_activity?: boolean;
    } | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};
