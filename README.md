# Universal Image Upscaler

A full-stack web application for AI-powered image upscaling and batch processing built with Next.js 15 and TypeScript.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)

## Overview

Universal Image Upscaler enables batch image processing with AI-powered upscaling using Real-ESRGAN technology. The application handles format conversion, intelligent resizing, and quality enhancement through the Replicate API.

**Key Features:**
- Batch processing up to 100 images simultaneously
- AI upscaling using Real-ESRGAN (up to 4x scale factor)
- Support for PNG, JPEG, WebP, AVIF, BMP, TIFF, and GIF formats
- Automatic PNG conversion for optimal quality
- Load images from URLs
- Dark/light theme support
- Privacy-focused: no persistent storage

## Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 3.4
- shadcn/ui components

**Backend:**
- Next.js API Routes
- Sharp.js for image processing
- Replicate API for AI upscaling
- Archiver for ZIP generation

## Installation

### Prerequisites
- Node.js 18 or higher
- Replicate API key ([get free key](https://replicate.com/account/api-tokens))

### Setup

```bash
# Clone repository
git clone https://github.com/xskga/universal-image-upscaler.git
cd universal-image-upscaler

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local and add your REPLICATE_API_TOKEN

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Upload images** via drag-and-drop, file selector, or paste URLs (max 100 files)
2. **Configure settings:**
   - Custom file name prefix
   - Maximum dimension for initial resize (100-4000px)
   - Enable/disable AI upscaling
   - Target size for upscaling (1300-4096px)
3. **Process images** and monitor real-time progress with logs
4. **Download** individual results or entire batch as ZIP

## Project Structure

```
universal-image-upscaler/
├── app/
│   ├── api/                    # API routes
│   │   ├── process-image/      # Image resize and PNG conversion
│   │   ├── upscale-image/      # AI upscaling via Replicate
│   │   ├── serve-image/        # Serve processed images
│   │   └── download-all/       # ZIP archive generation
│   ├── layout.tsx              # Root layout with theme provider
│   └── page.tsx                # Main application page
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── image-uploader.tsx      # File upload component
│   ├── image-processor.tsx     # Processing UI component
│   └── theme-switcher.tsx      # Theme toggle
├── lib/
│   ├── image-utils.ts          # Image processing utilities
│   └── utils.ts                # General utilities
└── public/
    ├── uploads/                # Temporary uploaded files
    └── processed/              # Processed images
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/process-image` | POST | Initial image resize and PNG conversion |
| `/api/upscale-image` | POST | AI upscaling via Replicate |
| `/api/serve-image/[filename]` | GET | Serve processed images |
| `/api/download-all` | POST | Generate ZIP archive of batch results |

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

## Deployment

The application can be deployed to any platform supporting Next.js:

**Recommended platforms:**
- Vercel (one-click deployment)
- Netlify
- Self-hosted with Node.js
- Docker containers

**Environment variables required:**
- `REPLICATE_API_TOKEN` - Your Replicate API key (required)
- `NEXT_PUBLIC_APP_URL` - Your domain URL (optional)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) - AI upscaling technology
- [Replicate](https://replicate.com/) - Model API infrastructure
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Next.js](https://nextjs.org/) - React framework

## Support

For issues or questions, please [open an issue](https://github.com/xskga/universal-image-upscaler/issues).
