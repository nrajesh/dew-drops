import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Post as PostType } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Calendar } from 'lucide-react';

const Post = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<PostType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching post:', error);
      } else {
        setPost(data as PostType);
      }
      setLoading(false);
    };

    fetchPost();
  }, [id]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
        </div>
      </div>
    );
  }

  if (!post) {
    return <div className="text-center">Post not found.</div>;
  }

  return (
    <article className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-4xl font-bold">{post.title}</CardTitle>
          <CardDescription className="flex items-center gap-2 pt-2">
            <Calendar className="h-4 w-4" />
            <span>Published on {formatDate(post.published_at)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content || ''}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </article>
  );
};

export default Post;