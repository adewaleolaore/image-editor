"use client";

import { useState } from 'react';
import Image from 'next/image';

type ProcessingState = 'idle' | 'processing' | 'success' | 'error';

interface ImageHistoryItem {
  id: string;
  image: string;
  prompt: string;
  timestamp: number;
}

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null); // The current working image
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([]); // History of all edits
  const [prompt, setPrompt] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isGenerateMode, setIsGenerateMode] = useState(false); // Toggle between edit and generate modes

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setUploadedImage(imageData);
        setCurrentImage(imageData);
        // Reset history when uploading a new image
        setImageHistory([]);
        setProcessingState('idle');
        setErrorMessage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setUploadedImage(imageData);
        setCurrentImage(imageData);
        // Reset history when uploading a new image
        setImageHistory([]);
        setProcessingState('idle');
        setErrorMessage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const generateImageWithGemini = async (prompt: string) => {
    try {
      setProcessingState('processing');
      setErrorMessage(null);
      
      // Call our Gemini image generation API endpoint
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `API request failed with status ${response.status}`);
      }
      
      // Store the generated image result and start history
      if (result.generatedImage) {
        setErrorMessage(null);
        setAnalysisResult(result.responseText);
        
        // Set the generated image as the current image
        setCurrentImage(result.generatedImage);
        setUploadedImage(result.generatedImage); // Also set as uploaded for consistency
        
        // Initialize history with the generation prompt
        const historyItem: ImageHistoryItem = {
          id: Date.now().toString(),
          image: result.generatedImage,
          prompt: `Generated: ${prompt}`,
          timestamp: Date.now()
        };
        
        setImageHistory([historyItem]);
        setProcessingState('success');
        
        // Clear the prompt for next iteration and switch to edit mode
        setPrompt('');
        setIsGenerateMode(false);
      } else {
        throw new Error('No image was generated');
      }
      
    } catch (error) {
      console.error('Error generating image:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate image');
      setProcessingState('error');
    }
  };

  const processImageWithGemini = async (imageData: string, prompt: string) => {
    try {
      setProcessingState('processing');
      setErrorMessage(null);
      
      // Convert base64 to blob for API submission
      const base64Data = imageData.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      // Create FormData for API submission
      const formData = new FormData();
      formData.append('image', blob, 'thumbnail.jpg');
      formData.append('prompt', prompt);
      
      // Call our Gemini API endpoint
      const response = await fetch('/api/edit-image', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `API request failed with status ${response.status}`);
      }
      
      // Store the processed image result and update history
      if (result.processedImage) {
        setErrorMessage(null);
        setAnalysisResult(result.responseText);
        
        // Add current image to history before updating to new image
        const historyItem: ImageHistoryItem = {
          id: Date.now().toString(),
          image: imageData, // The image that was edited
          prompt: prompt,
          timestamp: Date.now()
        };
        
        setImageHistory(prev => [...prev, historyItem]);
        
        // Update current image to the newly processed image
        setCurrentImage(result.processedImage);
        setProcessingState('success');
        
        // Clear the prompt for next iteration
        setPrompt('');
      } else {
        throw new Error('No processed image received');
      }
      
    } catch (error) {
      console.error('Error processing image:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process image');
      setProcessingState('error');
    }
  };

  const handleHistoryClick = (historyItem: ImageHistoryItem) => {
    setCurrentImage(historyItem.image);
    setPrompt(''); // Clear current prompt
    setProcessingState('idle');
    setErrorMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!prompt.trim()) {
      setErrorMessage('Please provide a prompt');
      return;
    }
    
    if (isGenerateMode) {
      // Generate new image from text prompt
      await generateImageWithGemini(prompt);
    } else {
      // Edit existing image
      if (!currentImage) {
        setErrorMessage('Please upload an image or switch to generate mode');
        return;
      }
      await processImageWithGemini(currentImage, prompt);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-2">
          YouTube Thumbnail {isGenerateMode ? 'Generator' : 'Editor'}
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
          {isGenerateMode 
            ? 'Describe your thumbnail idea and AI will generate it as a wide angle YouTube thumbnail'
            : 'Upload your thumbnail and enter a prompt to get started'
          }
        </p>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 shadow-lg">
            <div className="flex">
              <button
                onClick={() => {
                  setIsGenerateMode(false);
                  setErrorMessage(null);
                }}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  !isGenerateMode
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                🇪 Edit Image
              </button>
              <button
                onClick={() => {
                  setIsGenerateMode(true);
                  setErrorMessage(null);
                }}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  isGenerateMode
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                ✨ Generate Image
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Image Upload/Display Area */}
          {!isGenerateMode && (
            <div className="flex justify-center">
              <div className="w-full max-w-2xl">
                {!currentImage ? (
                <div
                  className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    isDragging
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
                        Drop your YouTube thumbnail here
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        or click to browse files
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                  <div className="aspect-video relative">
                    <Image
                      src={currentImage}
                      alt="Current thumbnail"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {imageHistory.length === 0 ? (
                        '📸 Original image'
                      ) : (
                        `✨ Edit ${imageHistory.length} - Keep editing below!`
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {imageHistory.length > 0 && (
                        <a
                          href={currentImage || ''}
                          download={`edited-thumbnail-${imageHistory.length}.png`}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                        >
                          Download
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentImage(null);
                          setUploadedImage(null);
                          setImageHistory([]);
                          setProcessingState('idle');
                          setErrorMessage(null);
                        }}
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                      >
                        Start over
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>
          )}

          {/* Generated Image Display (shown after generation) */}
          {isGenerateMode && currentImage && (
            <div className="flex justify-center">
              <div className="w-full max-w-2xl">
                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                  <div className="aspect-video relative">
                    <Image
                      src={currentImage}
                      alt="Generated thumbnail"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      ✨ Generated - Now you can edit it further below!
                    </div>
                    <div className="flex space-x-2">
                      <a
                        href={currentImage}
                        download="generated-thumbnail.png"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                      >
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentImage(null);
                          setUploadedImage(null);
                          setImageHistory([]);
                          setProcessingState('idle');
                          setErrorMessage(null);
                        }}
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                      >
                        Start over
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Prompt Input */}
          <div className="flex justify-center">
            <div className="w-full max-w-2xl">
              <label htmlFor="prompt" className="block text-lg font-medium text-gray-900 dark:text-white mb-4 text-center">
                {isGenerateMode ? 'Describe your thumbnail idea' : 'Enter your editing prompt'}
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isGenerateMode 
                  ? "Describe the wide angle YouTube thumbnail you want to generate... (e.g., 'A tech YouTuber with surprised expression, bright colors, bold 'AMAZING!' text overlay')"
                  : "Describe what you'd like to do with this thumbnail... (e.g., 'Add a bright yellow border and make the text more dramatic')"}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 resize-none text-base"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={(!isGenerateMode && !currentImage) || !prompt.trim() || processingState === 'processing'}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-md transition-colors text-lg flex items-center space-x-2"
            >
              {processingState === 'processing' && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>
                {processingState === 'processing' 
                  ? (isGenerateMode ? 'Generating...' : 'Editing...')
                  : (isGenerateMode ? 'Generate Thumbnail' : (currentImage ? 'Edit Thumbnail' : 'Upload Image First'))
                }
              </span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex justify-center mt-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl w-full">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                  </svg>
                  <p className="text-red-800 text-sm font-medium">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}


          {/* History Strip */}
          {imageHistory.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 text-center">
                Edit History - Click to go back to any version
              </h3>
              <div className="flex justify-center">
                <div className="w-full max-w-4xl">
                  <div className="flex space-x-3 overflow-x-auto pb-4">
                    {imageHistory.map((item, index) => (
                      <button
                        key={item.id}
                        onClick={() => handleHistoryClick(item)}
                        className="flex-shrink-0 group relative"
                      >
                        <div className="w-32 h-18 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                          <Image
                            src={item.image}
                            alt={`Edit ${index + 1}`}
                            width={128}
                            height={72}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="mt-1 text-xs text-center">
                          <div className="text-gray-600 dark:text-gray-300 font-medium">
                            Edit {index + 1}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 truncate w-32" title={item.prompt}>
                            {item.prompt.length > 20 ? `${item.prompt.substring(0, 20)}...` : item.prompt}
                          </div>
                        </div>
                      </button>
                    ))}
                    
                    {/* Current image indicator */}
                    <div className="flex-shrink-0 relative">
                      <div className="w-32 h-18 bg-blue-100 dark:bg-blue-900 rounded-lg overflow-hidden shadow-md border-2 border-blue-500">
                        <Image
                          src={currentImage || ''}
                          alt="Current version"
                          width={128}
                          height={72}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-1 text-xs text-center">
                        <div className="text-blue-600 dark:text-blue-400 font-bold">
                          Current
                        </div>
                        <div className="text-blue-500 dark:text-blue-300">
                          Latest edit
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
