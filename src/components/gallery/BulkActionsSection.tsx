"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Eye, EyeOff } from 'lucide-react';

interface BulkActionsSectionProps {
  selectedItemCount: number;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
  itemType: string; // e.g., "images", "posts"
}

export const BulkActionsSection = ({
  selectedItemCount,
  onPublish,
  onUnpublish,
  onDelete,
  itemType,
}: BulkActionsSectionProps) => {
  if (selectedItemCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-3 bg-muted rounded-md mb-4">
      <p className="text-sm text-muted-foreground">
        {selectedItemCount} {itemType} selected
      </p>
      <div className="flex space-x-2">
        <Button variant="outline" size="sm" onClick={onPublish}>
          <Eye className="mr-2 h-4 w-4" /> Publish
        </Button>
        <Button variant="outline" size="sm" onClick={onUnpublish}>
          <EyeOff className="mr-2 h-4 w-4" /> Unpublish
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>
    </div>
  );
};