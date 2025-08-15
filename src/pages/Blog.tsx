import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Post } from "@/types";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Blog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uniqueTags, setUniqueTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      let query = supabase.from("posts").select("*").order("published_at", { ascending: false });

      if (selectedTag && selectedTag !== "All") {
        query = query.contains("tags", [selectedTag]);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching posts:", error);
      } else {
        setPosts(data as Post[]);
        // Extract unique tags from all posts (regardless of current filter)
        const allTags = new Set<string>();
        (data as Post[]).forEach(post => {
          if (post.tags) {
            post.tags.forEach(tag => allTags.add(tag));
          }
        });
        setUniqueTags(Array.from(allTags).sort());
      }
      setLoading(false);
    };

    fetchPosts();
  }, [selectedTag]); // Re-fetch when selectedTag changes

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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[200px] justify-between"
            >
              {selectedTag ? selectedTag : "Filter by Tag"}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search tag..." />
              <CommandList>
                <CommandEmpty>No tag found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="All"
                    onSelect={() => {
                      setSelectedTag(null);
                      setOpen(false);
                    }}
                    className={cn(
                      "cursor-pointer",
                      selectedTag === null ? "bg-accent text-accent-foreground" : ""
                    )}
                  >
                    All
                  </CommandItem>
                  {uniqueTags.map((tag) => (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={(currentValue) => {
                        setSelectedTag(currentValue === selectedTag ? null : currentValue);
                        setOpen(false);
                      }}
                      className={cn(
                        "cursor-pointer",
                        selectedTag === tag ? "bg-accent text-accent-foreground" : ""
                      )}
                    >
                      {tag}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
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
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default Blog;