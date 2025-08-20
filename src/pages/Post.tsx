import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Post as PostType, GalleryImage } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Calendar, ArrowLeft, ArrowRight, Edit, X } from 'lucide-react';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

const PLACEHOLDER_IMAGE_URL = "/gallery/placeholder.svg";

type NavPost = { id: string; title: string };

const PostNavigation = ({ prev, next }: { prev: NavPost | null; next: NavPost | null }) => {
  if (!prev && !next) return null;

  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
      {prev ? (
        <Button asChild variant="outline" className="h-auto text-left justify-start">
          <Link to={`/blog/${prev.id}`} className="flex items-center gap-3 p-4">
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-xs text-muted-foreground">Previous Post</p>
              <p className="font-semibold truncate">{prev.title}</p>
            </div>
          </Link>
        </Button>
      ) : <div />}
      
      {next ? (
        <Button asChild variant="outline" className="h-auto text-right justify-end">
          <Link to={`/blog/${next.id}`} className="flex items-center gap-3 p-4">
             <div className="overflow-hidden">
              <p className="text-xs text-muted-foreground">Next Post</p>
              <p className="font-semibold truncate">{next.title}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0" />
          </Link>
        </Button>
      ) : <div />}
    </div>
  );
};

const Post = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const [post, setPost] = useState<PostType | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [postNav, setPostNav] = useState<{ prev: NavPost | null; next: NavPost | null }>({ prev: null, next: null });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState('');

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    const fetchPostAndNav = async () => {
      if (!id) return;
      setLoading(true);
      setPost(null);
      setPostNav({ prev: null, next: null });

      const { data: allPosts, error: allPostsError } = await supabase
        .from('posts')
        .select('id, title, published_at')
        .eq('published', true)
        .order('published_at', { ascending: false });

      if (allPostsError) {
        console.error('Error fetching post list for navigation:', allPostsError);
      }

      const { data: currentPostData, error: currentPostError } = await supabase
        .from('posts')
        .select('*, gallery_images(image_url)')
        .eq('id', id)
        .single();

      if (currentPostError) {
        console.error('Error fetching post:', currentPostError);
      } else {
        const fetchedPost = currentPostData as PostType & { gallery_images?: GalleryImage };
        setPost(fetchedPost);
        if (fetchedPost.cover_image_id && fetchedPost.gallery_images) {
          setCoverImageUrl(fetchedPost.gallery_images.image_url);
        } else {
          setCoverImageUrl(null);
        }

        if (allPosts) {
          const currentIndex = allPosts.findIndex(p => p.id === id);
          if (currentIndex !== -1) {
            const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
            const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
            setPostNav({ prev: prevPost, next: nextPost });
          }
        }
      }
      setLoading(false);
    };

    fetchPostAndNav();
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && postNav.prev) navigate(`/blog/${postNav.prev.id}`);
      if (e.key === 'ArrowRight' && postNav.next) navigate(`/blog/${postNav.next.id}`);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [postNav, navigate]);

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe && postNav.next) navigate(`/blog/${postNav.next.id}`);
    if (isRightSwipe && postNav.prev) navigate(`/blog/${postNav.prev.id}`);
    setTouchStart(null);
    setTouchEnd(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleEdit = () => {
    if (post) {
      setEditContent(post.content || '');
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!post) return;

    const toastId = showLoading("Updating post content...");
    const { error } = await supabase
      .from('posts')
      .update({ content: editContent })
      .eq('id', post.id);

    dismissToast(toastId);
    if (error) {
      showError("Failed to update post content.");
      console.error(error);
    } else {
      showSuccess("Post content updated successfully!");
      setPost({ ...post, content: editContent });
      setIsEditDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-64 w-full mb-8 rounded-lg" />
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
    <>
      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="max-w-4xl mx-auto">
        <article>
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
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-4xl font-bold">{post.title}</CardTitle>
                <CardDescription className="flex items-center gap-2 pt-2">
                  <Calendar className="h-4 w-4" />
                  <span>Published on {formatDate(post.published_at)}</span>
                </CardDescription>
              </div>
              {session && (
                <Button variant="ghost" size="icon" onClick={handleEdit} aria-label="Edit post">
                  <Edit className="h-5 w-5" />
                </Button>
              )}
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
        <PostNavigation prev={postNav.prev} next={postNav.next} />
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Post Content</DialogTitle>
            <DialogDescription>
              Make changes to the post content below. You can use Markdown formatting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="h-full min-h-[300px] font-mono text-sm resize-none"
            />
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Post;