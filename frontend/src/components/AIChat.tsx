'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, 
  Bot, 
  User, 
  Brain, 
  Sparkles,
  Loader2,
  X,
  MessageSquare,
  TrendingUp,
  DollarSign,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { ApiService } from '@/lib/api'
import toast from 'react-hot-toast'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  data?: any
  confidence?: number
  followUpQuestions?: string[]
}

interface AIChatProps {
  isOpen: boolean
  onClose: () => void
}

export default function AIChat({ isOpen, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your AI bookkeeping assistant. I can help you with:\n\n• Transaction categorization\n• Financial insights and analysis\n• Cash flow forecasting\n• Anomaly detection\n• Business recommendations\n\nWhat would you like to know about your finances?",
      timestamp: new Date(),
      followUpQuestions: [
        "Show me my recent transactions",
        "What are my top expenses this month?",
        "Predict my cash flow for next quarter",
        "Detect any unusual spending patterns"
      ]
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isProcessing) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsProcessing(true)

    try {
      const response = await ApiService.processNaturalLanguageQuery(content)
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.answer,
        timestamp: new Date(),
        data: response.data,
        confidence: response.confidence,
        followUpQuestions: response.followUpQuestions
      }

      setMessages(prev => [...prev, aiMessage])
      toast.success('AI processed your query successfully!')
    } catch (error) {
      console.error('AI query error:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I'm sorry, I encountered an error processing your request. Please try again or rephrase your question.",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
      toast.error('Failed to process your query')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question)
  }

  const formatMessage = (message: Message) => {
    if (message.type === 'user') {
      return (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex justify-end mb-4"
        >
          <div className="bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2 max-w-xs lg:max-w-md">
            <p className="text-sm">{message.content}</p>
            <p className="text-xs opacity-70 mt-1">
              {message.timestamp.toLocaleTimeString()}
            </p>
          </div>
        </motion.div>
      )
    }

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-xs lg:max-w-md">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</p>
              
              {message.confidence && (
                <div className="flex items-center gap-1 mt-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-gray-600">
                    {Math.round(message.confidence * 100)}% confidence
                  </span>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {/* Follow-up Questions */}
            {message.followUpQuestions && message.followUpQuestions.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-600 font-medium">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {message.followUpQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickQuestion(question)}
                      className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Data Visualization */}
            {message.data && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Data Summary</span>
                </div>
                <pre className="text-xs text-blue-800 overflow-x-auto">
                  {JSON.stringify(message.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Bookkeeping Assistant</h3>
              <p className="text-sm text-gray-600">Powered by Vertex AI & OpenAI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map(formatMessage)}
          </AnimatePresence>
          
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
              placeholder="Ask me anything about your finances..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isProcessing}
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={isProcessing || !inputValue.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          {/* Quick Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickQuestion("Show me my cash flow forecast")}
              className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-1"
            >
              <TrendingUp className="w-3 h-3" />
              Cash Flow
            </button>
            <button
              onClick={() => handleQuickQuestion("What are my top expenses this month?")}
              className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-1"
            >
              <DollarSign className="w-3 h-3" />
              Expenses
            </button>
            <button
              onClick={() => handleQuickQuestion("Detect any anomalies in my transactions")}
              className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3" />
              Anomalies
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
} 