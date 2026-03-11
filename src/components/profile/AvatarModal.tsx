"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, Link as LinkIcon, XCircle } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";

const profileFormSchema = z.object({
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name cannot exceed 50 characters"),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name cannot exceed 50 characters"),
  avatar_url: z.string().url("Invalid URL").optional().or(z.literal("")),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface AvatarModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  form: UseFormReturn<ProfileFormValues>;
}

export const AvatarModal: React.FC<AvatarModalProps> = ({
  isOpen,
  onOpenChange,
  form,
}) => {
  const { session } = useAuth();
  const [isSavingAvatar, setIsSavingAvatar] = React.useState(false);
  const [avatarOption, setAvatarOption] = React.useState<"url" | "upload">(
    "url",
  );
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [filePreview, setFilePreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setAvatarOption(form.getValues("avatar_url") ? "url" : "upload");
      setSelectedFile(null);
      setFilePreview(null);
    }
  }, [isOpen, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setFilePreview(null);
    }
  };

  const handleSaveAvatar = async () => {
    setIsSavingAvatar(true);
    if (!session) {
      showError("User not logged in.");
      setIsSavingAvatar(false);
      return;
    }

    try {
      // Simulation: saving avatar
      await new Promise((resolve) => setTimeout(resolve, 1000));

      let newAvatarUrl = form.getValues("avatar_url");
      if (avatarOption === "upload" && selectedFile) {
        newAvatarUrl = filePreview || "";
      }

      console.log(
        "Simulated avatar save for:",
        session.user.email,
        "New URL:",
        newAvatarUrl,
      );

      form.setValue("avatar_url", newAvatarUrl || "");
      onOpenChange(false);
      showSuccess(
        "Avatar updated successfully (Simulation: local preview mode)!",
      );
    } catch (error: unknown) {
      const err = error as Error;
      showError(`Failed to update avatar: ${err.message}`);
    } finally {
      setIsSavingAvatar(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Avatar</DialogTitle>
        </DialogHeader>
        <Tabs
          defaultValue="url"
          className="w-full"
          onValueChange={(value) => setAvatarOption(value as "url" | "upload")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">
              <LinkIcon className="mr-2 h-4 w-4" /> Use URL
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="mr-2 h-4 w-4" /> Upload File
            </TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="avatar-url-input"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Avatar URL
              </label>
              <Input
                id="avatar-url-input"
                placeholder="https://example.com/avatar.jpg"
                value={form.watch("avatar_url") || ""}
                onChange={(e) => form.setValue("avatar_url", e.target.value)}
                className="mt-2"
              />
            </div>
            {form.watch("avatar_url") && (
              <div className="relative w-24 h-24 mx-auto">
                <Avatar className="w-full h-full">
                  <AvatarImage
                    src={form.watch("avatar_url")}
                    alt="Avatar Preview"
                  />
                  <AvatarFallback>URL</AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background"
                  onClick={() => form.setValue("avatar_url", "")}
                >
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="sr-only">Clear URL</span>
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="upload" className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="avatar-upload-input"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Upload Image
              </label>
              <Input
                id="avatar-upload-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-2"
              />
            </div>
            {filePreview && (
              <div className="relative w-24 h-24 mx-auto">
                <Avatar className="w-full h-full">
                  <AvatarImage src={filePreview} alt="File Preview" />
                  <AvatarFallback>File</AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background"
                  onClick={() => {
                    setSelectedFile(null);
                    setFilePreview(null);
                  }}
                >
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="sr-only">Clear File</span>
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveAvatar}
            disabled={
              isSavingAvatar || (avatarOption === "upload" && !selectedFile)
            }
          >
            {isSavingAvatar && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Avatar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
