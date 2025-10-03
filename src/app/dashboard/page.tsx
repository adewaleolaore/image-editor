"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Play, Copy, ExternalLink, Clock, Eye, User, Calendar } from 'lucide-react';

// Import our existing thumbnail functionality
import ThumbnailEditor from '@/components/ThumbnailEditor';

type ProcessingState = 'idle' | 'processing' | 'success' | 'error';
type ActiveTool = 'transcript' | 'summary' | 'description' | 'keywords' | 'clips' | 'thumbnail-editor';

interface VideoData {
  videoId: string;
  youtubeUrl: string;
  metadata: {
    title: string;
    description: string;
    duration: number;
    thumbnail: string;
    author: string;
    viewCount: number;
    uploadDate: string;
  };
  transcript: string;
  fullTranscriptLength: number;
  analysis: {
    summary: string;
    generatedDescription: string;
    keywords: string[];
    clipSuggestions: Array<{
      title: string;
      startTime: number;
      endTime: number;
      transcript: string;
      hookScore: number;
      reason: string;
    }>;
  };
}

export default function Dashboard() {
  const [activeTool, setActiveTool] = useState<ActiveTool>('transcript');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  
  // Individual processing states for each tool
  const [transcriptState, setTranscriptState] = useState<ProcessingState>('idle');
  const [summaryState, setSummaryState] = useState<ProcessingState>('idle');
  const [descriptionState, setDescriptionState] = useState<ProcessingState>('idle');
  const [keywordsState, setKeywordsState] = useState<ProcessingState>('idle');
  const [clipsState, setClipsState] = useState<ProcessingState>('idle');

  // Individual tool handlers
  const extractTranscript = async () => {
    if (!youtubeUrl.trim()) {
      setErrorMessage('Please enter a YouTube URL');
      return;
    }

    setTranscriptState('processing');
    setErrorMessage(null);
    
    try {
      const response = await fetch('/api/youtube/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setVideoData(result.data);
      setTranscriptState('success');
      
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to extract transcript');
      setTranscriptState('error');
    }
  };

  const generateSummary = async () => {
    if (!videoData?.metadata?.title || !videoData?.fullTranscript) {
      setErrorMessage('Please extract transcript first');
      return;
    }

    setSummaryState('processing');
    setErrorMessage(null);
    
    try {
      const response = await fetch('/api/youtube/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: videoData.metadata.title,
          transcript: videoData.fullTranscript,
          description: videoData.metadata.description
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setVideoData(prev => prev ? {
        ...prev,
        analysis: { 
          summary: result.data.summary,
          generatedDescription: prev.analysis?.generatedDescription || '',
          keywords: prev.analysis?.keywords || [],
          clipSuggestions: prev.analysis?.clipSuggestions || []
        }
      } : null);
      setSummaryState('success');
      
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate summary');
      setSummaryState('error');
    }
  };

  const generateDescription = async () => {
    if (!videoData?.metadata?.title) {
      setErrorMessage('Please extract transcript first');
      return;
    }

    setDescriptionState('processing');
    setErrorMessage(null);
    
    try {
      const response = await fetch('/api/youtube/description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: videoData.metadata.title,
          transcript: videoData.fullTranscript,
          summary: videoData.analysis?.summary,
          originalDescription: videoData.metadata.description
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setVideoData(prev => prev ? {
        ...prev,
        analysis: { 
          summary: prev.analysis?.summary || '',
          generatedDescription: result.data.description,
          keywords: prev.analysis?.keywords || [],
          clipSuggestions: prev.analysis?.clipSuggestions || []
        }
      } : null);
      setDescriptionState('success');
      
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate description');
      setDescriptionState('error');
    }
  };

  const generateKeywords = async () => {
    if (!videoData?.metadata?.title) {
      setErrorMessage('Please extract transcript first');
      return;
    }

    setKeywordsState('processing');
    setErrorMessage(null);
    
    try {
      const response = await fetch('/api/youtube/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: videoData.metadata.title,
          transcript: videoData.fullTranscript,
          summary: videoData.analysis?.summary
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setVideoData(prev => prev ? {
        ...prev,
        analysis: { 
          summary: prev.analysis?.summary || '',
          generatedDescription: prev.analysis?.generatedDescription || '',
          keywords: result.data.keywords,
          clipSuggestions: prev.analysis?.clipSuggestions || []
        }
      } : null);
      setKeywordsState('success');
      
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate keywords');
      setKeywordsState('error');
    }
  };

  const generateClips = async () => {
    if (!videoData?.metadata?.title || !videoData?.fullTranscript) {
      setErrorMessage('Please extract transcript first');
      return;
    }

    setClipsState('processing');
    setErrorMessage(null);
    
    try {
      const response = await fetch('/api/youtube/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: videoData.metadata.title,
          transcript: videoData.fullTranscript,
          duration: videoData.metadata.duration
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setVideoData(prev => prev ? {
        ...prev,
        analysis: { 
          summary: prev.analysis?.summary || '',
          generatedDescription: prev.analysis?.generatedDescription || '',
          keywords: prev.analysis?.keywords || [],
          clipSuggestions: result.data.clips
        }
      } : null);
      setClipsState('success');
      
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate clips');
      setClipsState('error');
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const tools = [
    { id: 'transcript', name: 'Extract Transcript', icon: '📝', state: transcriptState, action: extractTranscript },
    { id: 'summary', name: 'Generate Summary', icon: '🎯', state: summaryState, action: generateSummary },
    { id: 'description', name: 'Write Description', icon: '📄', state: descriptionState, action: generateDescription },
    { id: 'keywords', name: 'Generate Keywords', icon: '🏷️', state: keywordsState, action: generateKeywords },
    { id: 'clips', name: 'Find Viral Clips', icon: '✂️', state: clipsState, action: generateClips },
    { id: 'thumbnail-editor', name: 'Thumbnail Editor', icon: '🎨', state: 'idle', action: () => {} }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            YouTube Arsenal
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Content Creation Suite
          </p>
        </div>

        {/* YouTube URL Input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            YouTube URL
          </label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtu.be/example"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 text-sm"
          />
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTool(tool.id as ActiveTool);
                  if (tool.id !== 'thumbnail-editor') {
                    tool.action();
                  }
                }}
                disabled={tool.state === 'processing'}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors disabled:opacity-50 ${
                  activeTool === tool.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-l-4 border-blue-500'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">{tool.icon}</span>
                <div className="flex-1">
                  <span className="font-medium text-sm">{tool.name}</span>
                  {tool.state === 'processing' && (
                    <div className="flex items-center mt-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-2"></div>
                      <span className="text-xs text-blue-600 dark:text-blue-400">Processing...</span>
                    </div>
                  )}
                  {tool.state === 'success' && (
                    <span className="text-xs text-green-600 dark:text-green-400">✓ Complete</span>
                  )}
                  {tool.state === 'error' && (
                    <span className="text-xs text-red-600 dark:text-red-400">✗ Error</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-900 dark:text-white">User</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Error Message */}
        {errorMessage && (
          <div className="m-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 p-6">
          {activeTool === 'thumbnail-editor' ? (
            <ThumbnailEditor />
          ) : (
            <div className="space-y-6">
              {videoData && (
                <>
                  {/* Video Info Header */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="lg:w-80 flex-shrink-0">
                        <div className="aspect-video relative rounded-lg overflow-hidden">
                          <Image
                            src={videoData.metadata.thumbnail}
                            alt={videoData.metadata.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black bg-opacity-75 rounded-full p-3">
                              <Play className="w-8 h-8 text-white" />
                            </div>
                          </div>
                        </div>
                        <a
                          href={videoData.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors w-full"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Watch on YouTube</span>
                        </a>
                      </div>

                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                          {videoData.metadata.title}
                        </h2>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(videoData.metadata.duration)}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <Eye className="w-4 h-4" />
                            <span>{formatViewCount(videoData.metadata.viewCount)} views</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <User className="w-4 h-4" />
                            <span>{videoData.metadata.author}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(videoData.metadata.uploadDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p>Transcript: {videoData.fullTranscriptLength?.toLocaleString() || 0} characters</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Content Based on Active Tool */}
                  {activeTool === 'transcript' && videoData.transcript && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                          <span>📝</span>
                          <span>Extracted Transcript</span>
                        </h3>
                        <button
                          onClick={() => copyToClipboard(videoData.fullTranscript || videoData.transcript)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {videoData.transcript}
                        </p>
                      </div>
                      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        Total characters: {videoData.fullTranscriptLength?.toLocaleString()}
                      </div>
                    </div>
                  )}

                  {activeTool === 'summary' && videoData.analysis?.summary && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                          <span>🎯</span>
                          <span>AI-Generated Summary</span>
                        </h3>
                        <button
                          onClick={() => copyToClipboard(videoData.analysis.summary)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="prose prose-gray dark:prose-invert max-w-none">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                          {videoData.analysis.summary}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTool === 'description' && videoData.analysis?.generatedDescription && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                          <span>📄</span>
                          <span>YouTube Description</span>
                        </h3>
                        <button
                          onClick={() => copyToClipboard(videoData.analysis.generatedDescription)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono leading-relaxed">
                          {videoData.analysis.generatedDescription}
                        </pre>
                      </div>
                    </div>
                  )}

                  {activeTool === 'keywords' && videoData.analysis?.keywords && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                          <span>🏷️</span>
                          <span>Keywords & Tags ({videoData.analysis.keywords.length})</span>
                        </h3>
                        <button
                          onClick={() => copyToClipboard(videoData.analysis.keywords.join(', '))}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {videoData.analysis.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full font-medium"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTool === 'clips' && videoData.analysis?.clipSuggestions && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                          <span>✂️</span>
                          <span>Viral Clips ({videoData.analysis.clipSuggestions.length})</span>
                        </h3>
                      </div>
                      <div className="grid gap-6">
                        {videoData.analysis.clipSuggestions.map((clip, index) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                              <h4 className="font-bold text-lg text-gray-900 dark:text-white flex-1 pr-4">
                                {clip.improvedTitle || clip.title}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                                  (clip.viralPotential || (clip.hookScore >= 4 ? 'HIGH' : clip.hookScore >= 3 ? 'MEDIUM' : 'LOW')) === 'HIGH'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                    : (clip.viralPotential || (clip.hookScore >= 4 ? 'HIGH' : clip.hookScore >= 3 ? 'MEDIUM' : 'LOW')) === 'MEDIUM'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}>
                                  {clip.viralPotential || (clip.hookScore >= 4 ? 'HIGH' : clip.hookScore >= 3 ? 'MEDIUM' : 'LOW')}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(clip.improvedTitle || clip.title)}
                                  className="p-2 text-gray-400 hover:text-gray-600"
                                  title="Copy title"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                              <div>
                                <span className="font-medium">Duration:</span> {clip.duration || (clip.endTime - clip.startTime)}s
                              </div>
                              <div>
                                <span className="font-medium">Time:</span> {formatDuration(clip.startTime)} - {formatDuration(clip.endTime)}
                              </div>
                            </div>

                            <div className="mb-4">
                              <span className="font-medium text-gray-900 dark:text-white text-sm">Why this works:</span>
                              <p className="text-gray-600 dark:text-gray-400 mt-1">{clip.reason}</p>
                            </div>

                            {clip.strategy && (
                              <div className="mb-4">
                                <span className="font-medium text-gray-900 dark:text-white text-sm">Strategy:</span>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">{clip.strategy}</p>
                              </div>
                            )}
                            
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                              <span className="font-medium text-gray-900 dark:text-white text-sm">Content Preview:</span>
                              <p className="text-gray-700 dark:text-gray-300 mt-2 italic">
                                "{clip.transcript?.substring(0, 200) || 'Content preview not available'}..."
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Welcome Message */}
              {!videoData && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎬</div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Welcome to YouTube Arsenal
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    Enter a YouTube URL in the sidebar and start with "Extract Transcript" to begin analyzing your video.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {tools.slice(0, -1).map((tool, index) => (
                      <span key={tool.id} className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-400">
                        <span>{tool.icon}</span>
                        <span>{tool.name}</span>
                        {index < tools.length - 2 && <span className="ml-2">→</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}