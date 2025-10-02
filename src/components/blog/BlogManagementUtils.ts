import { supabase } from "@/integrations/supabase/client";
import type { Post, GalleryImage } from "@/types";
import { showSuccess, showError, showLoading, updateToastSuccess, updateToastError } from "@/utils/toast";
import TurndownService from "turndown";
import JSZip from 'jszip';
import { sanitizeFileName } from "@/lib/utils";

type NewPost = Omit<Post, 'id' | 'created_at' | 'user_id'>;

export const fetchPosts = async (): Promise<Post[]> => {
  const { data, error } = await supabase.from("posts").select("*").order("published_at", { ascending: false });
  if (error) {
    showError("Failed to fetch posts.");
    console.error(error);
    return [];
  }
  return data as Post[];
};

export const fetchGalleryImages = async (): Promise<GalleryImage[]> => {
  const { data, error } = await supabase.from("gallery_images").select("id, image_url, alt_text").order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching gallery images:", error);
    return [];
  }
  return data as GalleryImage[];
};

export const extractDescriptionFromContent = (content: string): string => {
  // Extract the first 5 lines from the content
  const contentLines = content.split('\n');
  let extractedDescription = '';

  // Find the first code block
  const codeBlockRegex = /```([\s\S]*?)```/;
  const match = content.match(codeBlockRegex);

  if (match && match[1]) {
    // If there's a code block, use the first 5 lines of the code block
    const codeBlockLines = match[1].split('\n');
    extractedDescription = codeBlockLines.slice(0, 5).join('\n').trim();
  } else {
    // If no code block, use the first 5 lines of the content
    extractedDescription = contentLines.slice(0, 5).join('\n').trim();
  }

  // Trim to 500 characters max
  if (extractedDescription.length > 500) {
    extractedDescription = extractedDescription.substring(0, 497) + '...';
  }

  return extractedDescription;
};

export const ensureContentHasTripleBackticks = (content: string): string => {
  if (!content.startsWith('```') || !content.endsWith('```')) {
    return '```\n' + content + '\n```';
  }
  return content;
};

export const parseWordPressXml = async (xmlString: string): Promise<NewPost[]> => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const items = xmlDoc.querySelectorAll("item");
  const newPosts: NewPost[] = [];
  const turndownService = new TurndownService();

  items.forEach(item => {
    const title = item.querySelector("title")?.textContent || "";
    const pubDate = item.querySelector("pubDate")?.textContent || new Date().toISOString();
    let description = item.querySelector("description")?.textContent || "";
    let contentHtml = item.getElementsByTagNameNS("*", "encoded")[0]?.textContent || "";
    const status = item.querySelector("status, \\:status")?.textContent || 'draft';

    contentHtml = contentHtml.replace(/<!--\s*(more|nextpage)\s*-->/gi, '');

    const content = turndownService.turndown(contentHtml);

    const categoryElements = item.querySelectorAll("category");
    const tagSet = new Set<string>();
    categoryElements.forEach(cat => {
      const domain = cat.getAttribute('domain');
      if (domain === 'category' || domain === 'post_tag') {
        const nicename = cat.getAttribute('nicename');
        if (nicename) {
          tagSet.add(nicename);
        }
      }
    });
    const tags = Array.from(tagSet);

    const cover_image_id: string | null = null;
    const youtube_video_id: string | null = null;

    if (!description || description.trim() === '') {
      description = extractDescriptionFromContent(content);
    }

    const finalContent = ensureContentHasTripleBackticks(content);

    if (title && finalContent) {
      newPosts.push({
        title,
        description,
        content: finalContent,
        published_at: new Date(pubDate).toISOString(),
        published: status === 'publish',
        tags: tags.length > 0 ? tags : null,
        cover_image_id,
        youtube_video_id,
      });
    }
  });
  return newPosts;
};

export const parseMarkdownFile = async (file: File): Promise<NewPost> => {
  const fullContent = await file.text();
  let title = file.name.replace(/\.md$/, '');
  let description = '';
  let published_at = new Date().toISOString();
  let published = false; // Default to unpublished
  let content = fullContent;
  let tags: string[] | null = null;
  let cover_image_id: string | null = null;
  let youtube_video_id: string | null = null;

  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = fullContent.match(frontmatterRegex);

  if (match) {
    const frontmatterContent = match[1];
    content = match[2];

    frontmatterContent.split(/\r?\n/).forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1) {
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        switch (key) {
          case 'title':
            title = value;
            break;
          case 'description':
            description = value;
            break;
          case 'published_at':
          case 'date':
            const trimmedValue = value.trim();
            const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

            if (dateOnlyRegex.test(trimmedValue)) {
              const parts = trimmedValue.split('-').map(p => parseInt(p, 10));
              const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
              published_at = utcDate.toISOString();
            } else {
              const parsedDate = new Date(trimmedValue);
              if (!isNaN(parsedDate.getTime())) {
                published_at = parsedDate.toISOString();
              }
            }
            break;
          case 'published':
            published = value === 'true';
            break;
          case 'tags':
            let rawTags = value;
            if (rawTags.startsWith('[') && rawTags.endsWith(']')) {
              rawTags = rawTags.slice(1, -1);
            }
            tags = rawTags.split(',').map(tag => tag.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
            break;
          case 'cover_image_id':
            cover_image_id = value;
            break;
          case 'youtube_video_id':
            youtube_video_id = value;
            break;
        }
      }
    });
  }

  content = content.trim().replace(/<!--\s*(more|nextpage)\s*-->/gi, '');

  if (!description || description.trim() === '') {
    description = extractDescriptionFromContent(content);
  }

  const finalContent = ensureContentHasTripleBackticks(content);

  return { title, description, content: finalContent, published_at, published, tags, cover_image_id, youtube_video_id };
};

export const processUploads = async (userId: string, inserts: NewPost[], updates: { existingId: string; newData: NewPost }[]) => {
  const toastId = showLoading(`Processing import...`);
  try {
    const insertPromises = [];
    if (inserts.length > 0) {
      const insertsWithUserId = inserts.map(p => ({ ...p, user_id: userId, published: false })); // Always import as draft
      insertPromises.push(supabase.from("posts").insert(insertsWithUserId));
    }

    const updatePromises = updates.map(u =>
      supabase.from("posts").update({ ...u.newData, user_id: userId }).eq('id', u.existingId)
    );

    const results = await Promise.all([...insertPromises, ...updatePromises]);

    for (const result of results) {
      if (result.error) throw new Error(result.error.message);
    }

    updateToastSuccess(toastId, `${inserts.length} new posts added, ${updates.length} posts updated.`);
    return true;
  } catch (error: any) {
    updateToastError(toastId, `Import failed: ${error.message}`);
    return false;
  }
};

export const handleBulkDelete = async (selectedPosts: Set<string>) => {
  const toastId = showLoading(`Deleting ${selectedPosts.size} posts...`);
  const { error } = await supabase.from("posts").delete().in("id", Array.from(selectedPosts));
  if (error) {
    updateToastError(toastId, error.message);
    return false;
  } else {
    updateToastError(toastId, `${selectedPosts.size} posts removed.`);
    return true;
  }
};

export const handleBulkTagUpdate = async (selectedPosts: Set<string>, tags: string[]) => {
  const toastId = showLoading(`Updating tags for ${selectedPosts.size} posts...`);
  const { error } = await supabase
    .from("posts")
    .update({ tags })
    .in("id", Array.from(selectedPosts));

  if (error) {
    updateToastError(toastId, `Failed to update tags: ${error.message}`);
    return false;
  } else {
    updateToastSuccess(toastId, "Tags updated successfully.");
    return true;
  }
};

export const handleBulkStatusChange = async (selectedPosts: Set<string>, published: boolean) => {
  const status = published ? "published" : "unpublished";
  const toastId = showLoading(`Setting ${selectedPosts.size} posts to ${status}...`);
  const { error } = await supabase
    .from("posts")
    .update({ published })
    .in("id", Array.from(selectedPosts));

  if (error) {
    updateToastError(toastId, `Failed to update status: ${error.message}`);
    return false;
  } else {
    updateToastSuccess(toastId, `Posts marked as ${status}.`);
    return true;
  }
};

export const handleBulkDownload = async (posts: Post[], selectedPosts: Set<string>) => {
  const toastId = showLoading(`Preparing ${selectedPosts.size} post(s) for download...`);
  try {
    const zip = new JSZip();
    const postsToDownload = posts.filter(post => selectedPosts.has(post.id));

    postsToDownload.forEach(post => {
      const tagsString = post.tags && post.tags.length > 0 ? `\ntags: "${post.tags.join(', ').replace(/"/g, '\\"')}"` : '';
      const coverImageIdString = post.cover_image_id ? `\ncover_image_id: "${post.cover_image_id}"` : '';
      const youtubeVideoIdString = post.youtube_video_id ? `\nyoutube_video_id: "${post.youtube_video_id}"` : '';

      const frontmatter = `---
title: "${post.title.replace(/"/g, '\\"')}"
description: "${(post.description || '').replace(/"/g, '\\"')}"
published_at: ${post.published_at ? new Date(post.published_at).toISOString().split('T')[0] : ''}
published: ${post.published}${tagsString}${coverImageIdString}${youtubeVideoIdString}
---

`;
      // Ensure content has triple backticks
      let content = post.content || '';
      content = ensureContentHasTripleBackticks(content);

      const markdownContent = frontmatter + content;
      const sanitizedTitle = sanitizeFileName(post.title).replace(/\.[^/.]+$/, "");
      const fileName = (sanitizedTitle.trim().length > 0 ? sanitizedTitle : post.id) + ".md";
      zip.file(fileName, markdownContent);
    });

    const zipBlob = await zip.generateAsync({ type: "blob" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(zipBlob);
    link.download = "blog_export.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    updateToastSuccess(toastId, `${postsToDownload.length} post(s) downloaded.`);
    return true;
  } catch (error: any) {
    updateToastError(toastId, `Download failed: ${error.message}`);
    return false;
  }
};