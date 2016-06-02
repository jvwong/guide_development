#!/bin/bash
# Runs under USER specified by Dockerfile

# exits if any non-zero return
set -e

if [ "$JEKYLL_ENV" = 'development' ]; then
  echo "Running Development Server"
  exec jekyll serve --host=0.0.0.0 --verbose --watch --force_polling
else
	echo "No Production Server configured"
fi
