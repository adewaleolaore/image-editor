"use client";

import { useState } from 'react';
import Image from 'next/image';

type ProcessingState = 'idle' | 'processing' | 'success' | 'error';

interface ImageHistoryItem {
  id: string;
  image: string;
  prompt: string;
  timestamp: number;
  editType: 'generation' | 'edit';
  originalPrompt: string; // Store the full, unprocessed prompt
}

export default function ThumbnailEditor() {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerateMode, setIsGenerateMode] = useState(false);
  
  // Template canvas state for generate mode
  const [templateCanvas, setTemplateCanvas] = useState<File | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);
  const [templateDimensions, setTemplateDimensions] = useState<{width: number, height: number} | null>(null);
  const [isTemplateDragging, setIsTemplateDragging] = useState(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCurrentImage(imageData);
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
        setCurrentImage(imageData);
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

  // Template canvas handlers for generate mode
  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setTemplateCanvas(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setTemplatePreview(imageData);
        
        const img = document.createElement('img');
        img.onload = () => {
          setTemplateDimensions({ width: img.width, height: img.height });
        };
        img.src = imageData;
      };
      reader.readAsDataURL(file);
      setErrorMessage(null);
    }
  };

  const handleTemplateDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsTemplateDragging(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setTemplateCanvas(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setTemplatePreview(imageData);
        
        const img = document.createElement('img');
        img.onload = () => {
          setTemplateDimensions({ width: img.width, height: img.height });
        };
        img.src = imageData;
      };
      reader.readAsDataURL(file);
      setErrorMessage(null);
    }
  };

  const handleTemplateDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsTemplateDragging(true);
  };

  const handleTemplateDragLeave = () => {
    setIsTemplateDragging(false);
  };

  const clearTemplate = () => {
    setTemplateCanvas(null);
    setTemplatePreview(null);
    setTemplateDimensions(null);
    setErrorMessage(null);
  };

  const generateImageWithGemini = async (prompt: string, templateFile?: File | null) => {
    try {
      setProcessingState('processing');
      setErrorMessage(null);
      
      let requestBody: Record<string, unknown> = { prompt };
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      if (templateFile) {
        const reader = new FileReader();
        const templateData = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(templateFile);
        });
        
        requestBody = {
          prompt,
          template: templateData,
          width: templateDimensions?.width || 1280,
          height: templateDimensions?.height || 720
        };
      }
      
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `API request failed with status ${response.status}`);
      }
      
      if (result.generatedImage) {
        setErrorMessage(null);
        setCurrentImage(result.generatedImage);
        
        const historyItem: ImageHistoryItem = {
          id: Date.now().toString(),
          image: result.generatedImage,
          prompt: `Generated: ${prompt}`,
          timestamp: Date.now(),
          editType: 'generation',
          originalPrompt: prompt
        };
        
        setImageHistory([historyItem]);
        setProcessingState('success');
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
      
      const base64Data = imageData.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      const formData = new FormData();
      formData.append('image', blob, 'thumbnail.jpg');
      formData.append('prompt', prompt);
      
      const response = await fetch('/api/edit-image', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `API request failed with status ${response.status}`);
      }
      
      if (result.processedImage) {
        setErrorMessage(null);
        const historyItem: ImageHistoryItem = {
          id: Date.now().toString(),
          image: imageData,
          prompt: `Edit: ${prompt}`,
          timestamp: Date.now(),
          editType: 'edit',
          originalPrompt: prompt
        };
        
        setImageHistory(prev => [...prev, historyItem]);
        setCurrentImage(result.processedImage);
        setProcessingState('success');
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
    setPrompt(historyItem.originalPrompt);
    setProcessingState('idle');
    setErrorMessage(null);
    
    if (historyItem.editType === 'generation') {
      setIsGenerateMode(true);
    } else {
      setIsGenerateMode(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!prompt.trim()) {
      setErrorMessage('Please provide a prompt');
      return;
    }
    
    if (isGenerateMode) {
      if (!templateCanvas) {
        setErrorMessage('Please upload a template canvas to define the size and aspect ratio');
        return;
      }
      await generateImageWithGemini(prompt, templateCanvas);
    } else {
      if (!currentImage) {
        setErrorMessage('Please upload an image or switch to generate mode');
        return;
      }
      await processImageWithGemini(currentImage, prompt);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          YouTube Thumbnail {isGenerateMode ? 'Generator' : 'Editor'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {isGenerateMode 
            ? 'Describe your thumbnail idea and AI will generate it using your template canvas dimensions'
            : 'Upload your thumbnail and enter a prompt to get started'
          }
        </p>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 shadow-sm">
            <div className="flex">
              <button
                onClick={() => {
                  setIsGenerateMode(false);
                  setErrorMessage(null);
                  clearTemplate();
                }}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  !isGenerateMode
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                🪄 Edit Image
              </button>
              <button
                onClick={() => {
                  setIsGenerateMode(true);
                  setErrorMessage(null);
                }}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  isGenerateMode
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
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

          {/* Generated Image Display */}
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
                          setImageHistory([]);
                          setProcessingState('idle');
                          setErrorMessage(null);
                          if (isGenerateMode) {
                            clearTemplate();
                          }
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

          {/* Template Canvas Upload (Generate Mode Only) */}
          {isGenerateMode && (
            <div className="flex justify-center">
              <div className="w-full max-w-2xl">
                <label className="block text-lg font-medium text-gray-900 dark:text-white mb-4 text-center">
                  Upload Template Canvas
                </label>
                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Upload a blank canvas image to define the exact size and aspect ratio for your generated thumbnail
                </p>
                
                {!templatePreview ? (
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isTemplateDragging
                        ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                    onDrop={handleTemplateDrop}
                    onDragOver={handleTemplateDragOver}
                    onDragLeave={handleTemplateDragLeave}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleTemplateUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-3">
                      <div className="mx-auto w-12 h-12 bg-green-200 dark:bg-green-700 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-base text-gray-700 dark:text-gray-300 font-medium">
                          Drop template canvas here
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          or click to browse • PNG, JPG accepted
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="aspect-video relative bg-gray-100 dark:bg-gray-700">
                      <Image
                        src={templatePreview}
                        alt="Template canvas"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-700">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-green-700 dark:text-green-300">
                          📐 Template: {templateDimensions?.width}×{templateDimensions?.height} pixels
                        </div>
                        <button
                          type="button"
                          onClick={clearTemplate}
                          className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        ✓ This canvas will determine the exact size of your generated thumbnail
                      </p>
                    </div>
                  </div>
                )}
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
              disabled={(
                !isGenerateMode && !currentImage
              ) || (
                isGenerateMode && (!templateCanvas || !prompt.trim())
              ) || (
                !isGenerateMode && !prompt.trim()
              ) || processingState === 'processing'}
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
                  : (isGenerateMode 
                    ? (!templateCanvas ? 'Upload Template First' : (!prompt.trim() ? 'Enter Description' : 'Generate Thumbnail'))
                    : (currentImage ? 'Edit Thumbnail' : 'Upload Image First')
                  )
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
                Edit History - Click any version to restore its image and prompt
              </h3>
              <div className="flex justify-center">
                <div className="w-full max-w-5xl">
                  <div className="flex space-x-4 overflow-x-auto pb-4 px-2">
                    {imageHistory.map((item, index) => (
                      <button
                        key={item.id}
                        onClick={() => handleHistoryClick(item)}
                        className="flex-shrink-0 group relative bg-white dark:bg-gray-800 rounded-xl p-3 shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                        title={`${item.editType === 'generation' ? 'Generated' : 'Edited'}: ${item.originalPrompt}`}
                      >
                        {/* Edit Type Badge */}
                        <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                          item.editType === 'generation' 
                            ? 'bg-green-500' 
                            : 'bg-blue-500'
                        }`}>
                          {item.editType === 'generation' ? '✨' : '✏️'}
                        </div>
                        
                        {/* Image Preview */}
                        <div className="w-36 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shadow-sm">
                          <Image
                            src={item.image}
                            alt={`${item.editType === 'generation' ? 'Generated' : 'Edit'} ${index + 1}`}
                            width={144}
                            height={80}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                        
                        {/* Info Section */}
                        <div className="mt-2 text-xs text-center w-36">
                          <div className="text-gray-900 dark:text-gray-100 font-semibold">
                            {item.editType === 'generation' ? 'Generated' : `Edit ${index + 1}`}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 mt-1 leading-tight">
                            {item.originalPrompt.length > 40 
                              ? `${item.originalPrompt.substring(0, 40)}...` 
                              : item.originalPrompt}
                          </div>
                          <div className="text-gray-500 dark:text-gray-500 mt-1 text-xs">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </button>
                    ))}
                    
                    {/* Current image indicator */}
                    <div className="flex-shrink-0 relative bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-xl p-3 shadow-lg border-2 border-blue-400 dark:border-blue-500">
                      {/* Current Badge */}
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg">
                        🔥
                      </div>
                      
                      {/* Current Image */}
                      <div className="w-36 h-20 bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-sm border border-blue-200 dark:border-blue-600">
                        <Image
                          src={currentImage || ''}
                          alt="Current version"
                          width={144}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Current Info */}
                      <div className="mt-2 text-xs text-center w-36">
                        <div className="text-blue-900 dark:text-blue-100 font-bold">
                          Current
                        </div>
                        <div className="text-blue-700 dark:text-blue-300 mt-1">
                          {prompt.trim() ? (
                            prompt.length > 40 ? `${prompt.substring(0, 40)}...` : prompt
                          ) : (
                            'Ready for next edit'
                          )}
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