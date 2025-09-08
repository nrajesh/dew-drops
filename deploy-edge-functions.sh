#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# Enable debugging output
set -x

echo "Starting Edge Function deployment script..."

# Your Supabase project reference
PROJECT_REF="dasjvafuudjotbaoawrj"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "Error: Supabase CLI could not be found. Please ensure it is installed and in your PATH."
    exit 1
fi

# Check if project ref is set
if [ -z "$PROJECT_REF" ]; then
  echo "Error: Supabase project reference is not set in the deploy-edge-functions.sh script."
  exit 1
fi

echo "Attempting to deploy all Edge Functions to project: $PROJECT_REF"

# Explicitly deploy generate-image-embedding first for debugging
echo "--> Attempting to deploy specific function: generate-image-embedding"
supabase functions deploy "generate-image-embedding" --project-ref "$PROJECT_REF" --no-verify-jwt
if [ $? -ne 0 ]; then
  echo "Error: Failed to deploy generate-image-embedding. Please check the logs above for details."
  exit 1
fi
echo "Successfully deployed generate-image-embedding."

# Find all other function directories and deploy them
for fn_dir in supabase/functions/*; do
  if [ -d "$fn_dir" ]; then
    fn_name=$(basename "$fn_dir")
    if [ "$fn_name" != "generate-image-embedding" ]; then # Skip if already deployed
      echo "--> Deploying function: $fn_name"
      supabase functions deploy "$fn_name" --project-ref "$PROJECT_REF" --no-verify-jwt
      if [ $? -ne 0 ]; then
        echo "Error: Failed to deploy function $fn_name. Please check the logs above for details."
        exit 1
      fi
      echo "Successfully deployed $fn_name."
    fi
  fi
done

echo "All specified Edge Functions deployment attempts completed."