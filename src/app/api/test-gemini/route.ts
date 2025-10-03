import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Test with gemini-2.0-flash-exp
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const result = await model.generateContent('Say hello!');
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({
      success: true,
      message: 'Gemini API is working!',
      response: text,
      modelUsed: 'gemini-pro',
      apiKeyConfigured: true
    });
    
  } catch (error) {
    console.error('Gemini API test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Gemini API test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        apiKeyConfigured: !!process.env.GEMINI_API_KEY
      },
      { status: 500 }
    );
  }
}