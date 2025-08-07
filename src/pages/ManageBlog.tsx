import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { useState, useEffect } from "react";
import { Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Post } from "@/types";
import { useAuth } from "@/contexts/AuthProvider";

const postSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  content: z.string().min(20, { message: "Content must be at least 20 characters." }),
  published_at: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format." }),
});

const ManageBlog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase.from("posts").select("*").order("published_at", { ascending: false });
    if (error) {
      showError("Failed to fetch posts.");
      console.error(error);
    } else {
      setPosts(data as Post[]);
    }
  };

  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      published_at: new Date().toISOString().split("T")[0],
    },
  });

  async function onSubmit(values: z.infer<typeof postSchema>) {
    if (!session) {
      showError("You must be logged in to manage posts.");
      return;
    }
    const toastId = showLoading(editingId ? "Updating post..." : "Adding new post...");
    
    const postData = {
      ...values,
      user_id: session.user.id,
    };

    let error;
    if (editingId) {
      const { error: updateError } = await supabase.from("posts").update(postData).eq("id", editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("posts").insert(postData);
      error = insertError;
    }

    dismissToast(toastId);
    if (error) {
      showError(error.message);
      console.error(error);
    } else {
      showSuccess(`Post ${editingId ? "updated" : "added"} successfully!`);
      setEditingId(null);
      form.reset({
        title: "",
        description: "",
        content: "",
        published_at: new Date().toISOString().split("T")[0],
      });
      fetchPosts();
    }
  }

  const handleEdit = (post: Post) => {
    setEditingId(post.id);
    form.setValue("title", post.title);
    form.setValue("description", post.description || "");
    form.setValue("content", post.content || "");
    form.setValue("published_at", post.published_at ? post.published_at.split("T")[0] : "");
  };

  const handleDelete = async (id: string) => {
    if (!session) {
      showError("You must be logged in to delete posts.");
      return;
    }
    const toastId = showLoading("Deleting post...");
    const { error } = await supabase.from("posts").delete().eq("id", id);
    dismissToast(toastId);
    if (error) {
      showError(error.message);
    } else {
      showError("Post removed.");
      fetchPosts();
    }
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    form.reset();
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Post" : "Add New Post"}</CardTitle>
          <CardDescription>
            {editingId ? "Update the details for this blog post." : "Create a new article. You can use Markdown for the content."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input placeholder="Your Post Title" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="published_at" render={({ field }) => ( <FormItem> <FormLabel>Publication Date</FormLabel> <FormControl><Input type="date" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea placeholder="A short summary of the post." {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="content" render={({ field }) => ( <FormItem> <FormLabel>Content (Markdown supported)</FormLabel> <FormControl><Textarea placeholder="Write your full article here..." className="min-h-[200px]" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <div className="flex gap-2">
                <Button type="submit">{editingId ? "Update Post" : "Add Post"}</Button>
                {editingId && <Button variant="outline" onClick={cancelEdit}>Cancel</Button>}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Post List</CardTitle>
          <CardDescription>Your current list of blog posts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {posts.length > 0 ? (
              posts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <p className="font-medium truncate pr-2">{post.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(post)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center">No posts yet. Add one using the form!</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageBlog;