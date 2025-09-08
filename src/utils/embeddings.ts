import { GalleryImage } from '@/types';

export const searchImagesByMetadata = async (searchTerm: string, images: GalleryImage[]): Promise<GalleryImage[]> => {
  const lowerSearchTerm = searchTerm.toLowerCase();
  const searchTerms = lowerSearchTerm.split(/\s+/).filter(term => term.length > 0);

  return images.filter(image => {
    const filenameMatch = searchTerms.some(term =>
      image.file_name.toLowerCase().includes(term)
    );
    const altTextMatch = image.alt_text?.toLowerCase().includes(lowerSearchTerm) || false;
    let exifMatch = false;
    if (image.exif_data) {
      for (const value of Object.values(image.exif_data)) {
        if (String(value).toLowerCase().includes(lowerSearchTerm)) {
          exifMatch = true;
          break;
        }
      }
    }
    return filenameMatch || altTextMatch || exifMatch;
  });
};