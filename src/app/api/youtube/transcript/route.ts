import { NextRequest, NextResponse } from 'next/server';
import { 
  extractVideoId, 
  isValidYouTubeUrl, 
  getVideoMetadata, 
  getVideoTranscript 
} from '@/lib/youtube';

export async function POST(request: NextRequest) {
  try {
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

    console.log(`Extracting transcript for video: ${videoId}`);

    // Get video metadata
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

    // Get transcript
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
        fullTranscript: transcript // Include full transcript for other tools
      },
      message: 'Transcript extracted successfully'
    });

  } catch (error) {
    console.error('Error extracting transcript:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to extract transcript',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}