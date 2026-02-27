import { Suspense, useEffect, useState, useMemo, useRef, lazy } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapPin, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { TravelLocation } from "@/types";
import { showError } from "@/utils/toast";
import type { MapRef } from "@/components/Map";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { PaginationControls } from "@/components/PaginationControls";
import { usePaginationNavigation } from "@/hooks/usePaginationNavigation";

const LazyMapComponent = lazy(() => import("@/components/Map"));
const LOCATIONS_PER_PAGE = 3;

const Travel = () => {
  const [allLocations, setAllLocations] = useState<TravelLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    const fetchLocationsAndPosts = async () => {
      setLoading(true);
      const { data: locationsData, error: locationsError } = await supabase
        .from("travel_locations")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (locationsError) {
        showError("Could not fetch travel locations.");
        console.error(locationsError);
        setLoading(false);
        return;
      }

      const postIds = locationsData
        .map((l) =>
          l.blog_url?.startsWith("/blog/") ? l.blog_url.split("/").pop() : null,
        )
        .filter((id): id is string => id !== null);

      if (postIds.length > 0) {
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select("id, title")
          .in("id", postIds);

        if (postsError) {
          console.error("Could not fetch linked blog posts:", postsError);
          setAllLocations(locationsData as TravelLocation[]);
        } else {
          const postsMap = new Map(postsData.map((p) => [p.id, p.title]));
          const enrichedLocations = locationsData.map((loc) => {
            const postId = loc.blog_url?.split("/").pop();
            return {
              ...loc,
              blog_title: postId ? postsMap.get(postId) : undefined,
            };
          });
          setAllLocations(enrichedLocations as TravelLocation[]);
        }
      } else {
        setAllLocations(locationsData as TravelLocation[]);
      }

      setLoading(false);
    };

    fetchLocationsAndPosts();
  }, []);

  const filteredLocations = useMemo(() => {
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    return allLocations.filter(
      (loc) =>
        !lowercasedTerm ||
        loc.title.toLowerCase().includes(lowercasedTerm) ||
        loc.name.toLowerCase().includes(lowercasedTerm) ||
        (loc.description &&
          loc.description.toLowerCase().includes(lowercasedTerm)),
    );
  }, [allLocations, debouncedSearchTerm]);

  const totalPages = Math.ceil(filteredLocations.length / LOCATIONS_PER_PAGE);
  const paginatedLocations = filteredLocations.slice(
    (currentPage - 1) * LOCATIONS_PER_PAGE,
    currentPage * LOCATIONS_PER_PAGE,
  );

  usePaginationNavigation({
    currentPage,
    totalPages,
    onPageChange: setCurrentPage,
    targetRef: containerRef,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-112px)]" ref={containerRef}>
      <div className="flex-grow space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Travel Map</h1>
          <p className="text-muted-foreground">The world as I've seen it.</p>
        </div>

        <div className="relative sm:max-w-xs mx-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search locations..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex flex-col lg:flex-row gap-8">
            <Skeleton className="lg:w-2/3 h-[550px] rounded-lg" />
            <div className="lg:w-1/3 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : filteredLocations.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-2/3 h-[550px]">
              <Suspense
                fallback={<Skeleton className="h-full w-full rounded-lg" />}
              >
                <LazyMapComponent ref={mapRef} locations={allLocations} />
              </Suspense>
            </div>

            <div className="lg:w-1/3 flex flex-col">
              <div className="space-y-4 flex-grow">
                {paginatedLocations.map((location) => (
                  <Card
                    key={location.id}
                    className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer flex flex-col"
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
                      <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground">
                          {location.description}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
              <div className="pt-4">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 border-dashed border-2 rounded-lg bg-muted">
            <p className="text-muted-foreground">
              No locations found for your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Travel;
