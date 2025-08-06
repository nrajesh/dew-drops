import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";

const images = [
  { src: "https://images.unsplash.com/photo-1588392382834-a891154bca4d?q=80&w=2075&auto=format&fit=crop", alt: "Lush green forest" },
  { src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1948&auto=format&fit=crop", alt: "Misty mountains" },
  { src: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=2070&auto=format&fit=crop", alt: "Forest path" },
  { src: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=1974&auto=format&fit=crop", alt: "Waterfall" },
  { src: "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=2175&auto=format&fit=crop", alt: "Green hills" },
  { src: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop", alt: "Field with a single tree" },
];

const Gallery = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Gallery</h1>
        <p className="text-muted-foreground">A few snapshots from my life.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((image, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-0">
              <AspectRatio ratio={4 / 3}>
                <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
              </AspectRatio>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Gallery;