#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Your Supabase project reference
PROJECT_REF="dasjvafuudjotbaoawrj"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "Supabase CLI could not be found. Please ensure it is installed."
    exit 1
fi

# Check if project ref is set
if [ -z "$PROJECT_REF" ]; then
  echo "Error: Supabase project reference is not set in the deploy-edge-functions.sh script."
  exit 1
fi

echo "Deploying all Edge Functions to project: $PROJECT_REF"

# Find all function directories and deploy them
for fn_dir in supabase/functions/*; do
  if [ -d "$fn_dir" ]; then
    fn_name=$(basename "$fn_dir")
    echo "--> Deploying function: $fn_name"
    # Using --no-verify-jwt because auth is handled manually within the functions
    supabase functions deploy "$fn_name" --project-ref "$PROJECT_REF" --no-verify-jwt
  fi
done

echo "All functions deployed successfully."