import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ManagementPagination } from "@/components/ManagementPagination";
import type { TravelLocation } from "@/types";
import { Download, Edit, Trash2 } from "lucide-react";
import React from "react";

interface TravelLocationListProps {
  paginatedLocations: TravelLocation[];
  selectedLocations: Set<string>;
  allOnPageSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelectLocation: (id: string) => void;
  onEdit: (location: TravelLocation) => void;
  onTogglePublish: (location: TravelLocation) => void;
  onBulkDelete: () => void;
  onBulkPublish: (publishStatus: boolean) => void;
  onBulkDownload: () => void;
  currentPage: number;
  totalPages: number;
  locationsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: number) => void;
  totalItems: number;
  isLoading: boolean; // Added isLoading prop
}

export const TravelLocationList: React.FC<TravelLocationListProps> = ({
  paginatedLocations,
  selectedLocations,
  allOnPageSelected,
  onSelectAll,
  onSelectLocation,
  onEdit,
  onTogglePublish,
  onBulkDelete,
  onBulkPublish,
  onBulkDownload,
  currentPage,
  totalPages,
  locationsPerPage,
  onPageChange,
  onItemsPerPageChange,
  totalItems,
  isLoading,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Travel Log</CardTitle>
            <CardDescription>Your current list of visited places.</CardDescription>
          </div>
          {selectedLocations.size > 0 && (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Bulk Actions ({selectedLocations.size})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onBulkPublish(true)}>
                    Publish Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkPublish(false)}>
                    Unpublish Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onBulkDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete ({selectedLocations.size})</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete {selectedLocations.size} selected locations and any associated images.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel onClick={() => {}}>Cancel</AlertDialogCancel><AlertDialogAction onClick={onBulkDelete}>Continue</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <p>Loading locations...</p> : paginatedLocations.length > 0 ? (
          <>
            <div className="flex items-center border-b pb-2 mb-2 space-x-3">
              <Checkbox id="select-all" onCheckedChange={(checked) => onSelectAll(Boolean(checked))} checked={allOnPageSelected} disabled={paginatedLocations.length === 0}/>
              <label htmlFor="select-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Select All</label>
            </div>
            <div className="space-y-2 mt-4">
              {paginatedLocations.map((location) => (
                <div key={location.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Checkbox id={`select-${location.id}`} checked={selectedLocations.has(location.id)} onCheckedChange={() => onSelectLocation(location.id)}/>
                    <label htmlFor={`select-${location.id}`} className="font-medium truncate pr-2 cursor-pointer">{location.title}</label>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={location.published}
                      onCheckedChange={() => onTogglePublish(location)}
                      aria-label="Publish status"
                    />
                    <Button variant="ghost" size="icon" onClick={() => onEdit(location)}><Edit className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-center pt-4">No locations yet. Add one using the form!</p>
        )}
      </CardContent>
      <CardFooter>
        <ManagementPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          itemsPerPage={locationsPerPage}
          onItemsPerPageChange={onItemsPerPageChange}
          totalItems={totalItems}
        />
      </CardFooter>
    </Card>
  );
};