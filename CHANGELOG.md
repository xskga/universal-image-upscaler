# Changelog

All notable changes to the Universal Image Upscaler project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2025-01-27

### Added
- Batch image processing (up to 100 files simultaneously)
- AI upscaling using Real-ESRGAN technology
- Support for PNG, JPEG, WebP, AVIF, BMP, TIFF, GIF formats
- Automatic conversion to PNG format
- Image resizing with aspect ratio preservation
- Drag-and-drop file upload
- Load images from URLs
- Download individual images or ZIP archive
- Light/dark/system theme support
- Real-time image processing preview
- Processing logs for debugging
- Responsive user interface

### Tech Stack
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 3.4
- shadcn/ui components
- Sharp.js for image processing
- Replicate API for AI upscaling
- Archiver for ZIP generation

### Security
- File size validation (max 50MB)
- File type validation
- API error handling
- No user data storage
