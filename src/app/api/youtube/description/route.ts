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
    const { title, transcript, summary, originalDescription } = body;

    if (!title || (!transcript && !summary)) {
      return NextResponse.json(
        { error: 'Video title and either transcript or summary are required' },
        { status: 400 }
      );
    }

    console.log('Generating YouTube description...');

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        topK: 40
      }
    });

    // Generate description
    const descriptionPrompt = `Create an engaging YouTube video description based on this video content:

Video Title: "${title}"
${summary ? `Summary: "${summary}"` : ''}
${transcript ? `Transcript: "${transcript.substring(0, 8000)}" ${transcript.length > 8000 ? '...(truncated)' : ''}` : ''}
${originalDescription ? `Original Description: "${originalDescription.substring(0, 1000)}"` : ''}

Generate a compelling YouTube description that:
- Starts with a hook that makes people want to watch
- Includes key points and value propositions
- Has clear calls-to-action
- Uses relevant hashtags at the end
- Is optimized for YouTube SEO
- Is approximately 300-500 words
- Includes sections like:
  * "What you'll learn:"
  * "Timestamps:" (create logical timestamps based on content)
  * "Connect with us:" (placeholder links)
  
Format the description professionally with proper spacing and emojis where appropriate.`;

    const descriptionResponse = await model.generateContent(descriptionPrompt);
    const generatedDescription = descriptionResponse.response.text();

    console.log('Generated description (' + generatedDescription.length + ' characters)');

    return NextResponse.json({
      success: true,
      data: {
        description: generatedDescription,
        wordCount: generatedDescription.split(' ').length,
        characterCount: generatedDescription.length
      },
      message: 'YouTube description generated successfully'
    });

  } catch (error) {
    console.error('Error generating description:', error);
    
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
        error: 'Failed to generate description',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}