import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { TravelLocation } from '@/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface MapProps {
  locations: TravelLocation[];
  focusedLocation: TravelLocation | null;
}

const Map: React.FC<MapProps> = ({ locations, focusedLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());

  useEffect(() => {
    if (!MAPBOX_ACCESS_TOKEN) {
      console.error("Mapbox access token is not set.");
      return;
    }

    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [10, 45],
      zoom: 1.5,
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current.clear();

    // Add new markers
    locations.forEach(location => {
      if (location.latitude && location.longitude) {
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div class="p-1"><h3 class="font-bold text-base">${location.title}</h3><p class="text-sm">${location.name}</p></div>`
        );

        let marker;

        if (location.marker_image_url) {
          const el = document.createElement('div');
          el.style.backgroundImage = `url(${location.marker_image_url})`;
          el.style.width = '40px';
          el.style.height = '40px';
          el.style.backgroundSize = 'cover';
          el.style.borderRadius = '50%';
          el.style.border = '2px solid white';
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
          el.style.cursor = 'pointer';

          marker = new mapboxgl.Marker(el)
            .setLngLat([location.longitude, location.latitude])
            .setPopup(popup)
            .addTo(map.current!);
        } else {
          marker = new mapboxgl.Marker()
            .setLngLat([location.longitude, location.latitude])
            .setPopup(popup)
            .addTo(map.current!);
        }
        
        markers.current.set(location.id, marker);
      }
    });

  }, [locations]);

  useEffect(() => {
    if (map.current && focusedLocation) {
      map.current.flyTo({
        center: [focusedLocation.longitude, focusedLocation.latitude],
        zoom: 12,
        essential: true,
      });

      const marker = markers.current.get(focusedLocation.id);
      if (marker && !marker.getPopup().isOpen()) {
        // Close all other popups before opening the new one
        markers.current.forEach(m => m.getPopup().isOpen() && m.togglePopup());
        marker.togglePopup();
      }
    }
  }, [focusedLocation]);

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Mapbox Configuration Error</AlertTitle>
        <AlertDescription>
          The Mapbox access token is missing. Please create a <code>.env.local</code> file and add: <code>VITE_MAPBOX_ACCESS_TOKEN=your_token_here</code>. Then, restart the application.
        </AlertDescription>
      </Alert>
    );
  }

  return <div ref={mapContainer} className="h-[450px] w-full rounded-lg border" />;
};

export default Map;