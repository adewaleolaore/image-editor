import ytdl from '@distube/ytdl-core';
import { YoutubeTranscript } from 'youtube-transcript';
import { getSubtitles as getCaptions } from 'youtube-caption-extractor';

// Extract video ID from various YouTube URL formats
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^?]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Validate YouTube URL
export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

// Get video metadata using ytdl-core
export async function getVideoMetadata(videoId: string) {
  try {
    console.log('Attempting to fetch metadata for video ID:', videoId);
    
    // Try with different options to improve reliability
    const info = await ytdl.getInfo(videoId, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
    });
    
    const videoDetails = info.videoDetails;
    console.log('Successfully fetched metadata for:', videoDetails.title);
    
    return {
      title: videoDetails.title,
      description: videoDetails.description || '',
      duration: parseInt(videoDetails.lengthSeconds) || 0,
      thumbnail: videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url || '',
      author: videoDetails.author?.name || 'Unknown',
      viewCount: parseInt(videoDetails.viewCount) || 0,
      uploadDate: videoDetails.uploadDate || new Date().toISOString().split('T')[0],
    };
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      videoId,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`Failed to fetch video metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get video transcript using youtube-caption-extractor (reliable method)
export async function getVideoTranscript(videoId: string): Promise<string> {
  console.log(`Fetching transcript for video: ${videoId}`);
  
  try {
    // Primary method: youtube-caption-extractor (most reliable)
    const languages = ['en', 'en-US']; // Try English variants first
    
    for (const lang of languages) {
      try {
        console.log(`Trying language: ${lang}`);
        const captions = await getCaptions({ videoID: videoId, lang });
        
        if (captions && captions.length > 0) {
          const textSegments = captions
            .map(caption => caption.text)
            .filter(text => text && text.trim());
          
          if (textSegments.length > 0) {
            const fullText = textSegments.join(' ').replace(/\s+/g, ' ').trim();
            console.log(`✅ Transcript fetched successfully: ${fullText.length} characters, ${captions.length} segments`);
            return fullText;
          }
        }
      } catch (langError) {
        console.log(`Language ${lang} failed:`, langError.message);
      }
    }
    
    // Try without language specification as fallback
    console.log('Trying auto-language detection...');
    const captions = await getCaptions({ videoID: videoId });
    
    if (captions && captions.length > 0) {
      const textSegments = captions
        .map(caption => caption.text)
        .filter(text => text && text.trim());
      
      if (textSegments.length > 0) {
        const fullText = textSegments.join(' ').replace(/\s+/g, ' ').trim();
        console.log(`✅ Transcript fetched with auto-language: ${fullText.length} characters, ${captions.length} segments`);
        return fullText;
      }
    }
    
    throw new Error('No captions found with any language option');
    
  } catch (primaryError) {
    console.warn('youtube-caption-extractor failed, trying fallback method:', primaryError.message);
    
    // Fallback method: original youtube-transcript library
    try {
      let transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      // Try with language hints if empty
      if (!transcript || transcript.length === 0) {
        try {
          transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' } as any);
        } catch {}
      }
      
      if (transcript && transcript.length > 0) {
        const fullText = transcript.map(item => item.text).join(' ');
        console.log(`✅ Fallback transcript fetched: ${fullText.length} characters`);
        return fullText;
      }
    } catch (fallbackError) {
      console.error('Fallback transcript method also failed:', fallbackError.message);
    }
    
    throw new Error('Failed to fetch video transcript. The video may not have captions available.');
  }
}

// Format duration from seconds to MM:SS or HH:MM:SS
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// Extract potential clips from transcript
export interface ClipSuggestion {
  title: string;
  startTime: number;
  endTime: number;
  transcript: string;
  hookScore: number;
  reason: string;
}

export function analyzeTranscriptForClips(
  transcript: string, 
  transcriptData: Array<{ offset: number; text: string }>,
  maxClips: number = 6
): ClipSuggestion[] {
  const clips: ClipSuggestion[] = [];
  
  // Hook indicators - words/phrases that make good clip starts
  const hookIndicators = [
    'but wait', 'however', 'surprisingly', 'shocking', 'unbelievable',
    'secret', 'hack', 'tip', 'mistake', 'wrong', 'truth', 'revealed',
    'never', 'always', 'everyone', 'nobody', 'first time', 'last time',
    'before', 'after', 'transform', 'change', 'difference', 'compare',
    'vs', 'versus', 'better', 'worse', 'best', 'worst', 'ultimate'
  ];

  // Emotional indicators
  const emotionalWords = [
    'amazing', 'incredible', 'insane', 'crazy', 'mind-blowing',
    'shocking', 'surprising', 'unbelievable', 'wow', 'omg'
  ];

  // Split transcript into sentences and analyze
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  sentences.forEach((sentence, index) => {
    const lowerSentence = sentence.toLowerCase();
    let hookScore = 0;
    const reasons: string[] = [];
    
    // Check for hook indicators
    hookIndicators.forEach(indicator => {
      if (lowerSentence.includes(indicator)) {
        hookScore += 2;
        reasons.push(`Contains hook word: "${indicator}"`);
      }
    });
    
    // Check for emotional words
    emotionalWords.forEach(word => {
      if (lowerSentence.includes(word)) {
        hookScore += 1;
        reasons.push(`Emotional content: "${word}"`);
      }
    });
    
    // Check for questions
    if (sentence.includes('?')) {
      hookScore += 1;
      reasons.push('Contains question');
    }
    
    // Check for numbers/statistics
    if (/\d+/.test(sentence)) {
      hookScore += 1;
      reasons.push('Contains numbers/stats');
    }
    
    // Only consider sentences with decent hook scores
    if (hookScore >= 2 && sentence.trim().length > 50) {
      // Estimate timing (rough approximation)
      const totalDuration = transcriptData.length > 0 ? transcriptData[transcriptData.length - 1].offset / 1000 : 600;
      const estimatedStart = Math.floor((index / sentences.length) * totalDuration);
      const estimatedEnd = Math.min(estimatedStart + 45, totalDuration); // 45 second clips
      
      clips.push({
        title: sentence.trim().substring(0, 100) + (sentence.length > 100 ? '...' : ''),
        startTime: estimatedStart,
        endTime: estimatedEnd,
        transcript: sentence.trim(),
        hookScore,
        reason: reasons.join(', ')
      });
    }
  });
  
  // Sort by hook score and return top clips
  return clips
    .sort((a, b) => b.hookScore - a.hookScore)
    .slice(0, maxClips);
}