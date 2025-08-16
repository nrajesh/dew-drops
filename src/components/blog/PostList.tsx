import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit, Download, Tag } from "lucide-react";
import type { Post } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { MultiSelectPopover } from "@/components/MultiSelectPopover";

interface PostListProps {
  posts: Post[];
  selectedPosts: Set<string>;
  onSelectPost: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onEdit: (post: Post) => void;
  onDelete: () => void;
  onDownload: () => void;
  onBulkTagUpdate: (tags: string[]) => void;
  uniqueTags: string[];
}

export const PostList = ({ posts, selectedPosts, onSelectPost, onSelectAll, onEdit, onDelete, onDownload, onBulkTagUpdate, uniqueTags }: PostListProps) => {
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [bulkEditTags, setBulkEditTags] = useState<string[]>([]);

  const handleSaveTags = () => {
    onBulkTagUpdate(bulkEditTags);
    setIsTagDialogOpen(false);
    setBulkEditTags([]);
  };

  const handleCancel = () => {
    setIsTagDialogOpen(false);
    setBulkEditTags([]);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Post List</CardTitle>
              <CardDescription>Your current list of blog posts.</CardDescription>
            </div>
            {selectedPosts.size > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsTagDialogOpen(true)}>
                  <Tag className="h-4 w-4 mr-2" />
                  Edit Tags
                </Button>
                <Button variant="outline" size="sm" onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download ({selectedPosts.size})
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete ({selectedPosts.size})</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently delete {selectedPosts.size} selected posts.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center border-b pb-2 mb-2 space-x-3">
            <Checkbox id="select-all" onCheckedChange={(checked) => onSelectAll(Boolean(checked))} checked={posts.length > 0 && selectedPosts.size === posts.length} disabled={posts.length === 0} />
            <label htmlFor="select-all" className="text-sm font-medium">Select All</label>
          </div>
          <div className="space-y-2 mt-4">
            {posts.length > 0 ? (
              posts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Checkbox id={`select-${post.id}`} checked={selectedPosts.has(post.id)} onCheckedChange={() => onSelectPost(post.id)} />
                    <label htmlFor={`select-${post.id}`} className="font-medium truncate pr-2 cursor-pointer">{post.title}</label>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(post)}><Edit className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center pt-4">No posts yet. Add one using the form!</p>
            )}
          </div>
        </CardContent>
      </Card>
      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit Tags</DialogTitle>
            <DialogDescription>
              Set new tags for the {selectedPosts.size} selected posts. This will overwrite their existing tags.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <MultiSelectPopover
              suggestions={uniqueTags}
              value={bulkEditTags}
              onChange={setBulkEditTags}
              placeholder="Select or create tags..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSaveTags}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};