'use client';

import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { 
  Search, 
  Brain, 
  Command, 
  ArrowRight, 
  Zap, 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Settings,
  MessageSquare,
  Target,
  Activity,
  Users,
  PieChart,
  Calendar,
  FileText,
  Shield,
  Lightbulb
} from 'lucide-react';

// Lazy load heavy components
const DetailedSuggestions = lazy(() => import('./DetailedSuggestions'));

interface AISuggestion {
  id: string;
  text: string;
  category: 'search' | 'action' | 'analysis' | 'navigation' | 'insight' | 'report';
  icon: React.ElementType;
  confidence?: number;
  action?: () => void;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface AICommandBarProps {
  onCommand?: (command: string) => void;
}

export default function LazyAICommandBar({ onCommand }: AICommandBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [showContextual, setShowContextual] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Debounced search to optimize performance
  const debounceTimeout = useRef<NodeJS.Timeout>();

  // Enhanced smart suggestions with contextual awareness
  const smartSuggestions: AISuggestion[] = [
    { 
      id: '1', 
      text: 'Show cash flow forecast', 
      category: 'analysis', 
      icon: TrendingUp, 
      confidence: 0.95,
      description: 'AI-powered 30-day cash flow prediction',
      priority: 'high'
    },
    { 
      id: '2', 
      text: 'Find largest expenses this month', 
      category: 'search', 
      icon: DollarSign, 
      confidence: 0.90,
      description: 'Identify top spending categories',
      priority: 'high'
    },
    { 
      id: '3', 
      text: 'Generate profit and loss report', 
      category: 'report', 
      icon: BarChart3, 
      confidence: 0.88,
      description: 'Comprehensive P&L analysis',
      priority: 'medium'
    },
    { 
      id: '4', 
      text: 'Detect unusual transactions', 
      category: 'insight', 
      icon: AlertTriangle, 
      confidence: 0.92,
      description: 'AI anomaly detection',
      priority: 'high'
    },
    { 
      id: '5', 
      text: 'Open account settings', 
      category: 'navigation', 
      icon: Settings, 
      confidence: 0.85,
      description: 'Manage account preferences',
      priority: 'low'
    },
    { 
      id: '6', 
      text: 'Start AI conversation', 
      category: 'action', 
      icon: MessageSquare, 
      confidence: 0.87,
      description: 'Chat with AI assistant',
      priority: 'medium'
    },
    { 
      id: '7', 
      text: 'View customer insights', 
      category: 'insight', 
      icon: Users, 
      confidence: 0.89,
      description: 'Customer behavior analysis',
      priority: 'medium'
    },
    { 
      id: '8', 
      text: 'Check AI accuracy metrics', 
      category: 'analysis', 
      icon: Target, 
      confidence: 0.91,
      description: 'Model performance overview',
      priority: 'low'
    }
  ];

  // Contextual suggestions based on current time and common patterns
  const contextualSuggestions: AISuggestion[] = [
    { 
      id: 'ctx1', 
      text: 'Review today\'s transactions', 
      category: 'analysis', 
      icon: Activity, 
      confidence: 0.94,
      description: 'Daily transaction summary',
      priority: 'high'
    },
    { 
      id: 'ctx2', 
      text: 'Generate monthly report', 
      category: 'report', 
      icon: Calendar, 
      confidence: 0.86,
      description: 'End-of-month summary',
      priority: 'medium'
    },
    { 
      id: 'ctx3', 
      text: 'Optimize expense categories', 
      category: 'insight', 
      icon: PieChart, 
      confidence: 0.88,
      description: 'AI-powered categorization',
      priority: 'medium'
    }
  ];

  // Optimized suggestion filtering with debouncing and contextual awareness
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      if (query.length > 0) {
        setIsLoading(true);
        const filtered = smartSuggestions
          .filter(suggestion => 
            suggestion.text.toLowerCase().includes(query.toLowerCase()) ||
            suggestion.description?.toLowerCase().includes(query.toLowerCase())
          )
          .sort((a, b) => {
            // Sort by relevance and priority
            const relevanceScore = (b.confidence || 0) - (a.confidence || 0);
            const priorityScore = getPriorityScore(b.priority) - getPriorityScore(a.priority);
            return relevanceScore + priorityScore * 0.1;
          })
          .slice(0, 6); // Show more suggestions for better UX
        
        setSuggestions(filtered);
        setSelectedIndex(-1);
        setShowContextual(false);
        setIsLoading(false);
      } else {
        // Show contextual suggestions when no query
        setSuggestions(contextualSuggestions);
        setSelectedIndex(-1);
        setShowContextual(true);
      }
    }, 120); // Reduced debounce for better responsiveness

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [query]);

  const getPriorityScore = (priority?: string) => {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Command/Ctrl + K to open
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
      }
      
      // Escape to close
      if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Enhanced navigation within suggestions
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        } else if (query) {
          handleSearch();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, suggestions, query]);

  const handleSuggestionSelect = (suggestion: AISuggestion) => {
    if (suggestion.action) {
      suggestion.action();
    } else if (onCommand) {
      onCommand(suggestion.text);
    }
    setIsOpen(false);
    setQuery('');
  };

  const handleSearch = () => {
    if (onCommand && query.trim()) {
      onCommand(query.trim());
    }
    setIsOpen(false);
    setQuery('');
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'search': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'action': return 'bg-green-100 text-green-700 border-green-200';
      case 'analysis': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'navigation': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'insight': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'report': return 'bg-teal-100 text-teal-700 border-teal-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-600';
      case 'medium': return 'bg-yellow-100 text-yellow-600';
      case 'low': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Focus management
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <>
      {/* Enhanced Trigger Button with better visual integration */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40 bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30 px-8 py-4 hover:shadow-2xl hover:bg-white/95 transition-all duration-300 group hover:scale-105"
        aria-label="Open AI Command Center"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <div className="text-base font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">AI Command Center</div>
            <div className="text-sm text-gray-500">Search anything or ask for insights...</div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-100/80 px-3 py-2 rounded-xl border border-gray-200/50">
            <Command className="w-4 h-4" />
            <span className="font-mono font-medium">K</span>
          </div>
        </div>
      </button>

      {/* Enhanced Modal with better animations and visual design */}
      {isOpen && (
        <>
          {/* Enhanced Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          {/* Enhanced Command Palette */}
          <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-3xl mx-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
              {/* Enhanced Header */}
              <div className="p-8 border-b border-gray-100/50 bg-gradient-to-r from-gray-50/50 to-blue-50/30">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-4 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-3xl shadow-lg">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">AI Command Center</h2>
                    <p className="text-gray-600">Type to search, generate reports, or get AI insights</p>
                  </div>
                </div>
                
                {/* Enhanced Search Input */}
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search transactions, generate reports, or ask for insights..."
                    className="w-full pl-14 pr-16 py-5 bg-white/80 border border-gray-200/50 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 transition-all text-lg"
                  />
                  {isLoading && (
                    <div className="absolute right-5 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  {!isLoading && query && (
                    <button
                      onClick={handleSearch}
                      className="absolute right-5 top-1/2 transform -translate-y-1/2 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Enhanced Suggestions with better visual hierarchy */}
              <div className="max-h-96 overflow-y-auto">
                <Suspense fallback={
                  <div className="p-8 text-center">
                    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-500 mt-4">Loading AI suggestions...</p>
                  </div>
                }>
                  <div className="p-6">
                    {showContextual && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Lightbulb className="w-5 h-5 text-yellow-500" />
                          <h3 className="text-sm font-semibold text-gray-700">Contextual Suggestions</h3>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {suggestions.map((suggestion, index) => {
                        const IconComponent = suggestion.icon;
                        const isSelected = index === selectedIndex;
                        
                        return (
                          <button
                            key={suggestion.id}
                            onClick={() => handleSuggestionSelect(suggestion)}
                            className={`w-full text-left p-5 rounded-2xl transition-all duration-200 flex items-center gap-4 group border ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-300 shadow-lg scale-[1.02]' 
                                : 'hover:bg-gray-50 border-gray-100 hover:border-gray-200 hover:shadow-md'
                            }`}
                          >
                            <div className={`p-3 rounded-xl border ${getCategoryColor(suggestion.category)}`}>
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-gray-900 truncate">{suggestion.text}</p>
                                {suggestion.priority && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(suggestion.priority)}`}>
                                    {suggestion.priority}
                                  </span>
                                )}
                              </div>
                              {suggestion.description && (
                                <p className="text-sm text-gray-500 truncate">{suggestion.description}</p>
                              )}
                            </div>
                            {suggestion.confidence && (
                              <div className="text-xs text-gray-400 bg-gray-100 px-3 py-2 rounded-xl">
                                {Math.round(suggestion.confidence * 100)}% match
                              </div>
                            )}
                            <ArrowRight className={`w-5 h-5 text-gray-400 transition-all duration-200 ${
                              isSelected ? 'text-blue-600 translate-x-1' : 'group-hover:text-gray-600 group-hover:translate-x-1'
                            }`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Suspense>
              </div>

              {/* Enhanced Footer */}
              <div className="p-6 border-t border-gray-100/50 bg-gradient-to-r from-gray-50/50 to-blue-50/30">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <kbd className="px-3 py-1 bg-white rounded-lg border border-gray-200 font-mono text-xs">↵</kbd>
                      <span>Execute</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-3 py-1 bg-white rounded-lg border border-gray-200 font-mono text-xs">↑↓</kbd>
                      <span>Navigate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-3 py-1 bg-white rounded-lg border border-gray-200 font-mono text-xs">esc</kbd>
                      <span>Close</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600 font-medium">
                    <Zap className="w-4 h-4" />
                    <span>Powered by AI</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}