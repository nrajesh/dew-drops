"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { GalleryImage } from '@/types';

const formSchema = z.object({
  alt_text: z.string().optional(),
  file_name: z.string().min(1, 'File name is required'),
  published: z.boolean().default(false),
  tags: z.string().optional(),
});

interface ImageFormDialogProps {
  image: GalleryImage | null;
  onSubmit: (formData: Omit<GalleryImage, 'id' | 'user_id' | 'created_at' | 'image_url'>, file: File | null) => void;
  onCancel: () => void;
}

export const ImageFormDialog = ({ image, onSubmit, onCancel }: ImageFormDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      alt_text: image?.alt_text || '',
      file_name: image?.file_name.split('/').pop()?.split('_').slice(1).join('_') || '',
      published: image?.published || false,
      tags: image?.tags?.join(', ') || '',
    },
  });

  useEffect(() => {
    if (image) {
      form.reset({
        alt_text: image.alt_text || '',
        file_name: image.file_name.split('/').pop()?.split('_').slice(1).join('_') || '',
        published: image.published,
        tags: image.tags?.join(', ') || '',
      });
    } else {
      form.reset({
        alt_text: '',
        file_name: '',
        published: false,
        tags: '',
      });
    }
    setSelectedFile(null);
  }, [image, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      form.setValue('file_name', event.target.files[0].name);
    }
  };

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const formData = {
      ...values,
      tags: values.tags ? values.tags.split(',').map(tag => tag.trim()) : [],
    };
    onSubmit(formData as Omit<GalleryImage, 'id' | 'user_id' | 'created_at' | 'image_url'>, selectedFile);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {!image && (
          <div className="space-y-2">
            <Label htmlFor="image-file">Image File</Label>
            <Input id="image-file" type="file" accept="image/*" onChange={handleFileChange} required={!image} />
            {selectedFile && <p className="text-sm text-muted-foreground">Selected: {selectedFile.name}</p>}
          </div>
        )}

        <FormField
          control={form.control}
          name="file_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File Name</FormLabel>
              <FormControl>
                <Input {...field} disabled={!!image} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="alt_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alt Text</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="A descriptive alt text for the image" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags (comma-separated)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., nature, landscape, travel" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="published"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Published</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Make this image visible in the public gallery.
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {image ? 'Save Changes' : 'Add Image'}
          </Button>
        </div>
      </form>
    </Form>
  );
};