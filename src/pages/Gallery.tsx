import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";

// To add your own images:
// 1. Create a 'gallery' folder inside the 'public' directory.
// 2. Place your image files (e.g., my-photo.jpg) inside 'public/gallery'.
// 3. Add a new entry to the 'images' array below, like:
//    { src: "/gallery/my-photo.jpg", alt: "A description of my photo" }

const images = [
  // Note: These are placeholder paths. You need to add your own images.
  // I've used a real placeholder image from your public folder to show how it works.
  { src: "/placeholder.svg", alt: "A placeholder image" },
  { src: "/placeholder.svg", alt: "Another placeholder image" },
  { src: "/placeholder.svg", alt: "Yet another placeholder image" },
  { src: "/placeholder.svg", alt: "You get the idea" },
  { src: "/placeholder.svg", alt: "Add your own images" },
  { src: "/placeholder.svg", alt: "In the public/gallery folder" },
];

const Gallery = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Gallery</h1>
        <p className="text-muted-foreground">A few snapshots from my life.</p>
      </div>
      <div className="p-4 border-dashed border-2 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground text-center mb-4">
          <strong>How to add your photos:</strong> Create a <code>public/gallery</code> folder, add your images there, and then update the list in the <code>src/pages/Gallery.tsx</code> file.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-0">
                <AspectRatio ratio={4 / 3}>
                  <img src={image.src} alt={image.alt} className="h-full w-full object-cover bg-background" />
                </AspectRatio>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Gallery;