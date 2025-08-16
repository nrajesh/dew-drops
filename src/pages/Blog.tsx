import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Post } from "@/types";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiSelectPopover } from "@/components/MultiSelectPopover";

const Blog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uniqueTags, setUniqueTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Effect to fetch all unique tags once on component mount
  useEffect(() => {
    const fetchAllTags = async () => {
      const { data, error } = await supabase.from('posts').select('tags').eq('published', true);
      if (error) {
        console.error("Error fetching tags:", error);
      } else {
        const allTags = new Set<string>();
        data.forEach(post => {
          if (post.tags) {
            post.tags.forEach(tag => allTags.add(tag));
          }
        });
        setUniqueTags(Array.from(allTags).sort());
      }
    };
    fetchAllTags();
  }, []);

  // Effect to fetch posts whenever the selected tags change
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      let query = supabase
        .from("posts")
        .select("*")
        .eq('published', true)
        .order("published_at", { ascending: false });

      if (selectedTags.length > 0) {
        query = query.overlaps("tags", selectedTags);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching posts:", error);
      } else {
        setPosts(data as Post[]);
      }
      setLoading(false);
    };

    fetchPosts();
  }, [selectedTags]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Blog</h1>
        <p className="text-muted-foreground">My thoughts on design, development, and more.</p>
      </div>

      <div className="flex justify-center">
        <div className="w-full max-w-xs">
          <MultiSelectPopover
            suggestions={uniqueTags}
            value={selectedTags}
            onChange={setSelectedTags}
            placeholder="Filter by tags..."
            canCreate={false}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-6 w-24" />
              </CardFooter>
            </Card>
          ))
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <CardTitle>{post.title}</CardTitle>
                <CardDescription>{formatDate(post.published_at)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>{post.description}</p>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button asChild variant="link" className="p-0">
                  <Link to={`/blog/${post.id}`}>Read More</Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <p className="text-center text-muted-foreground col-span-full">
            No posts found for the selected tags.
          </p>
        )}
      </div>
    </div>
  );
};

export default Blog;