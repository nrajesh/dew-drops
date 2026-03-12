/**
 * LocalCache: A persistent cache layer using localStorage or IndexedDB.
 * Currently focused on caching auto-generated tags and heavy metadata.
 */

class LocalCache {
  private static instance: LocalCache;
  private prefix = "dewdrops_cache_";

  private constructor() {}

  public static getInstance(): LocalCache {
    if (!LocalCache.instance) {
      LocalCache.instance = new LocalCache();
    }
    return LocalCache.instance;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Set a value in cache with an optional TTL (in milliseconds)
   */
  public set(key: string, value: unknown, ttl?: number): void {
    const item = {
      value,
      expiry: ttl ? Date.now() + ttl : null,
    };
    localStorage.setItem(this.getKey(key), JSON.stringify(item));
  }

  /**
   * Get a value from cache, returns null if expired or missing
   */
  public get(key: string): unknown | null {
    const itemStr = localStorage.getItem(this.getKey(key));
    if (!itemStr) return null;

    try {
      const item = JSON.parse(itemStr);
      if (item.expiry && Date.now() > item.expiry) {
        localStorage.removeItem(this.getKey(key));
        return null;
      }
      return item.value;
    } catch (e) {
      console.error("Cache parsing error", e);
      return null;
    }
  }

  /**
   * Cache for auto-generated tags based on a file identifier (name + size)
   */
  public getCachedTags(fileId: string): string[] | null {
    return this.get(`tags_${fileId}`) as string[] | null;
  }

  public setCachedTags(fileId: string, tags: string[]): void {
    this.set(`tags_${fileId}`, tags, 1000 * 60 * 60 * 24 * 30); // 30 days
  }

  /**
   * Cache for manual publish/unpublish overrides
   */
  public getCachedPublishStatus(fileId: string): boolean | null {
    return this.get(`pub_${fileId}`) as boolean | null;
  }

  public setCachedPublishStatus(fileId: string, status: boolean): void {
    this.set(`pub_${fileId}`, status, 1000 * 60 * 60 * 24 * 30); // 30 days
  }

  public clear(): void {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(this.prefix))
      .forEach((key) => localStorage.removeItem(key));
  }
}

export const localCache = LocalCache.getInstance();
