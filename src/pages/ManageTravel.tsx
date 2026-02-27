import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { TravelLocationForm } from "@/components/travel/TravelLocationForm.tsx";
import { BulkUploadCard } from "@/components/travel/BulkUploadCard";
import { TravelLocationList } from "@/components/travel/TravelLocationList";
import { useTravelManagement } from "@/hooks/useTravelManagement";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const ManageTravel = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    blogPosts,
    editingLocation,
    editingImageUrl,
    uploadFile,
    isUploading,
    selectedLocations,
    currentPage,
    locationsPerPage,
    isUpdateDialogVisible,
    locationsToInsert,
    locationsToUpdate,
    selectedUpdates,
    paginatedLocations,
    totalPages,
    allOnPageSelected,

    setSelectedUpdates,
    setIsUpdateDialogVisible,
    onSubmit,
    handleEdit,
    handleRemoveImage,
    cancelEdit,
    handleFileSelect,
    handleBulkUpload,
    handleConfirmAndProcessUploads,
    handleBulkDeleteWrapper,
    handleBulkPublishWrapper,
    handleBulkDownloadWrapper,
    handleSelectLocation,
    handleSelectAll,
    handleTogglePublish,
    setCurrentPage,
    handleItemsPerPageChange,
    totalItems,
    isLoading,
    searchTerm,
    setSearchTerm,
  } = useTravelManagement(containerRef);

  return (
    <div className="space-y-8" ref={containerRef}>
      <BulkUploadCard
        uploadFile={uploadFile}
        onFileSelect={handleFileSelect}
        onBulkUpload={handleBulkUpload}
        isUploading={isUploading}
        fileInputRef={fileInputRef}
      />
      <div className="grid gap-8 md:grid-cols-2">
        <TravelLocationForm
          editingLocation={editingLocation}
          editingImageUrl={editingImageUrl}
          blogPosts={blogPosts}
          onSubmit={onSubmit}
          onCancel={cancelEdit}
          onRemoveImage={handleRemoveImage}
        />
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8"
            />
          </div>
          <TravelLocationList
            paginatedLocations={paginatedLocations}
            selectedLocations={selectedLocations}
            allOnPageSelected={allOnPageSelected}
            onSelectAll={handleSelectAll}
            onSelectLocation={handleSelectLocation}
            onEdit={handleEdit}
            onTogglePublish={handleTogglePublish}
            onBulkDelete={handleBulkDeleteWrapper}
            onBulkPublish={handleBulkPublishWrapper}
            onBulkDownload={handleBulkDownloadWrapper}
            currentPage={currentPage}
            totalPages={totalPages}
            locationsPerPage={locationsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={handleItemsPerPageChange}
            totalItems={totalItems}
            isLoading={isLoading}
          />
        </div>
      </div>
      <Dialog
        open={isUpdateDialogVisible}
        onOpenChange={setIsUpdateDialogVisible}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Updates</DialogTitle>
            <DialogDescription>
              The following locations already exist. Select the ones you want to
              update with the data from your CSV file. Unselected locations will
              be skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 border-b pb-2">
            <Checkbox
              id="select-all-updates-travel"
              checked={
                locationsToUpdate.length > 0 &&
                selectedUpdates.size === locationsToUpdate.length
              }
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedUpdates(
                    new Set(locationsToUpdate.map((l) => l.existingId)),
                  );
                } else {
                  setSelectedUpdates(new Set());
                }
              }}
            />
            <label
              htmlFor="select-all-updates-travel"
              className="text-sm font-medium leading-none"
            >
              Select All
            </label>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 p-1">
            {locationsToUpdate.map((item) => (
              <div
                key={item.existingId}
                className="flex items-center space-x-2 p-2 border rounded-md"
              >
                <Checkbox
                  id={`update-${item.existingId}`}
                  checked={selectedUpdates.has(item.existingId)}
                  onCheckedChange={(checked) => {
                    const newSelection = new Set(selectedUpdates);
                    if (checked) {
                      newSelection.add(item.existingId);
                    } else {
                      newSelection.delete(item.existingId);
                    }
                    setSelectedUpdates(newSelection);
                  }}
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
            <Button
              variant="outline"
              onClick={() => setIsUpdateDialogVisible(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmAndProcessUploads}>
              Import ({locationsToInsert.length}) & Update (
              {selectedUpdates.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageTravel;
