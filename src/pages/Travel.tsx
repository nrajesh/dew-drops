import React, { Suspense, useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { TravelLocation } from "@/types";
import { showError } from "@/utils/toast";
import type { MapRef } from "@/components/Map";

const MapComponent = React.lazy(() => import('@/components/Map'));

const Travel = () => {
  const [locations, setLocations] = useState<TravelLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    const fetchLocationsAndPosts = async () => {
      setLoading(true);
      const { data: locationsData, error: locationsError } = await supabase
        .from("travel_locations")
        .select("*")
        .order("created_at", { ascending: false });

      if (locationsError) {
        showError("Could not fetch travel locations.");
        console.error(locationsError);
        setLoading(false);
        return;
      }

      const postIds = locationsData
        .map(l => l.blog_url?.startsWith('/blog/') ? l.blog_url.split('/').pop() : null)
        .filter((id): id is string => id !== null);

      if (postIds.length > 0) {
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('id, title')
          .in('id', postIds);
        
        if (postsError) {
          console.error("Could not fetch linked blog posts:", postsError);
          setLocations(locationsData as TravelLocation[]);
        } else {
          const postsMap = new Map(postsData.map(p => [p.id, p.title]));
          const enrichedLocations = locationsData.map(loc => {
            const postId = loc.blog_url?.split('/').pop();
            return {
              ...loc,
              blog_title: postId ? postsMap.get(postId) : undefined,
            };
          });
          setLocations(enrichedLocations as TravelLocation[]);
        }
      } else {
        setLocations(locationsData as TravelLocation[]);
      }
      
      setLoading(false);
    };

    fetchLocationsAndPosts();
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Travel Map</h1>
        <p className="text-muted-foreground">
          Explore my travels on the map below, or click a card to learn more.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-[450px] w-full rounded-lg" />}>
        <MapComponent ref={mapRef} locations={locations} />
      </Suspense>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : locations.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <Card 
              key={location.id} 
              className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer flex flex-col"
              onClick={() => mapRef.current?.triggerPopup(location.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {location.title}
                </CardTitle>
                <CardDescription>{location.name}</CardDescription>
              </CardHeader>
              {location.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{location.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border rounded-lg bg-muted">
          <p className="text-muted-foreground">No travel locations have been added yet.</p>
          <p className="text-sm text-muted-foreground mt-2">Go to "Manage Travel" to add your first pin!</p>
        </div>
      )}
    </div>
  );
};

export default Travel;