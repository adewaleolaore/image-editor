import { NextRequest, NextResponse } from 'next/server';
import { extractVideoId, getVideoMetadata } from '@/lib/youtube';

export async function POST(request: NextRequest) {
  try {
    const { youtubeUrl } = await request.json();

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    console.log('Testing YouTube URL:', youtubeUrl);
    console.log('Extracted video ID:', videoId);

    // Test metadata fetch
    const metadata = await getVideoMetadata(videoId);
    
    return NextResponse.json({
      success: true,
      videoId,
      metadata,
      message: 'YouTube metadata fetch successful'
    });

  } catch (error) {
    console.error('YouTube test error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}