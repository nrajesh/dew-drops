export interface Post {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  content: string | null;
  published_at: string | null;
  user_id: string | null;
}