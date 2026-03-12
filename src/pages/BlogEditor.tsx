import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { localDataProvider } from "@/lib/LocalDataProvider";
import type { GalleryImage } from "@/types";
import {
  showSuccess,
  showError,
  showLoading,
  dismissToast,
} from "@/utils/toast";
import { fetchGalleryImages } from "@/components/blog/BlogManagementUtils";
import { stripOuterBackticks } from "@/components/blog/BlogManagementUtils";
// ... (rest of imports same)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { MultiSelectPopover } from "@/components/MultiSelectPopover";
import { CoverImagePicker } from "@/components/blog/CoverImagePicker";
import {
  ArrowLeft,
  Save,
  Youtube,
  FileText,
  Eye,
  EyeOff,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  Quote,
  Heading2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { marked } from "marked";

// ── YouTube helpers ─────────────────────────────────────────────
const extractYouTubeId = (input: string): string => {
  if (!input) return "";
  // If it's already a bare 11-char ID, return it
  if (/^[A-Za-z0-9_-]{11}$/.test(input.trim())) return input.trim();
  // Try to extract from URL
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const match = input.match(re);
    if (match) return match[1];
  }
  return input.trim();
};

const getYouTubeThumbnail = (id: string) =>
  id && /^[A-Za-z0-9_-]{11}$/.test(id)
    ? `https://img.youtube.com/vi/${id}/mqdefault.jpg`
    : null;

// ── Schema ──────────────────────────────────────────────────────
const editorSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().max(500, "Max 500 characters.").optional(),
  content: z.string().min(20, "Content must be at least 20 characters."),
  published_at: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), "Invalid date."),
  published: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  cover_image_id: z.preprocess(
    (v) => (v === "--none--" || v === "" ? null : v),
    z.string().nullable().optional(), // Removed uuid check for local flexibility
  ),
  youtube_video_id: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return null;
      const id = extractYouTubeId(v);
      return id || null;
    }),
});

type EditorFormData = z.infer<typeof editorSchema>;

// ── Component ───────────────────────────────────────────────────
const BlogEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [uniqueTags, setUniqueTags] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<EditorFormData>({
    resolver: zodResolver(editorSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      published_at: new Date().toISOString().split("T")[0],
      published: false,
      tags: [],
      cover_image_id: null,
      youtube_video_id: "",
    },
  });

  // ── Markdown insert helpers (need form, so defined after useForm) ────
  const insertMarkdown = useCallback(
    (before: string, after = "", placeholder = "text") => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = el.value.substring(start, end);
      const insertion = selected || placeholder;
      const newValue =
        el.value.substring(0, start) +
        before +
        insertion +
        after +
        el.value.substring(end);
      form.setValue("content", newValue, { shouldDirty: true });
      requestAnimationFrame(() => {
        el.focus();
        const cursorStart = start + before.length;
        el.setSelectionRange(cursorStart, cursorStart + insertion.length);
      });
    },
    [form],
  );

  const insertLink = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const selected = el.value.substring(el.selectionStart, el.selectionEnd);
    const url = window.prompt("Enter URL:", "https://");
    if (!url) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const linkText = selected || "link text";
    const newValue =
      el.value.substring(0, start) +
      `[${linkText}](${url})` +
      el.value.substring(end);
    form.setValue("content", newValue, { shouldDirty: true });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, start + linkText.length + url.length + 4);
    });
  }, [form]);

  // Track dirty state
  useEffect(() => {
    const sub = form.watch(() => setIsDirty(true));
    return () => sub.unsubscribe();
  }, [form]);

  // Warn before leaving
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const hasContent =
        form.getValues("title").trim() !== "" ||
        form.getValues("content").trim() !== "";
      if (isDirty && hasContent) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, form]);

  // Load data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const images = await fetchGalleryImages();
      setGalleryImages(images);

      const allPosts = localDataProvider.getPosts();
      const tags = new Set<string>();
      allPosts.forEach((p) => p.tags?.forEach((t) => tags.add(t)));
      setUniqueTags(Array.from(tags).sort());

      if (id) {
        const post = allPosts.find((p) => p.id === id);
        if (!post) {
          showError("Post not found.");
          navigate("/manage-blog");
          return;
        }
        form.reset({
          title: post.title,
          description: post.description ?? "",
          content: stripOuterBackticks(post.content ?? ""),
          published_at: post.published_at
            ? post.published_at.split("T")[0]
            : new Date().toISOString().split("T")[0],
          published: post.published,
          tags: post.tags ?? [],
          cover_image_id: post.cover_image_id ?? null,
          youtube_video_id: post.youtube_video_id ?? "",
        });
        setIsDirty(false);
      }
      setLoading(false);
    };
    load();
  }, [id, navigate, form]);

  const handleSubmit = useCallback(
    async (values: EditorFormData) => {
      if (!session) {
        showError("You must be logged in.");
        return;
      }

      const toastId = showLoading(
        isEditing ? "Updating post…" : "Creating post…",
      );

      // Simulate local save
      await new Promise((resolve) => setTimeout(resolve, 800));
      console.log("Saving post locally (Simulation):", values);

      dismissToast(toastId);
      showSuccess(
        `Post ${isEditing ? "updated" : "created"} successfully (Simulation: local preview mode)!`,
      );
      setIsDirty(false);
      navigate("/manage-blog");
    },
    [session, isEditing, navigate],
  );

  // YouTube preview
  const youtubeRawValue = form.watch("youtube_video_id") ?? "";
  const youtubeId = useMemo(
    () => extractYouTubeId(youtubeRawValue),
    [youtubeRawValue],
  );
  const youtubeThumbnail = useMemo(
    () => getYouTubeThumbnail(youtubeId),
    [youtubeId],
  );

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            const hasContent =
              form.getValues("title").trim() !== "" ||
              form.getValues("content").trim() !== "";
            if (isDirty && hasContent) {
              if (
                !window.confirm(
                  "You have unsaved changes. Are you sure you want to leave?",
                )
              ) {
                return;
              }
            }
            navigate("/manage-blog");
          }}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Posts
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isEditing ? "Update Post" : "Create Post"}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* ── Left Column: Editor ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Awesome Blog Post"
                      className="text-lg font-semibold"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  {/* ── Toolbar row ────────────────────── */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <FormLabel className="mr-1">Content</FormLabel>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      Markdown
                    </span>

                    {/* Formatting buttons — only in edit mode */}
                    {!showPreview && (
                      <div className="flex items-center gap-0.5 bg-muted rounded-md px-1 py-0.5 ml-1">
                        {(
                          [
                            {
                              icon: <Bold className="h-3.5 w-3.5" />,
                              title: "Bold",
                              action: () =>
                                insertMarkdown("**", "**", "bold text"),
                            },
                            {
                              icon: <Italic className="h-3.5 w-3.5" />,
                              title: "Italic",
                              action: () =>
                                insertMarkdown("*", "*", "italic text"),
                            },
                            {
                              icon: <Underline className="h-3.5 w-3.5" />,
                              title: "Underline",
                              action: () =>
                                insertMarkdown("<u>", "</u>", "underlined"),
                            },
                            {
                              icon: <Strikethrough className="h-3.5 w-3.5" />,
                              title: "Strikethrough",
                              action: () =>
                                insertMarkdown("~~", "~~", "strikethrough"),
                            },
                            {
                              icon: <Code className="h-3.5 w-3.5" />,
                              title: "Inline code",
                              action: () => insertMarkdown("`", "`", "code"),
                            },
                            {
                              icon: <Link className="h-3.5 w-3.5" />,
                              title: "Link",
                              action: insertLink,
                            },
                            {
                              icon: <Quote className="h-3.5 w-3.5" />,
                              title: "Blockquote",
                              action: () =>
                                insertMarkdown("> ", "", "quoted text"),
                            },
                            {
                              icon: <Heading2 className="h-3.5 w-3.5" />,
                              title: "Heading",
                              action: () =>
                                insertMarkdown("## ", "", "Heading"),
                            },
                          ] as {
                            icon: React.ReactNode;
                            title: string;
                            action: () => void;
                          }[]
                        ).map(({ icon, title, action }) => (
                          <button
                            key={title}
                            type="button"
                            title={title}
                            onClick={action}
                            className="p-1 rounded hover:bg-background hover:text-foreground text-muted-foreground transition-colors"
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Preview toggle — flush right */}
                    <button
                      type="button"
                      onClick={() => setShowPreview((p) => !p)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-border hover:bg-accent transition-colors ml-auto"
                    >
                      {showPreview ? (
                        <>
                          <EyeOff className="h-3 w-3" /> Edit
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" /> Preview
                        </>
                      )}
                    </button>
                  </div>

                  <FormControl>
                    {showPreview ? (
                      <div
                        className="min-h-[350px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm prose prose-invert max-w-none overflow-auto"
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(field.value ?? "") as string,
                        }}
                      />
                    ) : (
                      <Textarea
                        placeholder="Write your full article here using Markdown…"
                        className="min-h-[350px] font-mono text-sm"
                        {...field}
                        ref={(el) => {
                          field.ref(el);
                          (
                            textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>
                          ).current = el;
                        }}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormDescription>
                    A short summary shown on blog cards. Auto-generated from
                    content if left empty.
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder="A short summary of your post…"
                      className="min-h-[150px]"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* ── Right Column: Metadata Sidebar ───────────────── */}
          <div className="space-y-5">
            {/* Publish toggle */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="published"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel className="text-base">Status</FormLabel>
                        <p
                          className={`text-sm font-medium ${field.value ? "text-emerald-500" : "text-amber-500"}`}
                        >
                          {field.value ? "Published" : "Draft"}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="published_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publish Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormDescription>
                        Categorise your post with tags.
                      </FormDescription>
                      <FormControl>
                        <MultiSelectPopover
                          suggestions={uniqueTags}
                          value={field.value ?? []}
                          onChange={field.onChange}
                          placeholder="Select or create tags…"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Cover Image */}
            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="cover_image_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Image</FormLabel>
                      <FormControl>
                        <CoverImagePicker
                          galleryImages={galleryImages}
                          value={field.value ?? null}
                          onChange={(id) => field.onChange(id ?? "--none--")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* YouTube */}
            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="youtube_video_id"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <Youtube className="h-4 w-4 text-red-500" />
                        <FormLabel>YouTube Video</FormLabel>
                      </div>
                      <FormDescription>
                        Paste a YouTube URL or video ID — the ID will be
                        extracted automatically.
                      </FormDescription>
                      <FormControl>
                        <Input
                          placeholder="https://youtube.com/watch?v=… or dQw4w9WgXcQ"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      {youtubeThumbnail && (
                        <img
                          src={youtubeThumbnail}
                          alt="YouTube thumbnail preview"
                          className="mt-2 rounded-lg w-full aspect-video object-cover"
                        />
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default BlogEditor;
