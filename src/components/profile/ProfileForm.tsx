"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload } from "lucide-react";
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

interface ProfileFormProps {
  form: UseFormReturn<ProfileFormValues>;
  onSubmit: (values: ProfileFormValues) => void;
  isSubmitting: boolean;
  setIsAvatarModalOpen: (isOpen: boolean) => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  form,
  onSubmit,
  isSubmitting,
  setIsAvatarModalOpen,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Your Profile</CardTitle>
        <CardDescription>
          Update your personal information and avatar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={form.watch("avatar_url") || "/gallery/placeholder.svg"}
                    alt="User Avatar"
                  />
                  <AvatarFallback>
                    {form.watch("first_name")?.charAt(0) || ""}
                    {form.watch("last_name")?.charAt(0) || ""}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full bg-background group-hover:scale-105 transition-transform"
                  onClick={() => setIsAvatarModalOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                  <span className="sr-only">Change Avatar</span>
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
