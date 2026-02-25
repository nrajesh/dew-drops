import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { TravelLocation } from '@/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

const VITE_MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface MapProps {
  locations: TravelLocation[];
}

export interface MapRef {
  triggerPopup: (locationId: string) => void;
}

const MapComponent = forwardRef<MapRef, MapProps>(({ locations }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  // Suppress Mapbox analytics errors
  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = function (...args) {
      if (typeof args[0] === 'string' && args[0].includes('events.mapbox.com')) {
        return; // Suppress Mapbox analytics errors
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError; // Restore original console.error
    };
  }, []);

  useImperativeHandle(ref, () => ({
    triggerPopup: (locationId: string) => {
      const marker = markersRef.current.get(locationId);
      if (marker && map.current) {
        map.current.flyTo({
          center: marker.getLngLat(),
          zoom: 12,
          speed: 1.5,
        });
        if (!marker.getPopup()?.isOpen()) {
          marker.togglePopup();
        }
      }
    },
  }));

  useEffect(() => {
    if (!VITE_MAPBOX_ACCESS_TOKEN) {
      console.error("Mapbox access token is not set.");
      return;
    }

    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = VITE_MAPBOX_ACCESS_TOKEN;
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
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    // Add new markers
    locations.forEach(location => {
      if (location.latitude && location.longitude) {
        const blogLink = location.blog_url && location.blog_title
          ? `<a href="${location.blog_url}" target="_blank" rel="noopener noreferrer" style="font-size: 0.75rem; color: inherit; text-decoration: underline;">${location.blog_title}</a>`
          : '';

        const popupHtml = `
          <div style="text-align: center; display: flex; flex-direction: column; gap: 4px;">
            <h3 style="font-weight: bold; font-size: 0.875rem; margin: 0;">${location.title}</h3>
            <p style="font-size: 0.75rem; margin: 0;">${location.name}</p>
            ${blogLink}
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25, className: 'custom-popup' }).setHTML(popupHtml);

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

        markersRef.current.set(location.id, marker);
      }
    });

  }, [locations]);

  if (!VITE_MAPBOX_ACCESS_TOKEN) {
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

  return <div ref={mapContainer} className="h-full w-full rounded-lg border" />;
});

MapComponent.displayName = "Map";

export default MapComponent;