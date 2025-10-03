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
    const { title, transcript, description } = body;

    if (!title || !transcript) {
      return NextResponse.json(
        { error: 'Video title and transcript are required' },
        { status: 400 }
      );
    }

    console.log('Generating AI summary...');

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40
      }
    });

    // Generate summary
    const summaryPrompt = `Please create a concise, engaging summary of this YouTube video based on its transcript.

Video Title: "${title}"
${description ? `Original Description: "${description.substring(0, 500)}"` : ''}
Transcript: "${transcript.substring(0, 12000)}" ${transcript.length > 12000 ? '...(truncated)' : ''}

Create a 2-3 paragraph summary that:
- Captures the main points and key takeaways
- Uses engaging language suitable for YouTube audiences
- Highlights the most interesting or valuable insights
- Is approximately 150-300 words
- Focuses on what viewers will learn or gain from watching`;

    const summaryResponse = await model.generateContent(summaryPrompt);
    const summary = summaryResponse.response.text();

    console.log('Generated summary (' + summary.length + ' characters)');

    return NextResponse.json({
      success: true,
      data: {
        summary,
        wordCount: summary.split(' ').length,
        characterCount: summary.length
      },
      message: 'Summary generated successfully'
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    
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
        error: 'Failed to generate summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}