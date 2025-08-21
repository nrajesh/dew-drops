import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateEmbedding, searchSimilarImages } from '@/utils/embeddings';
import { GalleryImage } from '@/types';
import { showError, showLoading, dismissToast } from '@/utils/toast';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';

interface ImageSearchProps {
  onResults: (images: GalleryImage[]) => void;
}

export const ImageSearch = ({ onResults }: ImageSearchProps) => {
  const [searchFile, setSearchFile] = useState<File | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSearchFile(e.target.files[0]);
    }
  };

  const handleSearch = async () => {
    if (!searchFile) {
      showError('Please select an image to search with');
      return;
    }

    setIsSearching(true);
    const toastId = showLoading('Searching for similar images...');

    try {
      // In a real implementation, we would:
      // 1. Upload the image to a temporary location
      // 2. Generate an embedding for the image
      // 3. Search for similar images using the embedding

      // For this example, we'll simulate the process
      const imageUrl = URL.createObjectURL(searchFile);
      const embedding = await generateEmbedding(imageUrl);
      const results = await searchSimilarImages(embedding, 6);

      onResults(results);
    } catch (error) {
      showError('Failed to search for similar images');
      console.error(error);
    } finally {
      dismissToast(toastId);
      setIsSearching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visual Search</CardTitle>
        <CardDescription>
          Upload an image to find similar images in your gallery.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="flex-grow"
          />
          <Button onClick={handleSearch} disabled={!searchFile || isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const ImageSearchResults = ({ images }: { images: GalleryImage[] }) => {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Similar Images</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {images.map((image) => (
          <Card key={image.id} className="overflow-hidden">
            <CardContent className="p-0">
              <AspectRatio ratio={1}>
                <img
                  src={image.image_url}
                  alt={image.alt_text || "Gallery image"}
                  className="h-full w-full object-cover"
                />
              </AspectRatio>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};