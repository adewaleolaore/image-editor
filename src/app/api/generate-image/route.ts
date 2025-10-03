import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY environment variable not set');
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please check your .env.local file.' },
        { status: 500 }
      );
    }
    
    console.log('Processing image generation request...');
    console.log('API Key configured:', process.env.GEMINI_API_KEY ? 'Yes' : 'No');

    const body = await request.json();
    const { prompt, template, width, height } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required for image generation' },
        { status: 400 }
      );
    }

    if (!template || !width || !height) {
      return NextResponse.json(
        { error: 'Template image, width, and height are required for template-based generation' },
        { status: 400 }
      );
    }

    // Use Gemini Flash 2.5 as primary model for image generation
    const modelNames = [
      'gemini-2.5-flash-image-preview' // Gemini Flash 2.5 - best for image generation
    ];
    
    let model;
    let lastError;
    
    // Try to initialize the model with different names
    for (const modelName of modelNames) {
      try {
        console.log(`Trying model: ${modelName}`);
        model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.7, // Balanced creativity
            topP: 0.9,
            topK: 40
          }
          // Note: systemInstruction removed for better model compatibility
        });
        
        console.log(`Model ${modelName} initialized successfully`);
        break;
      } catch (error) {
        console.log(`Model ${modelName} failed:`, error);
        lastError = error;
        continue;
      }
    }
    
    if (!model) {
      return NextResponse.json(
        { 
          error: 'No suitable model available for image generation',
          details: lastError instanceof Error ? lastError.message : 'All models failed to initialize'
        },
        { status: 503 }
      );
    }

    // Extract template image data (remove the data URL prefix)
    const templateBase64 = template.split(',')[1];
    
    // Create the content for image generation using the template canvas
    const content = [
      {
        inlineData: {
          data: templateBase64,
          mimeType: template.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'
        }
      },
      {
        text: `CRITICAL: You MUST generate an image at exactly ${width}×${height} pixels. This is NOT optional.
        
        I'm providing a template canvas that is exactly ${width}×${height} pixels (aspect ratio ${(width/height).toFixed(2)}:1). You must match these exact dimensions.
        
        Task: Create a YouTube thumbnail: "${prompt}"
        
        ABSOLUTE REQUIREMENTS - NO EXCEPTIONS:
        - Output dimensions: EXACTLY ${width}×${height} pixels
        - Aspect ratio: EXACTLY ${(width/height).toFixed(2)}:1
        - DO NOT generate 1024x1024, 512x512, or any square format
        - DO NOT generate any size other than ${width}×${height}
        - The image content must fill the entire ${width}×${height} canvas naturally
        - Generate WIDE format content that fits ${width}×${height}, not square content
        
        Template guidance:
        - This template canvas defines the exact output dimensions needed
        - Use the template as a size reference for proper proportions
        - Generate content that naturally fits this specific canvas size
        - Respect the aspect ratio to avoid distortion
        
        Content requirements:
        - High-quality YouTube thumbnail suitable for the given dimensions
        - Vibrant, engaging colors that work well on YouTube
        - Clear, readable text if needed (sized appropriately for the canvas dimensions)
        - Professional thumbnail composition that fits the aspect ratio
        - Eye-catching design that drives clicks
        
        Generate the thumbnail image now at exactly ${width}×${height} pixels to match the template canvas.`
      }
    ];

    // Generate the response
    const response = await model.generateContent(content);
    
    // Extract images and text from the response
    const result = response.response;
    const parts = result.candidates?.[0]?.content?.parts || [];
    
    let generatedImageBase64 = null;
    let responseText = '';

    for (const part of parts) {
      if (part.text) {
        responseText += part.text;
      } else if (part.inlineData) {
        generatedImageBase64 = part.inlineData.data;
      }
    }

    if (!generatedImageBase64) {
      return NextResponse.json(
        { error: 'No image was generated by the AI model. The model may not support image generation for this request.' },
        { status: 500 }
      );
    }

    try {
      // Process the generated image with Sharp to ensure exact dimensions
      const imageBuffer = Buffer.from(generatedImageBase64, 'base64');
      
      // Get the current image dimensions
      const metadata = await sharp(imageBuffer).metadata();
      console.log(`Generated image dimensions: ${metadata.width}x${metadata.height}`);
      console.log(`Target template dimensions: ${width}x${height}`);
      
      let processedImageBuffer: Buffer = imageBuffer;
      
      // If dimensions don't match the template, resize to exact dimensions
      if (metadata.width !== width || metadata.height !== height) {
        console.log(`Resizing image from ${metadata.width}x${metadata.height} to ${width}x${height}`);
        
        const resizedBuffer = await sharp(imageBuffer)
          .resize(width, height, { 
            // Fill the entire canvas by cropping center - no white padding
            fit: 'cover',
            position: 'center'
          })
          .png()
          .toBuffer();
        
        processedImageBuffer = Buffer.from(resizedBuffer);
      }
      
      // Convert back to base64
      const finalImageBase64 = processedImageBuffer.toString('base64');
      
      return NextResponse.json({
        success: true,
        generatedImage: `data:image/png;base64,${finalImageBase64}`,
        responseText: responseText,
        message: 'Image generated successfully',
        dimensions: {
          original: { width: metadata.width, height: metadata.height },
          final: { width, height },
          resized: metadata.width !== width || metadata.height !== height
        }
      });
      
    } catch (imageProcessingError) {
      console.error('Error processing generated image:', imageProcessingError);
      
      // If Sharp processing fails, return the original image
      return NextResponse.json({
        success: true,
        generatedImage: `data:image/png;base64,${generatedImageBase64}`,
        responseText: responseText,
        message: 'Image generated successfully (dimensions may not match template exactly)',
        warning: 'Image processing failed, dimensions may differ from template'
      });
    }

  } catch (error) {
    console.error('Error generating image:', error);
    
    // Handle specific Google AI errors
    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('quota')) {
        return NextResponse.json(
          { 
            error: 'API quota exceeded. Please wait a moment and try again, or check your Gemini API billing settings.',
            details: 'You may have hit the free tier limits. Consider upgrading your Google AI plan.'
          },
          { status: 429 }
        );
      }
      
      if (error.message.includes('401') || error.message.includes('API key')) {
        return NextResponse.json(
          { 
            error: 'Invalid API key. Please check your Gemini API key configuration.',
            details: 'Make sure your GEMINI_API_KEY is correct in the .env.local file'
          },
          { status: 401 }
        );
      }
      
      if (error.message.includes('model')) {
        return NextResponse.json(
          { 
            error: 'Model not available. The Gemini image model may not be accessible.',
            details: 'Try again later or check if the model name is correct'
          },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}