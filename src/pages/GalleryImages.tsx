"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ManagementPagination } from '@/components/ManagementPagination';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'react-hot-toast';

interface GalleryImage {
  id: string;
  image_url: string;
  alt_text: string;
  file_name: string;
  created_at: string;
}

const GalleryImages = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage - 1;

      const { data, error, count } = await supabase
        .from('gallery_images')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(startIndex, endIndex);

      if (error) {
        throw error;
      }

      setImages(data || []);
      setTotalItems(count || 0);
    } catch (err: any) {
      console.error("Error fetching gallery images:", err);
      setError(err.message || "Failed to fetch images.");
      toast.error(err.message || "Failed to fetch images.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when items per page changes
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Gallery Images</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(itemsPerPage)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {images.length === 0 ? (
            <p className="text-center text-gray-500">No images found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <Card key={image.id}>
                  <CardHeader>
                    <CardTitle>{image.file_name}</CardTitle>
                    <CardDescription>{image.alt_text || 'No alt text'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {image.image_url ? (
                      <img
                        src={image.image_url}
                        alt={image.alt_text || image.file_name}
                        className="w-full h-48 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded-md text-gray-500">
                        No Image
                      </div>
                    )}
                    <p className="text-sm text-gray-500 mt-2">Created: {new Date(image.created_at).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <ManagementPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        totalItems={totalItems}
      />
    </div>
  );
};

export default GalleryImages;