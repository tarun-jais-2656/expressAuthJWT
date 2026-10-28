export const POST_STATUSES = ['draft', 'published'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
  status: PostStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostRow {
  id: number;
  user_id: number;
  title: string;
  body: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface PostChanges {
  userId?: number;
  title?: string;
  body?: string;
  status?: PostStatus;
}
