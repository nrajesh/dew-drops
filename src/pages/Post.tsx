import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { localDataProvider } from "@/lib/LocalDataProvider";
import type { Post as PostType } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ArrowLeft, ArrowRight } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { stripOuterBackticks } from "@/components/blog/BlogManagementUtils";
import { formatDate } from "@/lib/utils";

type NavPost = { id: string; title: string };

const PostNavigation = ({
  prev,
  next,
}: {
  prev: NavPost | null;
  next: NavPost | null;
}) => {
  if (!prev && !next) return null;

  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
      {prev ? (
        <Button
          asChild
          variant="outline"
          className="h-auto text-left justify-start"
        >
          <Link to={`/blog/${prev.id}`} className="flex items-center gap-3 p-4">
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-xs text-muted-foreground">Previous Post</p>
              <p className="font-semibold truncate">{prev.title}</p>
            </div>
          </Link>
        </Button>
      ) : (
        <div />
      )}

      {next ? (
        <Button
          asChild
          variant="outline"
          className="h-auto text-right justify-end"
        >
          <Link to={`/blog/${next.id}`} className="flex items-center gap-3 p-4">
            <div className="overflow-hidden">
              <p className="text-xs text-muted-foreground">Next Post</p>
              <p className="font-semibold truncate">{next.title}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0" />
          </Link>
        </Button>
      ) : (
        <div />
      )}
    </div>
  );
};

const Post = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [postNav, setPostNav] = useState<{
    prev: NavPost | null;
    next: NavPost | null;
  }>({ prev: null, next: null });

  useEffect(() => {
    const fetchPostAndNav = async () => {
      if (!id) return;
      setLoading(true);

      try {
        const allPosts = localDataProvider
          .getPosts()
          .filter((p) => p.published)
          .sort(
            (a, b) =>
              new Date(b.published_at || 0).getTime() -
              new Date(a.published_at || 0).getTime(),
          );

        const currentPost = allPosts.find((p) => p.id === id);

        if (currentPost) {
          setPost(currentPost);
          const currentIndex = allPosts.findIndex((p) => p.id === id);
          const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
          const prevPost =
            currentIndex < allPosts.length - 1
              ? allPosts[currentIndex + 1]
              : null;
          setPostNav({ prev: prevPost, next: nextPost });
        }
      } catch (err) {
        console.error("Error fetching local post:", err);
      }
      setLoading(false);
    };

    fetchPostAndNav();
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "ArrowLeft" && postNav.prev)
        navigate(`/blog/${postNav.prev.id}`);
      if (e.key === "ArrowRight" && postNav.next)
        navigate(`/blog/${postNav.next.id}`);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [postNav, navigate]);

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
    return <div className="text-center py-20">Post not found. (ID: {id})</div>;
  }

  const coverImage = post.cover_image_id
    ? localDataProvider.getGalleryImageById(post.cover_image_id)
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0">
      <article>
        <Card className="overflow-hidden border-none shadow-none bg-transparent">
          {coverImage && (
            <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
              <AspectRatio ratio={21 / 9}>
                <img
                  src={`/uploads/${coverImage.file_name}`}
                  alt={coverImage.alt_text || post.title}
                  className="object-cover w-full h-full"
                />
              </AspectRatio>
            </div>
          )}
          <CardHeader className="px-0 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  {post.title}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 pt-4 text-base">
                  <Calendar className="h-4 w-4" />
                  <span>Published on {formatDate(post.published_at)}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {post.youtube_video_id && (
              <div className="mb-6">
                <AspectRatio ratio={16 / 9}>
                  <iframe
                    className="rounded-lg"
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${post.youtube_video_id}?origin=${window.location.origin}&enablejsapi=0`}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </AspectRatio>
              </div>
            )}
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {stripOuterBackticks(post.content || "")}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </article>
      <PostNavigation prev={postNav.prev} next={postNav.next} />
    </div>
  );
};

export default Post;
