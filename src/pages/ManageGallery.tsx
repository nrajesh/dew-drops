"use client";

import React from 'react';
import { ImageManagementCard } from '@/components/gallery/ImageManagementCard';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster

const ManageGallery = () => {
  return (
    <div className="container mx-auto p-4">
      <ImageManagementCard />
      <Toaster /> {/* Render Toaster here */}
    </div>
  );
};

export default ManageGallery;