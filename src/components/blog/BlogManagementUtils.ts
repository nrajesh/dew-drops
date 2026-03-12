import { localDataProvider } from "@/lib/LocalDataProvider";
import type { Post, GalleryImage } from "@/types";
import {
  showLoading,
  updateToastSuccess,
  updateToastError,
} from "@/utils/toast";
import TurndownService from "turndown";
import JSZip from "jszip";
import { sanitizeFileName, normalizeTag } from "@/lib/utils";

type NewPost = Omit<Post, "id" | "created_at" | "user_id">;

export const fetchPosts = async (): Promise<Post[]> => {
  return localDataProvider.getPosts();
};

export const fetchGalleryImages = async (): Promise<GalleryImage[]> => {
  return localDataProvider.getGalleryImages();
};

export const extractDescriptionFromContent = (content: string): string => {
  const contentLines = content.split("\n");
  let extractedDescription = "";
  const codeBlockRegex = /```([\s\S]*?)```/;
  const match = content.match(codeBlockRegex);

  if (match && match[1]) {
    const codeBlockLines = match[1].split("\n");
    extractedDescription = codeBlockLines.slice(0, 5).join("\n").trim();
  } else {
    extractedDescription = contentLines.slice(0, 5).join("\n").trim();
  }

  if (extractedDescription.length > 500) {
    extractedDescription = extractedDescription.substring(0, 497) + "...";
  }
  return extractedDescription;
};

export const stripOuterBackticks = (content: string): string => {
  if (!content) return "";
  let stripped = content;
  if (stripped.startsWith("```") && stripped.endsWith("```")) {
    stripped = stripped.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "");
  }
  return stripped;
};

export const parseWordPressXml = async (
  xmlString: string,
): Promise<NewPost[]> => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const items = xmlDoc.querySelectorAll("item");
  const newPosts: NewPost[] = [];
  const turndownService = new TurndownService();

  items.forEach((item) => {
    const title = item.querySelector("title")?.textContent || "";
    const pubDate =
      item.querySelector("pubDate")?.textContent || new Date().toISOString();
    let description = item.querySelector("description")?.textContent || "";
    let contentHtml =
      item.getElementsByTagNameNS("*", "encoded")[0]?.textContent || "";
    const status =
      item.querySelector("status, \\:status")?.textContent || "draft";

    contentHtml = contentHtml.replace(/<!--\s*(more|nextpage)\s*-->/gi, "");
    const content = turndownService.turndown(contentHtml);

    const categoryElements = item.querySelectorAll("category");
    const tagSet = new Set<string>();
    categoryElements.forEach((cat) => {
      const domain = cat.getAttribute("domain");
      if (domain === "category" || domain === "post_tag") {
        const nicename = cat.getAttribute("nicename");
        if (nicename) {
          tagSet.add(normalizeTag(nicename));
        }
      }
    });
    const tags = Array.from(tagSet);

    if (!description || description.trim() === "") {
      description = extractDescriptionFromContent(content);
    }

    if (title && content) {
      newPosts.push({
        title,
        description,
        content: content,
        published_at: new Date(pubDate).toISOString(),
        published: status === "publish",
        tags: tags.length > 0 ? tags : null,
        cover_image_id: null,
        youtube_video_id: null,
      });
    }
  });
  return newPosts;
};

export const parseMarkdownFile = async (file: File): Promise<NewPost> => {
  const fullContent = await file.text();
  let title = file.name.replace(/\.md$/, "");
  let description = "";
  let published_at = new Date().toISOString();
  let published = false;
  let content = fullContent;
  let tags: string[] | null = null;
  let cover_image_id: string | null = null;
  let youtube_video_id: string | null = null;

  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = fullContent.match(frontmatterRegex);

  if (match) {
    const frontmatterContent = match[1];
    content = match[2];
    frontmatterContent.split(/\r?\n/).forEach((line) => {
      const colonIndex = line.indexOf(":");
      if (colonIndex > -1) {
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        switch (key) {
          case "title":
            title = value;
            break;
          case "description":
            description = value;
            break;
          case "published_at":
          case "date": {
            const trimmedValue = value.trim();
            const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (dateOnlyRegex.test(trimmedValue)) {
              const parts = trimmedValue.split("-").map((p) => parseInt(p, 10));
              const utcDate = new Date(
                Date.UTC(parts[0], parts[1] - 1, parts[2]),
              );
              published_at = utcDate.toISOString();
            } else {
              const parsedDate = new Date(trimmedValue);
              if (!isNaN(parsedDate.getTime()))
                published_at = parsedDate.toISOString();
            }
            break;
          }
          case "published":
            published = value === "true";
            break;
          case "tags": {
            let rawTags = value;
            if (rawTags.startsWith("[") && rawTags.endsWith("]"))
              rawTags = rawTags.slice(1, -1);
            tags = rawTags
              .split(",")
              .map((tag) => normalizeTag(tag.replace(/^['"]|['"]$/g, "")))
              .filter(Boolean);
            break;
          }
          case "cover_image_id":
            cover_image_id = value;
            break;
          case "youtube_video_id":
            youtube_video_id = value;
            break;
        }
      }
    });
  }

  content = content.trim().replace(/<!--\s*(more|nextpage)\s*-->/gi, "");
  if (!description || description.trim() === "")
    description = extractDescriptionFromContent(content);

  return {
    title,
    description,
    content,
    published_at,
    published,
    tags,
    cover_image_id,
    youtube_video_id,
  };
};

export const processUploads = async (
  _userId: string,
  inserts: NewPost[],
  updates: { existingId: string; existingTitle: string; newData: NewPost }[],
) => {
  const toastId = showLoading(`Processing import locally...`);
  // In a real local setup, this would write back to the JSON or local storage.
  // For now, we notify the user that it's local only.
  updateToastSuccess(
    toastId,
    `${inserts.length} new posts and ${updates.length} updates processed locally. Note: Physical JSON files are not updated in this demo.`,
  );
  return true;
};

export const handleBulkDelete = async (
  postIds: Set<string>,
): Promise<boolean> => {
  const toastId = showLoading(`Deleting ${postIds.size} posts locally...`);
  updateToastSuccess(toastId, `${postIds.size} posts removed from local view.`);
  return true;
};

export const handleBulkTagUpdate = async (
  selectedPosts: Set<string>,
  _tags: string[],
) => {
  const toastId = showLoading(
    `Updating tags locally for ${selectedPosts.size} posts...`,
  );
  updateToastSuccess(toastId, "Tags updated locally.");
  return true;
};

export const handleBulkStatusChange = async (
  selectedPosts: Set<string>,
  published: boolean,
) => {
  const status = published ? "published" : "unpublished";
  const toastId = showLoading(
    `Setting ${selectedPosts.size} posts to ${status} locally...`,
  );
  updateToastSuccess(toastId, `Posts marked as ${status} locally.`);
  return true;
};

export const handleBulkDownload = async (
  postIds: Set<string>,
  allPosts: Post[],
): Promise<void> => {
  const toastId = showLoading(
    `Preparing ${postIds.size} post(s) for download...`,
  );
  try {
    const zip = new JSZip();
    const postsToDownload = allPosts.filter((post) => postIds.has(post.id));

    postsToDownload.forEach((post) => {
      const tagsString =
        post.tags && post.tags.length > 0
          ? `\ntags: "${post.tags.map(normalizeTag).join(", ").replace(/"/g, '\\"')}"`
          : "";
      const coverImageIdString = post.cover_image_id
        ? `\ncover_image_id: "${post.cover_image_id}"`
        : "";
      const youtubeVideoIdString = post.youtube_video_id
        ? `\nyoutube_video_id: "${post.youtube_video_id}"`
        : "";

      const frontmatter = `---
title: "${post.title.replace(/"/g, '\\"')}"
description: "${(post.description || "").replace(/"/g, '\\"')}"
published_at: ${post.published_at ? new Date(post.published_at).toISOString().split("T")[0] : ""}
published: ${post.published}${tagsString}${coverImageIdString}${youtubeVideoIdString}
---

`;
      const markdownContent = frontmatter + (post.content || "");
      const sanitizedTitle = sanitizeFileName(post.title).replace(
        /\.[^/.]+$/,
        "",
      );
      const fileName =
        (sanitizedTitle.trim().length > 0 ? sanitizedTitle : post.id) + ".md";
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

    updateToastSuccess(
      toastId,
      `${postsToDownload.length} post(s) downloaded.`,
    );
  } catch (error: unknown) {
    const err = error as Error;
    updateToastError(toastId, `Download failed: ${err.message}`);
  }
};
