import { localDataProvider } from "@/lib/LocalDataProvider";

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  similarity: number;
}

/**
 * local-based search for posts.
 * Replaces the Supabase RPC call with a simple client-side search.
 *
 * @param queryText The search query.
 * @param limit Max number of results.
 */
export const searchSimilarPosts = async (
  queryText: string,
  limit = 5,
): Promise<SearchResult[]> => {
  const posts = localDataProvider.getPosts();
  const lowerQuery = queryText.toLowerCase();

  const results = posts
    .map((post) => {
      let score = 0;
      if (post.title.toLowerCase().includes(lowerQuery)) score += 0.8;
      if (post.description?.toLowerCase().includes(lowerQuery)) score += 0.5;
      if (post.content?.toLowerCase().includes(lowerQuery)) score += 0.3;

      return {
        id: post.id,
        title: post.title,
        description: post.description || "",
        similarity: score,
      };
    })
    .filter((res) => res.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results;
};
