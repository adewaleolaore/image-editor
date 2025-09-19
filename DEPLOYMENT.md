# Deployment Instructions

## Deploying to Vercel

### 1. Environment Variables
You need to set up the following environment variable in your Vercel project:

- `GEMINI_API_KEY`: Your Google Gemini API key from [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key)

### 2. Deploy Steps
1. Connect your GitHub repository to Vercel
2. In Vercel dashboard, go to your project settings
3. Navigate to "Environment Variables"
4. Add `GEMINI_API_KEY` with your actual API key
5. Redeploy the application

### 3. Build Configuration
The application uses Next.js 15 with:
- TypeScript
- Tailwind CSS 4
- App Router
- API Routes for Gemini integration

### 4. Troubleshooting
- Ensure your API key has proper permissions for image generation
- Check that all dependencies are properly installed
- Verify Node.js version compatibility (requires Node 18+)