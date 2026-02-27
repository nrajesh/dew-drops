import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Post } from "@/types";

type NewPost = Omit<Post, "id" | "created_at" | "user_id">;

interface UpdatePostsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  postsToInsert: NewPost[];
  postsToUpdate: {
    existingId: string;
    existingTitle: string;
    newData: NewPost;
  }[];
  selectedUpdates: Set<string>;
  onSelectedUpdatesChange: (newSelection: Set<string>) => void;
  onConfirm: () => void;
}

export const UpdatePostsDialog = ({
  isOpen,
  onOpenChange,
  postsToInsert,
  postsToUpdate,
  selectedUpdates,
  onSelectedUpdatesChange,
  onConfirm,
}: UpdatePostsDialogProps) => {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectedUpdatesChange(new Set(postsToUpdate.map((p) => p.existingId)));
    } else {
      onSelectedUpdatesChange(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedUpdates);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    onSelectedUpdatesChange(newSelection);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Updates</DialogTitle>
          <DialogDescription>
            The following posts already exist. Select the ones you want to
            update with the data from your file(s). Unselected posts will be
            skipped.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 border-b pb-2">
          <Checkbox
            id="select-all-updates"
            checked={
              postsToUpdate.length > 0 &&
              selectedUpdates.size === postsToUpdate.length
            }
            onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
          />
          <label
            htmlFor="select-all-updates"
            className="text-sm font-medium leading-none"
          >
            Select All
          </label>
        </div>
        <div className="max-h-60 overflow-y-auto space-y-2 p-1">
          {postsToUpdate.map((item) => (
            <div
              key={item.existingId}
              className="flex items-center space-x-2 p-2 border rounded-md"
            >
              <Checkbox
                id={`update-${item.existingId}`}
                checked={selectedUpdates.has(item.existingId)}
                onCheckedChange={(checked) =>
                  handleSelectOne(item.existingId, Boolean(checked))
                }
              />
              <label
                htmlFor={`update-${item.existingId}`}
                className="text-sm font-medium leading-none"
              >
                Update "{item.existingTitle}"
              </label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Import ({postsToInsert.length}) & Update ({selectedUpdates.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
