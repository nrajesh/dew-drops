import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Post as PostType, GalleryImage } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Calendar } from 'lucide-react';
import { AspectRatio } from "@/components/ui/aspect-ratio";

const PLACEHOLDER_IMAGE_URL = "/gallery/placeholder.svg"; // Path to your placeholder image

const Post = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<PostType | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*, gallery_images(image_url)') // Select post data and join with gallery_images for cover image URL
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching post:', error);
      } else {
        const fetchedPost = data as PostType & { gallery_images?: GalleryImage };
        setPost(fetchedPost);
        if (fetchedPost.cover_image_id && fetchedPost.gallery_images) {
          setCoverImageUrl(fetchedPost.gallery_images.image_url);
        } else {
          setCoverImageUrl(null); // Ensure it's null if no cover image or join failed
        }
      }
      setLoading(false);
    };

    fetchPost();
  }, [id]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('en-US', { // Fixed: toLocaleDateDateString to toLocaleDateString
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-64 w-full mb-8 rounded-lg" /> {/* Skeleton for cover image */}
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

  const finalCoverImageUrl = coverImageUrl || PLACEHOLDER_IMAGE_URL;

  return (
    <article className="max-w-4xl mx-auto">
      <Card>
        {finalCoverImageUrl && (
          <div className="relative w-full h-64 overflow-hidden rounded-t-lg">
            <img
              src={finalCoverImageUrl}
              alt={post.title || "Blog post cover image"}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-4xl font-bold">{post.title}</CardTitle>
          <CardDescription className="flex items-center gap-2 pt-2">
            <Calendar className="h-4 w-4" />
            <span>Published on {formatDate(post.published_at)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {post.youtube_video_id && (
            <div className="mb-6">
              <AspectRatio ratio={16 / 9}>
                <iframe
                  className="rounded-lg"
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${post.youtube_video_id}`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </AspectRatio>
            </div>
          )}
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