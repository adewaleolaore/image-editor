# YouTube Thumbnail Editor & Generator

This is an AI-powered YouTube thumbnail creation and editing tool built with Next.js and Google Gemini AI. Create professional thumbnails either from scratch using AI generation or by editing existing images.

## Features

### 🎨 **Dual Mode Operation**
- **Generate Mode**: Create thumbnails from text descriptions using AI
- **Edit Mode**: Upload existing thumbnails and modify them with AI prompts

### 📐 **Template-Based Generation**
- Upload a blank canvas image to define exact dimensions and aspect ratio
- AI generates thumbnails that match your template's precise measurements
- Perfect for maintaining consistent thumbnail sizes across your channel

### ✨ **AI-Powered Features**
- Google Gemini AI integration for both generation and editing
- Multiple model fallbacks for reliability
- Automatic image resizing with Sharp to ensure exact dimensions
- Professional YouTube thumbnail optimization

### 🎯 **User-Friendly Interface**
- Drag & drop file uploads
- Real-time image previews
- Edit history with thumbnail previews
- One-click downloads
- Dark/light mode support
- Mobile-responsive design

## How Template-Based Generation Works

1. **Switch to Generate Mode**: Click "✨ Generate Image"
2. **Upload Template Canvas**: Drop or select a blank image file (PNG/JPG)
   - The template defines the exact output dimensions (e.g., 1280×720 for standard YouTube thumbnails)
   - Can be a simple colored rectangle or any image - only size matters
3. **Describe Your Thumbnail**: Enter a detailed prompt describing your desired thumbnail
4. **Generate**: AI creates a thumbnail matching your template's exact dimensions

### Supported Template Formats
- PNG, JPG, JPEG images
- Any dimensions (common YouTube sizes: 1280×720, 1920×1080)
- Template content doesn't matter - only size and aspect ratio are used

## Technical Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **AI Integration**: Google Gemini AI (@google/generative-ai)
- **Image Processing**: Sharp for resizing and format conversion
- **Deployment**: Vercel-ready configuration

## Getting Started

### Prerequisites
- Node.js 18+ 
- Google Gemini API key from [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd image-editor
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser

### Usage Tips

**For Template-Based Generation:**
- Create a blank canvas in your preferred image editor (e.g., Photoshop, GIMP)
- Standard YouTube thumbnail size: 1280×720 pixels
- Save as PNG or JPG and upload as your template
- The AI will generate content that fills your exact template dimensions

**For Best Results:**
- Use detailed, specific prompts (e.g., "Tech YouTuber with shocked expression, bright blue background, bold 'AMAZING!' text overlay")
- Mention colors, emotions, text elements, and composition in your descriptions
- The AI is optimized for YouTube thumbnail style and engagement

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
