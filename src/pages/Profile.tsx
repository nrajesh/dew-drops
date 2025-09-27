"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { PasswordForm } from "@/components/profile/PasswordForm";
import { AvatarModal } from "@/components/profile/AvatarModal";
import { AccountActions } from "@/components/profile/AccountActions";
import { showSuccess, showError } from "@/utils/toast";
import { FontSettingsControl } from "@/components/FontSettingsControl"; // Import the new component

const profileFormSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(50, "First name cannot exceed 50 characters"),
  last_name: z.string().min(1, "Last name is required").max(50, "Last name cannot exceed 50 characters"),
  avatar_url: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const Profile = () => {
  const { user, profile, loading, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = React.useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = React.useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      avatar_url: "",
    },
  });

  React.useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        avatar_url: profile.avatar_url || "",
      });
    }
  }, [profile, form]);

  const onSubmitProfile = async (values: ProfileFormValues) => {
    setIsSubmittingProfile(true);
    if (!user) {
      showError("User not logged in.");
      setIsSubmittingProfile(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: values.first_name,
          last_name: values.last_name,
          avatar_url: values.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }
      showSuccess("Profile updated successfully!");
      fetchProfile();
    } catch (error: any) {
      showError(`Failed to update profile: ${error.message}`);
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Loading profile...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] space-y-4">
        <h2 className="text-2xl font-bold">Please Log In</h2>
        <p className="text-muted-foreground">You need to be logged in to view your profile settings.</p>
        <Button onClick={() => navigate("/login")}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Profile Settings</h2>
      <div className="grid gap-6 lg:grid-cols-2 max-w-4xl mx-auto">
        <ProfileForm
          form={form}
          onSubmit={onSubmitProfile}
          isSubmitting={isSubmittingProfile}
          setIsAvatarModalOpen={setIsAvatarModalOpen}
        />
        <PasswordForm />
      </div>

      <div className="max-w-4xl mx-auto mt-6">
        <FontSettingsControl /> {/* New component added here */}
      </div>

      <div className="max-w-4xl mx-auto mt-6">
        <AccountActions onLogout={handleLogout} />
      </div>

      <AvatarModal
        isOpen={isAvatarModalOpen}
        onOpenChange={setIsAvatarModalOpen}
        form={form}
      />
    </div>
  );
};

export default Profile;