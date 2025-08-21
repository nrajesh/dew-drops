import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo, useRef, lazy, Suspense, ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Post } from "@/types";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { PaginationControls } from "@/components/PaginationControls";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";

const LazyMultiSelectPopover = lazy(() => import("@/components/MultiSelectPopover").then(module => ({ default: module.MultiSelectPopover })));

const POSTS_PER_PAGE = 3;

const Blog = () => {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uniqueTags, setUniqueTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .eq('published', true)
        .order("published_at", { ascending: false });

      if (postsError) {
        console.error("Error fetching posts:", postsError);
      } else {
        setAllPosts(postsData as Post[]);
        const allTags = new Set<string>();
        (postsData as Post[]).forEach(post => {
          if (post.tags) {
            post.tags.forEach(tag => allTags.add(tag));
          }
        });
        setUniqueTags(Array.from(allTags).sort());
      }
      setLoading(false);
    };
    fetchInitialData();
  }, []);

  const filteredPosts = useMemo(() => {
    return allPosts.filter(post => {
      const tagMatch = selectedTags.length === 0 || selectedTags.every(tag => post.tags?.includes(tag));
      const searchMatch = !debouncedSearchTerm || post.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      return tagMatch && searchMatch;
    });
  }, [allPosts, selectedTags, debouncedSearchTerm]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTags, debouncedSearchTerm]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-112px)]" ref={containerRef}>
      <div className="flex-grow space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Blog</h1>
          <p className="text-muted-foreground">My thoughts on design, development, and more.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <div className="relative sm:w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search posts..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="sm:w-full sm:max-w-xs">
            <Suspense fallback={<Skeleton className="h-10 w-full" />}>
              <LazyMultiSelectPopover
                suggestions={uniqueTags}
                value={selectedTags}
                onChange={setSelectedTags}
                placeholder="Filter by tags..."
                canCreate={false}
              />
            </Suspense>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: POSTS_PER_PAGE }).map((_, index) => (
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
          ) : paginatedPosts.length > 0 ? (
            paginatedPosts.map((post) => (
              <Card key={post.id} className="flex flex-col h-full">
                <CardHeader>
                  <CardTitle>{post.title}</CardTitle>
                  <CardDescription>{formatDate(post.published_at)}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm">{post.description}</p>
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
                <CardFooter className="mt-auto">
                  <Button asChild variant="link" className="p-0">
                    <Link to={`/blog/${post.id}`}>Read More</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <p className="text-center text-muted-foreground col-span-full">
              No posts found. Try adjusting your search or filters.
            </p>
          )}
        </div>
      </div>
      <div className="mt-6">
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default Blog;