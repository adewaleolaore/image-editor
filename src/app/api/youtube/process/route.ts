import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { 
  extractVideoId, 
  isValidYouTubeUrl, 
  getVideoMetadata, 
  getVideoTranscript,
  analyzeTranscriptForClips 
} from '@/lib/youtube';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { youtubeUrl } = body;

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Validate YouTube URL
    if (!isValidYouTubeUrl(youtubeUrl)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Could not extract video ID from URL' },
        { status: 400 }
      );
    }

    console.log(`Processing YouTube video: ${videoId}`);

    // Step 1: Get video metadata
    let metadata;
    try {
      metadata = await getVideoMetadata(videoId);
      console.log(`Retrieved metadata for: ${metadata.title}`);
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch video metadata. Video may be private or unavailable.' },
        { status: 400 }
      );
    }

    // Step 2: Get transcript
    let transcript;
    try {
      transcript = await getVideoTranscript(videoId);
      console.log(`Retrieved transcript (${transcript.length} characters)`);
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch video transcript. Video may not have captions available.' },
        { status: 400 }
      );
    }

    // Step 3: Initialize Gemini model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image-preview',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40
      }
    });

    // Step 4: Generate summary
    console.log('Generating video summary...');
    const summaryPrompt = `Please create a concise, engaging summary of this YouTube video based on its transcript. 

Video Title: "${metadata.title}"
Transcript: "${transcript.substring(0, 8000)}" ${transcript.length > 8000 ? '...(truncated)' : ''}

Create a 2-3 paragraph summary that:
- Captures the main points and key takeaways
- Uses engaging language suitable for YouTube audiences
- Highlights the most interesting or valuable insights
- Is approximately 150-250 words`;

    const summaryResponse = await model.generateContent(summaryPrompt);
    const summary = summaryResponse.response.text();

    // Step 5: Generate YouTube description
    console.log('Generating YouTube description...');
    const descriptionPrompt = `Create an engaging YouTube video description based on this video content:

Video Title: "${metadata.title}"
Summary: "${summary}"
Original Description: "${metadata.description?.substring(0, 1000) || 'No description available'}"

Generate a compelling YouTube description that:
- Starts with a hook that makes people want to watch
- Includes key points and timestamps if relevant
- Has a clear call-to-action
- Uses relevant hashtags
- Is optimized for YouTube SEO
- Is approximately 200-400 words
- Includes sections like "What you'll learn:", "Timestamps:" (if applicable), and "Connect with us:"`;

    const descriptionResponse = await model.generateContent(descriptionPrompt);
    const generatedDescription = descriptionResponse.response.text();

    // Step 6: Generate keywords
    console.log('Generating keywords...');
    const keywordsPrompt = `Based on this YouTube video content, generate relevant keywords and tags:

Title: "${metadata.title}"
Summary: "${summary}"

Generate 15-20 relevant keywords/tags that would help this video be discovered on YouTube. Include:
- Primary keywords related to the main topic
- Secondary keywords for broader reach  
- Long-tail keywords that people might search for
- Trending terms in this niche if applicable

Return as a simple comma-separated list.`;

    const keywordsResponse = await model.generateContent(keywordsPrompt);
    const keywordsText = keywordsResponse.response.text();
    const keywords = keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0);

    // Step 7: Analyze transcript for clips (using our algorithm)
    console.log('Analyzing transcript for clips...');
    const clipSuggestions = analyzeTranscriptForClips(transcript, [], 6);

    // Step 8: Use AI to enhance clip suggestions
    if (clipSuggestions.length > 0) {
      const clipsPrompt = `Based on this video content, improve these clip suggestions for YouTube Shorts:

Video: "${metadata.title}"
Transcript excerpt: "${transcript.substring(0, 4000)}"

Current clip suggestions:
${clipSuggestions.map((clip, i) => 
  `${i + 1}. "${clip.title}" (${clip.startTime}s-${clip.endTime}s) - Score: ${clip.hookScore}`
).join('\n')}

For each clip, provide an improved title that would work well for YouTube Shorts - make them:
- Punchy and attention-grabbing
- Under 100 characters
- Include emotional hooks or curiosity gaps
- Optimized for mobile viewing

Return in this format:
1. [Improved Title 1]
2. [Improved Title 2]
etc.`;

      const clipsResponse = await model.generateContent(clipsPrompt);
      const improvedTitles = clipsResponse.response.text().split('\n').filter(line => line.trim().match(/^\d+\./));
      
      // Update clip titles with AI-improved versions
      improvedTitles.forEach((titleLine, index) => {
        if (clipSuggestions[index]) {
          const title = titleLine.replace(/^\d+\.\s*/, '').trim();
          if (title) {
            clipSuggestions[index].title = title;
          }
        }
      });
    }

    // Return all processed data
    return NextResponse.json({
      success: true,
      data: {
        videoId,
        youtubeUrl,
        metadata: {
          title: metadata.title,
          description: metadata.description,
          duration: metadata.duration,
          thumbnail: metadata.thumbnail,
          author: metadata.author,
          viewCount: metadata.viewCount,
          uploadDate: metadata.uploadDate
        },
        transcript: transcript.substring(0, 10000) + (transcript.length > 10000 ? '...(truncated for response)' : ''),
        fullTranscriptLength: transcript.length,
        analysis: {
          summary,
          generatedDescription,
          keywords,
          clipSuggestions: clipSuggestions.slice(0, 6)
        }
      },
      message: 'YouTube video processed successfully'
    });

  } catch (error) {
    console.error('Error processing YouTube video:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'API quota exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('private') || error.message.includes('unavailable')) {
        return NextResponse.json(
          { error: 'Video is private or unavailable.' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to process YouTube video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}