import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

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
    const { title, transcript, summary } = body;

    if (!title || (!transcript && !summary)) {
      return NextResponse.json(
        { error: 'Video title and either transcript or summary are required' },
        { status: 400 }
      );
    }

    console.log('Generating keywords and tags...');

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.6,
        topP: 0.8,
        topK: 40
      }
    });

    // Generate keywords
    const keywordsPrompt = `Based on this YouTube video content, generate relevant keywords and tags for SEO optimization:

Video Title: "${title}"
${summary ? `Summary: "${summary}"` : ''}
${transcript ? `Transcript: "${transcript.substring(0, 6000)}" ${transcript.length > 6000 ? '...(truncated)' : ''}` : ''}

Generate 15-25 relevant keywords/tags that would help this video be discovered on YouTube. Include:
- Primary keywords related to the main topic (3-5 keywords)
- Secondary keywords for broader reach (5-8 keywords) 
- Long-tail keywords that people might search for (5-7 keywords)
- Trending terms in this niche if applicable (2-5 keywords)

Requirements:
- Each keyword should be 1-4 words long
- Focus on search terms people actually use
- Include both specific and general terms
- Avoid overly generic words
- Make them YouTube-friendly

Return as a simple comma-separated list without quotes or numbers.`;

    const keywordsResponse = await model.generateContent(keywordsPrompt);
    const keywordsText = keywordsResponse.response.text();
    
    // Parse keywords from response
    const keywords = keywordsText
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0 && k.length < 50) // Filter out empty or overly long keywords
      .slice(0, 25); // Limit to 25 keywords max

    console.log('Generated ' + keywords.length + ' keywords');

    return NextResponse.json({
      success: true,
      data: {
        keywords,
        keywordCount: keywords.length,
        formattedKeywords: keywords.join(', '),
        hashtags: keywords.slice(0, 10).map(k => '#' + k.replace(/\s+/g, ''))
      },
      message: 'Keywords and tags generated successfully'
    });

  } catch (error) {
    console.error('Error generating keywords:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'AI quota exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate keywords',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}