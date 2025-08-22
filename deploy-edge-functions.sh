#!/bin/bash

# Deploy generate-image-embedding function
echo "Deploying generate-image-embedding function..."
supabase functions deploy generate-image-embedding --project-ref dasjvafuudjotbaoawrj

# Deploy search-gallery-images function
echo "Deploying search-gallery-images function..."
supabase functions deploy search-gallery-images --project-ref dasjvafuudjotbaoawrj

echo "Functions deployed successfully!"