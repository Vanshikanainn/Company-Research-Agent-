import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { askQuestionStream, transcribeAudio, getVisualizationData, type VisualizationData } from './api'
import type { ExecutedTool, StreamChunk } from './api'
// @ts-ignore - lamejs doesn't have type definitions
import lamejs from '@breezystack/lamejs'
import mermaid from 'mermaid'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
} from 'chart.js'
import { Bar, Line, Pie, Doughnut, Radar, PolarArea } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale
)

// Initialize Mermaid
mermaid.initialize({ 
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
})

// Helper to add space between merged words
const addSpaceBetweenWords = (text: string): string => {
  // Add space before capital letters that follow lowercase letters (camelCase detection)
  // This handles cases like "Togather" -> "To gather", "MayaResearch" -> "Maya Research"
  let result = text.replace(/([a-z])([A-Z])/g, '$1 $2')
  
  // Also handle common word boundaries in lowercase (simple heuristic)
  // Add space after common words followed by lowercase letters
  result = result.replace(/([a-z])(I)([a-z])/g, '$1 $2 $3') // "willI" -> "will I"
  result = result.replace(/([a-z])(will|can|should|would|may|might)([a-z])/gi, '$1 $2 $3')
  
  return result
}

// Helper to strip markdown formatting
const stripMarkdown = (text: string): string => {
  let cleaned = text
    // Remove code blocks (multiline)
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove headers but keep text
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    // Remove bold/italic (handle nested)
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    .replace(/^\*\*\*+$/gm, '')
    // Remove list markers (keep content)
    .replace(/^[\*\-\+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove table formatting
    .replace(/\|/g, ' ')
    .replace(/^[\s\-:]+$/gm, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
  
  return cleaned
}

type MessageBlock = 
  | { type: 'reasoning'; content: string }
  | { type: 'tool'; tool: ExecutedTool }
  | { type: 'content'; content: string }

interface Message {
  role: 'user' | 'assistant'
  content?: string // For user messages
  audioUrl?: string // For user messages with audio
  blocks?: MessageBlock[] // For assistant messages - ordered blocks
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamingMessageIndexRef = useRef<number>(-1)
  const [streamingIndex, setStreamingIndex] = useState<number>(-1)
  
  // TTS state
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number>(-1)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  
  // Visualization state
  const [isVisualizationOpen, setIsVisualizationOpen] = useState(false)
  const [visualizationData, setVisualizationData] = useState<VisualizationData | null>(null)
  const [isLoadingVisualization, setIsLoadingVisualization] = useState(false)
  const [visualizationError, setVisualizationError] = useState<string | null>(null)
  const mermaidRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [transcribedText, setTranscribedText] = useState<string>('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [showMicCard, setShowMicCard] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<number | null>(null)
  const isRecordingCanceledRef = useRef<boolean>(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const handleSendWithAudio = async (audioBlobValue: Blob, text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage = text.trim()
    const messageAudioUrl = URL.createObjectURL(audioBlobValue)
    
    // Clear input and recording state
    setInput('')
    setTranscribedText('')
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setError(null)
    
    // Auto-close visualization panel when new prompt is entered
    if (isVisualizationOpen) {
      closeVisualization()
    }

    // Add user message to UI with audio
    const newUserMessage: Message = { 
      role: 'user', 
      content: userMessage,
      audioUrl: messageAudioUrl
    }
    
    // Create placeholder for streaming AI message
    const aiMessagePlaceholder: Message = { 
      role: 'assistant', 
      blocks: []
    }
    
    setMessages((prev) => {
      const newMessages = [...prev, newUserMessage, aiMessagePlaceholder]
      const index = newMessages.length - 1
      streamingMessageIndexRef.current = index
      setStreamingIndex(index)
      return newMessages
    })
    setIsLoading(true)

    try {
      // Get previous user messages only (not AI responses)
      const previousUserMessages = messages
        .filter((msg) => msg.role === 'user')
        .map((msg) => [msg.content || ''])

      // Stream the response
      await askQuestionStream(
        userMessage,
        previousUserMessages,
        (chunk: StreamChunk) => {
          // Update the streaming message with new chunk
          setMessages((prev) => {
            const newMessages = [...prev]
            const index = streamingMessageIndexRef.current
            if (index >= 0 && index < newMessages.length) {
              const currentMessage = newMessages[index]
              const currentBlocks = currentMessage.blocks || []
              const newBlocks = [...currentBlocks] // Create new array
              let hasChanges = false
              
              // Handle reasoning - append to last reasoning block or create new one
              if (chunk.reasoning && chunk.reasoning.length > 0) {
                // Filter out </tool> tags and clean up reasoning text
                let cleanedReasoning = chunk.reasoning
                  .replace(/<\/tool>/g, '') // Remove </tool> tags
                  .replace(/<think>/g, '') // Remove opening think tag
                  .replace(/<\/think>/g, '') // Remove closing think tag
                  .replace(/<think>/g, '') // Remove opening redacted tag
                  .replace(/<\/redacted_reasoning>/g, '') // Remove closing redacted tag
                
                // Extract <output> blocks from reasoning
                const outputMatches = cleanedReasoning.match(/<output>(.*?)<\/output>/gs)
                let reasoningWithoutOutput = cleanedReasoning
                
                // Remove output blocks from reasoning text
                if (outputMatches) {
                  outputMatches.forEach(match => {
                    reasoningWithoutOutput = reasoningWithoutOutput.replace(match, '')
                  })
                  reasoningWithoutOutput = reasoningWithoutOutput.trim()
                  
                  // Create output blocks for each extracted output
                  outputMatches.forEach(outputMatch => {
                    // Extract content between <output> tags
                    const contentMatch = outputMatch.match(/<output>(.*?)<\/output>/s)
                    if (contentMatch) {
                      const outputContent = contentMatch[1].trim()
                      if (outputContent.length > 0) {
                        // Check if we already have this output (avoid duplicates)
                        const existingOutputBlocks = newBlocks.filter(b => 
                          b.type === 'tool' && 
                          (b as { type: 'tool'; tool: ExecutedTool }).tool.type === 'output' &&
                          (b as { type: 'tool'; tool: ExecutedTool }).tool.output === outputContent
                        )
                        if (existingOutputBlocks.length === 0) {
                          // Create a tool block with just output (no tool call)
                          newBlocks.push({
                            type: 'tool',
                            tool: {
                              index: -1,
                              type: 'output',
                              output: outputContent
                            }
                          })
                          hasChanges = true
                        }
                      }
                    }
                  })
                }
                
                if (reasoningWithoutOutput.length > 0) {
                  const lastIndex = newBlocks.length - 1
                  const lastBlock = newBlocks[lastIndex]
                  if (lastBlock && lastBlock.type === 'reasoning') {
                    // Add space if needed when concatenating (prevent word merging)
                    const lastChar = lastBlock.content.slice(-1)
                    const firstChar = reasoningWithoutOutput[0]
                    // Add space if both are alphanumeric and no space exists
                    const needsSpace = /[a-zA-Z0-9]/.test(lastChar) && 
                                     /[a-zA-Z0-9]/.test(firstChar) && 
                                     lastChar !== ' ' && 
                                     firstChar !== ' '
                    const separator = needsSpace ? ' ' : ''
                    
                    // Combine and try to fix merged words
                    const combined = lastBlock.content + separator + reasoningWithoutOutput
                    const fixedText = addSpaceBetweenWords(combined)
                    
                    // Create new block with appended content (immutable update)
                    newBlocks[lastIndex] = {
                      type: 'reasoning',
                      content: fixedText
                    }
                  } else {
                    // Fix merged words in new reasoning block
                    const fixedText = addSpaceBetweenWords(reasoningWithoutOutput)
                    newBlocks.push({ type: 'reasoning', content: fixedText })
                  }
                  hasChanges = true
                }
              }

              // Handle tools - add as new tool blocks
              if (chunk.executed_tools && chunk.executed_tools.length > 0) {
                const existingToolIndices = new Set(
                  newBlocks
                    .filter(b => b.type === 'tool')
                    .map(b => (b as { type: 'tool'; tool: ExecutedTool }).tool.index)
                )
                for (const tool of chunk.executed_tools) {
                  if (!existingToolIndices.has(tool.index)) {
                    newBlocks.push({ type: 'tool', tool })
                    existingToolIndices.add(tool.index)
                    hasChanges = true
                  }
                }
              }

              // Handle content - append to last content block or create new one
              if (chunk.content && chunk.content.length > 0) {
                const lastIndex = newBlocks.length - 1
                const lastBlock = newBlocks[lastIndex]
                if (lastBlock && lastBlock.type === 'content') {
                  // Create new block with appended content (immutable update)
                  newBlocks[lastIndex] = {
                    type: 'content',
                    content: lastBlock.content + chunk.content
                  }
                } else {
                  // Create new content block
                  newBlocks.push({ type: 'content', content: chunk.content })
                }
                hasChanges = true
              }

              // Only update if there are actual changes
              if (hasChanges) {
                newMessages[index] = {
                  ...currentMessage,
                  blocks: newBlocks
                }
                return newMessages
              }
            }
            return prev // Return previous state if no changes
          })
          // Auto-scroll as content streams
          setTimeout(scrollToBottom, 50)
        },
        () => {
          // Streaming complete
          setIsLoading(false)
          streamingMessageIndexRef.current = -1
          setStreamingIndex(-1)
          scrollToBottom()
        },
        (err: Error) => {
          // Error occurred
          setIsLoading(false)
          setError(err.message)
          const index = streamingMessageIndexRef.current
          streamingMessageIndexRef.current = -1
          setStreamingIndex(-1)
          // Remove the empty streaming message on error
          setMessages((prev) => {
            if (index >= 0 && (!prev[index]?.blocks || prev[index]?.blocks?.length === 0)) {
              return prev.filter((_, i) => i !== index)
            }
            return prev
          })
        }
      )
    } catch (err) {
      setIsLoading(false)
      setError(err instanceof Error ? err.message : 'Failed to get response')
      console.error('Error:', err)
      streamingMessageIndexRef.current = -1
      setStreamingIndex(-1)
    }
  }

  const handleSend = async () => {
    const messageText = transcribedText || input.trim()
    if (!messageText || isLoading) return

    const userMessage = messageText
    let messageAudioUrl: string | undefined = undefined
    
    // Create a new URL for the message if audio exists (so it persists after clearing state)
    if (audioBlob) {
      messageAudioUrl = URL.createObjectURL(audioBlob)
    }
    
    // Clear input and recording state
    setInput('')
    setTranscribedText('')
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setError(null)
    
    // Auto-close visualization panel when new prompt is entered
    if (isVisualizationOpen) {
      closeVisualization()
    }

    // Add user message to UI with audio if available
    const newUserMessage: Message = { 
      role: 'user', 
      content: userMessage,
      audioUrl: messageAudioUrl
    }
    setMessages((prev) => [...prev, newUserMessage])
    setIsLoading(true)

    // Create placeholder for streaming AI message
    const aiMessagePlaceholder: Message = { 
      role: 'assistant', 
      blocks: []
    }
    setMessages((prev) => {
      const newMessages = [...prev, aiMessagePlaceholder]
      const index = newMessages.length - 1
      streamingMessageIndexRef.current = index
      setStreamingIndex(index)
      return newMessages
    })

    try {
      // Get previous user messages only (not AI responses)
      const previousUserMessages = messages
        .filter((msg) => msg.role === 'user')
        .map((msg) => [msg.content || ''])

      // Stream the response
      await askQuestionStream(
        userMessage,
        previousUserMessages,
        (chunk: StreamChunk) => {
          // Update the streaming message with new chunk
          setMessages((prev) => {
            const newMessages = [...prev]
            const index = streamingMessageIndexRef.current
            if (index >= 0 && index < newMessages.length) {
              const currentMessage = newMessages[index]
              const currentBlocks = currentMessage.blocks || []
              const newBlocks = [...currentBlocks] // Create new array
              let hasChanges = false
              
              // Handle reasoning - append to last reasoning block or create new one
              if (chunk.reasoning && chunk.reasoning.length > 0) {
                // Filter out </tool> tags and clean up reasoning text
                let cleanedReasoning = chunk.reasoning
                  .replace(/<\/tool>/g, '') // Remove </tool> tags
                  .replace(/<think>/g, '') // Remove opening think tag
                  .replace(/<\/think>/g, '') // Remove closing think tag
                  .replace(/<think>/g, '') // Remove opening redacted tag
                  .replace(/<\/redacted_reasoning>/g, '') // Remove closing redacted tag
                
                // Extract <output> blocks from reasoning
                const outputMatches = cleanedReasoning.match(/<output>(.*?)<\/output>/gs)
                let reasoningWithoutOutput = cleanedReasoning
                
                // Remove output blocks from reasoning text
                if (outputMatches) {
                  outputMatches.forEach(match => {
                    reasoningWithoutOutput = reasoningWithoutOutput.replace(match, '')
                  })
                  reasoningWithoutOutput = reasoningWithoutOutput.trim()
                  
                  // Create output blocks for each extracted output
                  outputMatches.forEach(outputMatch => {
                    // Extract content between <output> tags
                    const contentMatch = outputMatch.match(/<output>(.*?)<\/output>/s)
                    if (contentMatch) {
                      const outputContent = contentMatch[1].trim()
                      if (outputContent.length > 0) {
                        // Check if we already have this output (avoid duplicates)
                        const existingOutputBlocks = newBlocks.filter(b => 
                          b.type === 'tool' && 
                          (b as { type: 'tool'; tool: ExecutedTool }).tool.type === 'output' &&
                          (b as { type: 'tool'; tool: ExecutedTool }).tool.output === outputContent
                        )
                        if (existingOutputBlocks.length === 0) {
                          // Create a tool block with just output (no tool call)
                          newBlocks.push({
                            type: 'tool',
                            tool: {
                              index: -1,
                              type: 'output',
                              output: outputContent
                            }
                          })
                          hasChanges = true
                        }
                      }
                    }
                  })
                }
                
                if (reasoningWithoutOutput.length > 0) {
                  const lastIndex = newBlocks.length - 1
                  const lastBlock = newBlocks[lastIndex]
                  if (lastBlock && lastBlock.type === 'reasoning') {
                    // Add space if needed when concatenating (prevent word merging)
                    const lastChar = lastBlock.content.slice(-1)
                    const firstChar = reasoningWithoutOutput[0]
                    // Add space if both are alphanumeric and no space exists
                    const needsSpace = /[a-zA-Z0-9]/.test(lastChar) && 
                                     /[a-zA-Z0-9]/.test(firstChar) && 
                                     lastChar !== ' ' && 
                                     firstChar !== ' '
                    const separator = needsSpace ? ' ' : ''
                    
                    // Combine and try to fix merged words
                    const combined = lastBlock.content + separator + reasoningWithoutOutput
                    const fixedText = addSpaceBetweenWords(combined)
                    
                    // Create new block with appended content (immutable update)
                    newBlocks[lastIndex] = {
                      type: 'reasoning',
                      content: fixedText
                    }
                  } else {
                    // Fix merged words in new reasoning block
                    const fixedText = addSpaceBetweenWords(reasoningWithoutOutput)
                    newBlocks.push({ type: 'reasoning', content: fixedText })
                  }
                  hasChanges = true
                }
              }

              // Handle tools - add as new tool blocks
              if (chunk.executed_tools && chunk.executed_tools.length > 0) {
                const existingToolIndices = new Set(
                  newBlocks
                    .filter(b => b.type === 'tool')
                    .map(b => (b as { type: 'tool'; tool: ExecutedTool }).tool.index)
                )
                for (const tool of chunk.executed_tools) {
                  if (!existingToolIndices.has(tool.index)) {
                    newBlocks.push({ type: 'tool', tool })
                    existingToolIndices.add(tool.index)
                    hasChanges = true
                  }
                }
              }

              // Handle content - append to last content block or create new one
              if (chunk.content && chunk.content.length > 0) {
                const lastIndex = newBlocks.length - 1
                const lastBlock = newBlocks[lastIndex]
                if (lastBlock && lastBlock.type === 'content') {
                  // Create new block with appended content (immutable update)
                  newBlocks[lastIndex] = {
                    type: 'content',
                    content: lastBlock.content + chunk.content
                  }
                } else {
                  // Create new content block
                  newBlocks.push({ type: 'content', content: chunk.content })
                }
                hasChanges = true
              }

              // Only update if there are actual changes
              if (hasChanges) {
                newMessages[index] = {
                  ...currentMessage,
                  blocks: newBlocks
                }
                return newMessages
              }
            }
            return prev // Return previous state if no changes
          })
          // Auto-scroll as content streams
          setTimeout(scrollToBottom, 50)
        },
        () => {
          // Streaming complete
          setIsLoading(false)
          streamingMessageIndexRef.current = -1
          setStreamingIndex(-1)
          scrollToBottom()
        },
        (err: Error) => {
          // Error occurred
          setIsLoading(false)
          setError(err.message)
          const index = streamingMessageIndexRef.current
          streamingMessageIndexRef.current = -1
          setStreamingIndex(-1)
          // Remove the empty streaming message on error
          setMessages((prev) => {
            if (index >= 0 && (!prev[index]?.blocks || prev[index]?.blocks?.length === 0)) {
              return prev.filter((_, i) => i !== index)
            }
            return prev
          })
        }
      )
    } catch (err) {
      setIsLoading(false)
      setError(err instanceof Error ? err.message : 'Failed to get response')
      console.error('Error:', err)
      streamingMessageIndexRef.current = -1
      setStreamingIndex(-1)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Convert audio blob to MP3
  const convertToMP3 = async (audioBlob: Blob): Promise<Blob> => {
    const audioContext = new AudioContext()
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    // Convert to mono if needed
    const samples = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate
    
    // Convert Float32Array to Int16Array
    const int16Samples = new Int16Array(samples.length)
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]))
      int16Samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    
    // Encode to MP3 using lamejs
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128)
    const mp3Data: Uint8Array[] = []
    const sampleBlockSize = 1152
    
    for (let i = 0; i < int16Samples.length; i += sampleBlockSize) {
      const sampleChunk = int16Samples.subarray(i, i + sampleBlockSize)
      const mp3buf = mp3encoder.encodeBuffer(sampleChunk)
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf)
      }
    }
    
    const mp3buf = mp3encoder.flush()
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf)
    }
    
    return new Blob(mp3Data as BlobPart[], { type: 'audio/mpeg' })
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      setRecordingDuration(0)
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        // Stop timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
        
        // Stop all tracks first
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
        
        setIsRecording(false)
        mediaRecorderRef.current = null
        
        // If recording was canceled, don't process it
        if (isRecordingCanceledRef.current) {
          isRecordingCanceledRef.current = false
          audioChunksRef.current = []
          setRecordingDuration(0)
          return
        }
        
        if (audioChunksRef.current.length > 0) {
          try {
            // Convert to MP3
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            const mp3Blob = await convertToMP3(audioBlob)
            const url = URL.createObjectURL(mp3Blob)
            
            setAudioBlob(mp3Blob)
            setAudioUrl(url)
            
            // Close mic card
            setShowMicCard(false)
            
            // Automatically transcribe
            setIsTranscribing(true)
            setError(null)
            
            const file = new File([mp3Blob], 'recording.mp3', { type: 'audio/mpeg' })
            const response = await transcribeAudio(file)
            const transcribedTextValue = response.text
            
            setTranscribedText(transcribedTextValue)
            setIsTranscribing(false)
            
            // Automatically send the message
            if (transcribedTextValue.trim() && !isLoading) {
              await handleSendWithAudio(mp3Blob, transcribedTextValue)
            }
          } catch (err) {
            setIsTranscribing(false)
            setError(err instanceof Error ? err.message : 'Failed to process recording')
            console.error('Error processing recording:', err)
          }
        }
      }
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setIsRecording(false)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
        setError('Recording error occurred')
        setShowMicCard(false)
      }
      
      mediaRecorder.start()
      setIsRecording(true)
      setError(null)
    } catch (err) {
      setError('Failed to start recording. Please allow microphone access.')
      console.error('Error starting recording:', err)
      setIsRecording(false)
      setShowMicCard(false)
    }
  }

  const stopRecording = (canceled: boolean = false) => {
    try {
      // Set canceled flag before stopping
      if (canceled) {
        isRecordingCanceledRef.current = true
      }
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      
      if (mediaRecorderRef.current) {
        // Check if MediaRecorder is actually recording
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        } else {
          // If not recording, just clean up
          setIsRecording(false)
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
          }
          mediaRecorderRef.current = null
          if (canceled) {
            isRecordingCanceledRef.current = false
          }
        }
      } else {
        // Fallback: stop stream directly if MediaRecorder is null
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
        setIsRecording(false)
        if (canceled) {
          isRecordingCanceledRef.current = false
        }
      }
    } catch (err) {
      console.error('Error stopping recording:', err)
      // Force cleanup on error
      setIsRecording(false)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      mediaRecorderRef.current = null
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      if (canceled) {
        isRecordingCanceledRef.current = false
      }
    }
  }

  const handleMicButtonClick = () => {
    if (isRecording) {
      stopRecording(false) // Stop and save
      setShowMicCard(false)
    } else {
      setShowMicCard(true)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const clearRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setTranscribedText('')
    setIsTranscribing(false)
  }

  // Extract content blocks only (no reasoning or tools)
  const getContentText = (message: Message): string => {
    if (!message.blocks) return ''
    
    const contentBlocks = message.blocks
      .filter(block => block.type === 'content')
      .map(block => (block as { type: 'content'; content: string }).content)
      .join('\n\n')
    
    return contentBlocks
  }

  const handleReadAloud = (messageIndex: number) => {
    const message = messages[messageIndex]
    if (!message || message.role !== 'assistant') return

    // Stop any currently speaking
    if (synthRef.current) {
      synthRef.current.cancel()
    }

    // Get content text only
    const contentText = getContentText(message)
    if (!contentText.trim()) return

    // Strip markdown
    const plainText = stripMarkdown(contentText)
    if (!plainText.trim()) return

    // Initialize speech synthesis
    if (!synthRef.current) {
      synthRef.current = window.speechSynthesis
    }

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(plainText)
    utterance.rate = 0.85  // Slower pace for better comprehension
    utterance.pitch = 0.9   // Lower pitch for more natural sound
    utterance.volume = 1.0

    utterance.onend = () => {
      setSpeakingMessageIndex(-1)
    }

    utterance.onerror = () => {
      setSpeakingMessageIndex(-1)
    }

    // Start speaking
    setSpeakingMessageIndex(messageIndex)
    synthRef.current.speak(utterance)
  }

  const handleStopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    setSpeakingMessageIndex(-1)
  }

  const handleVisualize = async (messageIndex: number) => {
    const message = messages[messageIndex]
    if (!message || message.role !== 'assistant') return

    // Get content text only (same as TTS)
    const contentText = getContentText(message)
    if (!contentText.trim()) return

    // Strip markdown (same as TTS)
    const plainText = stripMarkdown(contentText)
    if (!plainText.trim()) return

    setIsLoadingVisualization(true)
    setVisualizationError(null)
    setIsVisualizationOpen(true)

    try {
      const data = await getVisualizationData(plainText)
      setVisualizationData(data)
      // Mermaid diagrams will be rendered by useEffect when visualizationData changes
    } catch (err) {
      setVisualizationError(err instanceof Error ? err.message : 'Failed to load visualization data')
      console.error('Error loading visualization:', err)
    } finally {
      setIsLoadingVisualization(false)
    }
  }

  const renderMermaidDiagrams = useCallback(() => {
    mermaidRefs.current.forEach((element, index) => {
      if (element && visualizationData?.mermaid?.diagrams?.[index]) {
        const diagram = visualizationData.mermaid.diagrams[index]
        const id = `mermaid-${index}`
        element.innerHTML = '' // Clear previous content
        
        mermaid.render(id, diagram.code).then((result) => {
          element.innerHTML = result.svg
        }).catch((err) => {
          console.error('Mermaid rendering error:', err)
          element.innerHTML = `<div style="color: red; padding: 10px;">Error rendering diagram: ${err.message}</div>`
        })
      }
    })
  }, [visualizationData])

  const closeVisualization = () => {
    setIsVisualizationOpen(false)
    setVisualizationData(null)
    setVisualizationError(null)
  }

  useEffect(() => {
    // Initialize synth ref
    synthRef.current = window.speechSynthesis
    
    // Cleanup on unmount
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  // Re-render Mermaid diagrams when visualization data changes
  useEffect(() => {
    if (visualizationData?.mermaid?.diagrams && isVisualizationOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        renderMermaidDiagrams()
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [visualizationData, isVisualizationOpen, renderMermaidDiagrams])

  const parseSearchOutput = (output: string) => {
    // Parse the output format: "Title: ... URL: ... Content: ... Score: ..."
    const results: Array<{ title: string; url: string; content: string; score?: string }> = []
    
    if (!output || output.trim().length === 0) {
      return results
    }
    
    // Remove any XML-like tags first (but keep the content)
    let cleanOutput = output
      .replace(/<\/?tool>/g, '')
      .replace(/<\/?output>/g, '')
      .trim()
    
    // Split by "Title:" to get individual results
    const parts = cleanOutput.split(/Title:/g).filter(p => p.trim())
    
    for (const part of parts) {
      const titleMatch = part.match(/^([^\n]+)/)
      const urlMatch = part.match(/URL:\s*([^\n]+)/)
      // Content can span multiple lines until we hit Title:, URL:, or Score:
      const contentMatch = part.match(/Content:\s*((?:[^\n]+(?:\n(?!Title:|URL:|Score:)[^\n]+)*)?)/)
      const scoreMatch = part.match(/Score:\s*([^\n]+)/)
      
      if (titleMatch || urlMatch) {
        let content = contentMatch ? contentMatch[1].trim() : ''
        // Clean up content - remove any trailing "This indicates that" phrases
        content = content.replace(/\s*This indicates that.*$/i, '').trim()
        
        results.push({
          title: titleMatch ? titleMatch[1].trim() : '',
          url: urlMatch ? urlMatch[1].trim() : '',
          content: content,
          score: scoreMatch ? scoreMatch[1].trim() : undefined
        })
      }
    }
    
    return results
  }

  const renderTool = (tool: ExecutedTool, toolIndex: number) => {
    // Parse tool output if available
    let parsedOutput: Array<{ title: string; url: string; content: string; score?: string }> = []
    let rawOutput = ''
    
    if (tool.output) {
      // Check if output contains <output> tags
      const outputMatch = tool.output.match(/<output>(.*?)<\/output>/s)
      if (outputMatch) {
        rawOutput = outputMatch[1].trim()
        parsedOutput = parseSearchOutput(rawOutput)
      } else {
        // No <output> tags, parse the whole output
        parsedOutput = parseSearchOutput(tool.output)
        rawOutput = tool.output
      }
    }

    // If this is an output-only block (no tool call), just show output
    if (tool.type === 'output' && !tool.arguments) {
      return (
        <div key={toolIndex} className="mb-5 p-0 bg-transparent border-none">
          {/* Output Section Only */}
          <div className="mt-4 px-5 py-4 bg-blue-500/10 border-l-4 border-blue-500 rounded-lg backdrop-blur-[10px] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <div className="text-[11px] text-blue-500 font-mono mb-3 font-semibold uppercase tracking-wide">&lt;output&gt;</div>
            <div className="text-sm text-foreground">
              {/* Show parsed output if available */}
              {parsedOutput.length > 0 ? (
                <div className="mt-3 flex flex-col gap-4">
                  {parsedOutput.map((result, idx) => (
                    <div key={idx} className="p-4 bg-white/80 border-l-4 border-primary rounded-lg backdrop-blur-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                      {result.title && (
                        <div className="font-semibold text-[15px] mb-1.5 flex items-center gap-2">
                          <span>🔍</span>
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-primary no-underline transition-colors hover:text-blue-600 hover:underline">
                            {result.title}
                          </a>
                        </div>
                      )}
                      {result.url && (
                        <div className="text-[13px] mb-2 flex items-center gap-1.5">
                          <span>🔗</span>
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 no-underline break-all transition-colors hover:text-primary hover:underline">
                            {result.url}
                          </a>
                        </div>
                      )}
                      {result.content && (
                        <div className="text-sm text-slate-600 leading-relaxed mt-1.5">{result.content}</div>
                      )}
                      {result.score && (
                        <div className="text-xs text-slate-500 mt-2 italic flex items-center gap-1">
                          <span>📊</span>
                          Score: {result.score}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Show raw output if no structured data */
                <div className="font-mono text-xs text-slate-700 whitespace-pre-wrap break-words leading-relaxed bg-white/60 p-3 rounded-md border border-slate-300/20">{rawOutput}</div>
              )}
            </div>
          </div>
        </div>
      )
    }

    // Parse arguments to show tool call
    let toolCallDisplay = tool.type
    if (tool.arguments) {
      try {
        const args = JSON.parse(tool.arguments)
        if (args.query) {
          toolCallDisplay = `${tool.type}(${args.query})`
        } else if (args.url) {
          toolCallDisplay = `${tool.type}(${args.url})`
        } else {
          toolCallDisplay = `${tool.type}(${tool.arguments})`
        }
      } catch {
        toolCallDisplay = `${tool.type}(${tool.arguments})`
      }
    }

    return (
      <div key={toolIndex} className="mb-5 p-0 bg-transparent border-none">
        {/* Tool Call Section */}
        <div className="mb-4 px-5 py-4 bg-primary/10 border-l-4 border-primary rounded-lg backdrop-blur-[10px] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-primary"></div>
          <div className="text-[11px] text-slate-500 font-mono mb-2 opacity-80 uppercase tracking-wide font-semibold">&lt;tool&gt;</div>
          <div className="text-sm text-foreground font-mono font-semibold mb-2">
            {toolCallDisplay}
          </div>
          {tool.arguments && (
            <div className="mt-3 text-xs text-slate-600">
              {tool.type.toUpperCase()}
              <div className="font-mono bg-white/80 px-3 py-2 rounded-md mt-1.5 border border-slate-300/20 text-[11px] text-slate-700 break-all backdrop-blur-[5px]">{tool.arguments}</div>
            </div>
          )}
        </div>
        
        {/* Output Section */}
        {(parsedOutput.length > 0 || rawOutput) && (
          <div className="mt-4 px-5 py-4 bg-blue-500/10 border-l-4 border-blue-500 rounded-lg backdrop-blur-[10px] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <div className="text-[11px] text-blue-500 font-mono mb-3 font-semibold uppercase tracking-wide">&lt;output&gt;</div>
            <div className="text-sm text-foreground">
              {/* Show parsed output if available */}
              {parsedOutput.length > 0 ? (
                <div className="mt-3 flex flex-col gap-4">
                  {parsedOutput.map((result, idx) => (
                    <div key={idx} className="p-4 bg-white/80 border-l-4 border-primary rounded-lg backdrop-blur-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                      {result.title && (
                        <div className="font-semibold text-[15px] mb-1.5 flex items-center gap-2">
                          <span>🔍</span>
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-primary no-underline transition-colors hover:text-blue-600 hover:underline">
                            {result.title}
                          </a>
                        </div>
                      )}
                      {result.url && (
                        <div className="text-[13px] mb-2 flex items-center gap-1.5">
                          <span>🔗</span>
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 no-underline break-all transition-colors hover:text-primary hover:underline">
                            {result.url}
                          </a>
                        </div>
                      )}
                      {result.content && (
                        <div className="text-sm text-slate-600 leading-relaxed mt-1.5">{result.content}</div>
                      )}
                      {result.score && (
                        <div className="text-xs text-slate-500 mt-2 italic flex items-center gap-1">
                          <span>📊</span>
                          Score: {result.score}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Fallback to search_results if no parsed output */
                tool.search_results?.results && tool.search_results.results.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-4">
                    {tool.search_results.results.map((result: any, idx: number) => (
                    <div key={idx} className="p-4 bg-white/80 border-l-4 border-primary rounded-lg backdrop-blur-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                      {result.title && (
                        <div className="font-semibold text-[15px] mb-1.5 flex items-center gap-2">
                          <span>🔍</span>
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-primary no-underline transition-colors hover:text-blue-600 hover:underline">
                              {result.title}
                            </a>
                          </div>
                        )}
                        {result.url && (
                          <div className="text-[13px] mb-2 flex items-center gap-1.5">
                            <span>🔗</span>
                            <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 no-underline break-all transition-colors hover:text-primary hover:underline">
                              {result.url}
                            </a>
                          </div>
                        )}
                        {result.content && (
                          <div className="text-sm text-slate-600 leading-relaxed mt-1.5">{result.content}</div>
                        )}
                        {result.score !== undefined && (
                          <div className="text-xs text-slate-500 mt-2 italic flex items-center gap-1">
                            <span>📊</span>
                            Score: {result.score}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Show raw output if no structured data */
                  <div className="font-mono text-xs text-slate-700 whitespace-pre-wrap break-words leading-relaxed bg-white/60 p-3 rounded-md border border-slate-300/20">{rawOutput}</div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Helper function to render Chart.js charts
  const renderChart = (chart: VisualizationData['chartjs']['charts'][0]) => {
    const chartData = {
      labels: chart.data.labels,
      datasets: chart.data.datasets.map((dataset: VisualizationData['chartjs']['charts'][0]['data']['datasets'][0]) => ({
        ...dataset,
        backgroundColor: dataset.backgroundColor || ['rgba(102, 126, 234, 0.2)'],
        borderColor: dataset.borderColor || 'rgba(102, 126, 234, 1)',
        borderWidth: dataset.borderWidth || 1,
      })),
    }
    
    const chartOptions = {
      responsive: chart.options?.responsive !== false,
      plugins: {
        legend: {
          position: (chart.options?.plugins?.legend?.position as any) || 'top',
        },
        title: {
          display: chart.options?.plugins?.title?.display !== false,
          text: chart.options?.plugins?.title?.text || chart.title,
        },
      },
    }
    
    switch (chart.type.toLowerCase()) {
      case 'bar':
        return <Bar data={chartData} options={chartOptions} />
      case 'line':
        return <Line data={chartData} options={chartOptions} />
      case 'pie':
        return <Pie data={chartData} options={chartOptions} />
      case 'doughnut':
        return <Doughnut data={chartData} options={chartOptions} />
      case 'radar':
        return <Radar data={chartData} options={chartOptions} />
      case 'polararea':
        return <PolarArea data={chartData} options={chartOptions} />
      default:
        return <Bar data={chartData} options={chartOptions} />
    }
  }

  return (
    <div className="min-h-screen w-full overflow-hidden bg-background">
      {/* Main Chat Container - Full Width */}
      <div className="h-screen w-full flex flex-col bg-white">
        {/* Header */}
        <header className="flex-shrink-0 bg-gradient-primary text-white px-6 py-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-primary/10 pointer-events-none"></div>
          <div className="relative z-10 flex items-center justify-between max-w-7xl mx-auto">
            <Link 
              to="/" 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-300 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Back</span>
            </Link>
            <div className="flex-1 text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">
                Company Research Agent
              </h1>
              <p className="text-base md:text-lg text-white/90 font-light">
                Ask me anything about companies
              </p>
            </div>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </header>

        {/* Messages Area - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 bg-background scrollbar-thin">
          {messages.length === 0 && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-md mx-auto px-8 py-12 bg-card rounded-3xl shadow-lg border border-border relative">
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-6xl opacity-5">👋</div>
                <div className="relative z-10">
                  <p className="text-lg md:text-xl font-semibold text-card-foreground mb-3">
                    👋 Welcome! I'm your company research assistant.
                  </p>
                  <p className="text-base md:text-lg text-muted-foreground">
                    Ask me a question to get started!
                  </p>
                </div>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex mb-6 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] md:max-w-[75%] break-words ${
                message.role === 'user' 
                  ? 'bg-gradient-primary text-white px-5 py-3 rounded-2xl rounded-br-sm shadow-md' 
                  : 'bg-card text-card-foreground border border-border rounded-2xl rounded-bl-sm shadow-sm px-5 py-3'
              }`}>
                {message.role === 'user' ? (
                  <div className="space-y-2">
                    {message.audioUrl && (
                      <audio controls src={message.audioUrl} className="w-full max-w-xs h-8" />
                    )}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Render blocks in order */}
                    {message.blocks && message.blocks.length > 0 ? (
                      message.blocks.map((block, blockIndex) => {
                        if (block.type === 'reasoning') {
                          return (
                            <div key={blockIndex} className="text-xs text-slate-500 italic px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 font-mono whitespace-pre-wrap break-words">
                              {block.content}
                            </div>
                          )
                        } else if (block.type === 'tool') {
                          return (
                            <div key={blockIndex} className="my-2">
                              {renderTool(block.tool, block.tool.index)}
                            </div>
                          )
                        } else if (block.type === 'content') {
                          const cleanedContent = block.content
                            .replace(/<br\s*\/?>/gi, '\n\n')
                            .replace(/<br>/gi, '\n\n')
                          
                          return (
                            <div key={blockIndex} className="prose prose-sm max-w-none text-sm">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {cleanedContent}
                              </ReactMarkdown>
                            </div>
                          )
                        }
                        return null
                      })
                    ) : (
                      isLoading && index === streamingIndex && (
                        <div className="flex gap-1.5 py-2">
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }}></span>
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                        </div>
                      )
                    )}
                    {/* Action buttons */}
                    {message.blocks && message.blocks.length > 0 && getContentText(message).trim() && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        {speakingMessageIndex === index ? (
                          <button
                            onClick={handleStopSpeaking}
                            className="px-3 py-1.5 text-xs rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="Stop reading"
                          >
                            ⏸️ Stop
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReadAloud(index)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                            title="Read aloud"
                          >
                            🔊 Read aloud
                          </button>
                        )}
                        <button
                          onClick={() => handleVisualize(index)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Visualise it"
                          disabled={isLoadingVisualization}
                        >
                          📊 Visualise it
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {error && (
            <div className="mx-auto max-w-2xl bg-red-50 text-red-600 px-4 py-3 rounded-lg border border-red-200 mb-4">
              <p className="m-0 text-sm font-medium">⚠️ {error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer - Fixed at bottom */}
        <footer className="flex-shrink-0 border-t border-border bg-card px-4 md:px-6 py-4">
          {(audioUrl || isTranscribing) && (
            <div className="flex items-center gap-3 mb-3 px-4 py-3 bg-primary/5 rounded-lg border border-primary/20">
              {isTranscribing ? (
                <div className="flex-1 flex items-center text-primary text-sm font-medium gap-2">
                  <span className="animate-pulse">🎙️</span>
                  <span>Transcribing audio...</span>
                </div>
              ) : (
                <>
                  <audio controls src={audioUrl!} className="flex-1 h-8 rounded" />
                  <button 
                    onClick={clearRecording} 
                    className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-sm hover:bg-red-600 transition-colors" 
                    title="Remove recording"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          )}
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={transcribedText || input}
                onChange={(e) => {
                  if (!transcribedText) {
                    setInput(e.target.value)
                  }
                }}
                onKeyPress={handleKeyPress}
                placeholder={isRecording ? "Recording..." : isTranscribing ? "Transcribing..." : transcribedText ? "Transcribed text (ready to send)" : "Type your question here... (Press Enter to send, Shift+Enter for new line)"}
                rows={1}
                className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-full text-sm resize-none max-h-32 overflow-y-auto bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || isRecording || isTranscribing || !!transcribedText}
              />
              <button
                onClick={handleMicButtonClick}
                className={`absolute right-2 bottom-2 w-8 h-8 rounded-full flex items-center justify-center text-base transition-all ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={isLoading || isTranscribing}
                title={isRecording ? "Stop recording" : "Start recording"}
              >
                {isRecording ? '⏹' : '🎤'}
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={isLoading || isTranscribing || (!input.trim() && !transcribedText)}
              className="w-11 h-11 rounded-full bg-gradient-primary text-white flex items-center justify-center text-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
        </footer>
      </div>
      
      {/* Mic Recording Card Modal */}
      {showMicCard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4" onClick={() => !isRecording && setShowMicCard(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative" onClick={(e) => e.stopPropagation()}>
            {!isRecording ? (
              <>
                <button
                  onClick={() => setShowMicCard(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                >
                  ✕
                </button>
                <div className="text-center">
                  <div className="mb-6 flex justify-center">
                    <div className="w-32 h-32 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg">
                      <span className="text-6xl">🎤</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Voice Recording</h3>
                  <p className="text-slate-600 mb-8">Click the button below to start recording your question</p>
                  <button
                    onClick={startRecording}
                    className="w-full py-4 px-6 bg-gradient-primary text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading || isTranscribing}
                  >
                    Start Recording
                  </button>
                  <p className="text-xs text-slate-500 mt-4">Make sure your microphone is enabled</p>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="mb-6 flex justify-center">
                  <div className="relative w-32 h-32">
                    <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20"></div>
                    <div className="absolute inset-2 rounded-full bg-red-500 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-full bg-red-600 flex items-center justify-center">
                      <span className="text-6xl">🎤</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Recording...</h3>
                <div className="text-4xl font-mono font-bold text-primary mb-6">
                  {formatDuration(recordingDuration)}
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      stopRecording(false) // Stop and save
                      setShowMicCard(false)
                    }}
                    className="px-8 py-4 bg-red-500 text-white rounded-xl font-semibold shadow-lg hover:bg-red-600 transition-all hover:scale-105 active:scale-95"
                  >
                    Stop & Save
                  </button>
                  <button
                    onClick={() => {
                      stopRecording(true) // Cancel recording
                      setShowMicCard(false)
                      setRecordingDuration(0)
                      // Clear any existing audio
                      if (audioUrl) {
                        URL.revokeObjectURL(audioUrl)
                      }
                      setAudioBlob(null)
                      setAudioUrl(null)
                      setTranscribedText('')
                      audioChunksRef.current = []
                    }}
                    className="px-8 py-4 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-all hover:scale-105 active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-6">Click "Stop & Save" when you're done speaking</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visualization Side Panel */}
      {isVisualizationOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[8px] z-[1000] flex" onClick={closeVisualization}>
          <div className="fixed left-0 top-0 bottom-0 w-[650px] max-w-[90vw] bg-background shadow-[8px_0_32px_rgba(0,0,0,0.3)] flex flex-col z-[1001] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 bg-card border-b border-border">
              <h2 className="m-0 text-xl font-bold text-card-foreground flex items-center gap-2">
                📊 Company Dashboard
              </h2>
              <button 
                className="w-8 h-8 rounded-full border border-border bg-card hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-all hover:scale-110" 
                onClick={closeVisualization} 
                title="Close"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-background scrollbar-thin">
              {isLoadingVisualization ? (
                <div className="flex flex-col items-center justify-center py-20 px-10 text-slate-500 bg-white/80 rounded-2xl backdrop-blur-[10px] border border-white/20 my-10">
                  <div className="flex gap-1.5 py-1 mb-5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce-dot" style={{ animationDelay: '-0.32s' }}></span>
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce-dot" style={{ animationDelay: '-0.16s' }}></span>
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce-dot"></span>
                  </div>
                  <p className="m-0 text-base font-medium text-center">Loading visualization data...</p>
                </div>
              ) : visualizationError ? (
                <div className="bg-gradient-to-br from-red-50 to-red-100 text-red-600 px-6 py-5 rounded-xl border border-red-300/30 my-6 shadow-[0_4px_12px_rgba(220,38,38,0.1)] backdrop-blur-[10px]">
                  <p className="m-0 text-[15px] font-medium">⚠️ {visualizationError}</p>
                </div>
              ) : visualizationData ? (
                <>
                  {/* Company Name */}
                  {visualizationData.company_name && (
                    <div className="bg-card rounded-2xl p-6 mb-6 shadow-md border border-border">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="text-5xl">🏢</div>
                        <div>
                          <h1 className="m-0 text-2xl font-bold text-card-foreground">
                            {visualizationData.company_name}
                          </h1>
                          {visualizationData.overview?.description && (
                            <p className="m-0 mt-2 text-sm text-muted-foreground">
                              {visualizationData.overview.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Overview */}
                  {visualizationData.overview && (
                    <div className="mb-6">
                      <h3 className="m-0 mb-4 text-lg font-bold text-card-foreground flex items-center gap-2">
                        <span className="w-1 h-6 bg-primary rounded"></span>
                        Overview
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {visualizationData.overview.industry && (
                          <div className="bg-card p-4 rounded-xl border border-border shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary"></div>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                              Industry
                            </div>
                            <div className="text-sm text-card-foreground leading-relaxed">
                              {visualizationData.overview.industry}
                            </div>
                          </div>
                        )}
                        {visualizationData.overview.size && (
                          <div className="bg-card p-4 rounded-xl border border-border shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary"></div>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                              Size
                            </div>
                            <div className="text-sm text-card-foreground leading-relaxed">
                              {visualizationData.overview.size}
                            </div>
                          </div>
                        )}
                        {visualizationData.overview.location && (
                          <div className="bg-card p-4 rounded-xl border border-border shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary"></div>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                              Location
                            </div>
                            <div className="text-sm text-card-foreground leading-relaxed">
                              {visualizationData.overview.location}
                            </div>
                          </div>
                        )}
                        {visualizationData.overview.description && (
                          <div className="bg-card p-4 rounded-xl border border-border shadow-sm relative overflow-hidden md:col-span-2">
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary"></div>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                              Description
                            </div>
                            <div className="text-sm text-card-foreground leading-relaxed">
                              {visualizationData.overview.description}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Work Culture */}
                  {visualizationData.work_culture && (
                    <div className="mb-6">
                      <h3 className="m-0 mb-4 text-lg font-bold text-card-foreground flex items-center gap-2">
                        <span className="w-1 h-6 bg-primary rounded"></span>
                        Work Culture
                      </h3>
                      <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                        {visualizationData.work_culture.work_life_balance && (
                          <p className="mb-4 text-sm text-card-foreground">
                            <strong className="text-card-foreground">Work-Life Balance:</strong> {visualizationData.work_culture.work_life_balance}
                          </p>
                        )}
                        {visualizationData.work_culture.company_values && visualizationData.work_culture.company_values.length > 0 && (
                          <div>
                            <strong className="block mb-2 text-sm text-card-foreground">Company Values:</strong>
                            <ul className="list-disc pl-6 space-y-1 text-sm text-card-foreground">
                              {visualizationData.work_culture.company_values.map((value: string, idx: number) => (
                                <li key={idx}>{value}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Compensation */}
                  {visualizationData.compensation && (
                    <div className="mb-6">
                      <h3 className="m-0 mb-4 text-lg font-bold text-card-foreground flex items-center gap-2">
                        <span className="w-1 h-6 bg-primary rounded"></span>
                        Compensation
                      </h3>
                      <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                        {visualizationData.compensation.salary_range && (
                          <p className="mb-4 text-sm text-card-foreground">
                            <strong className="text-card-foreground">Salary Range:</strong> {visualizationData.compensation.salary_range}
                          </p>
                        )}
                        {visualizationData.compensation.benefits && visualizationData.compensation.benefits.length > 0 && (
                          <div>
                            <strong className="block mb-2 text-sm text-card-foreground">Benefits:</strong>
                            <ul className="list-disc pl-6 space-y-1 text-sm text-card-foreground">
                              {visualizationData.compensation.benefits.map((benefit: string, idx: number) => (
                                <li key={idx}>{benefit}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Mermaid Diagrams */}
                  {visualizationData.mermaid?.diagrams && visualizationData.mermaid.diagrams.length > 0 && (
                    <div className="mb-6">
                      <h3 className="m-0 mb-4 text-lg font-bold text-card-foreground flex items-center gap-2">
                        <span className="w-1 h-6 bg-primary rounded"></span>
                        Diagrams
                      </h3>
                      {visualizationData.mermaid.diagrams.map((diagram: VisualizationData['mermaid']['diagrams'][0], idx: number) => (
                        <div key={idx} className="mb-4 bg-card p-5 rounded-xl border border-border shadow-sm">
                          <h4 className="text-base font-semibold mb-4 text-card-foreground">{diagram.title}</h4>
                          <div
                            ref={(el) => {
                              if (el) mermaidRefs.current.set(idx, el)
                            }}
                            className="mermaid-diagram"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Chart.js Charts */}
                  {visualizationData.chartjs?.charts && visualizationData.chartjs.charts.length > 0 && (
                    <div className="mb-6">
                      <h3 className="m-0 mb-4 text-lg font-bold text-card-foreground flex items-center gap-2">
                        <span className="w-1 h-6 bg-primary rounded"></span>
                        Charts
                      </h3>
                      {visualizationData.chartjs.charts.map((chart: VisualizationData['chartjs']['charts'][0], idx: number) => (
                        <div key={idx} className="mb-4 bg-card p-5 rounded-xl border border-border shadow-sm">
                          <h4 className="text-base font-semibold mb-4 text-card-foreground">{chart.title}</h4>
                          {renderChart(chart)}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Pros & Cons */}
                  {visualizationData.pros_cons && (
                    <div className="mb-6">
                      <h3 className="m-0 mb-4 text-lg font-bold text-card-foreground flex items-center gap-2">
                        <span className="w-1 h-6 bg-primary rounded"></span>
                        Pros & Cons
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {visualizationData.pros_cons.pros && visualizationData.pros_cons.pros.length > 0 && (
                          <div className="bg-green-50 p-5 rounded-xl border border-green-200">
                            <h4 className="text-base font-semibold mb-3 text-green-700">✅ Pros</h4>
                            <ul className="list-disc pl-6 space-y-1 text-sm text-card-foreground">
                              {visualizationData.pros_cons.pros.map((pro: string, idx: number) => (
                                <li key={idx}>{pro}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {visualizationData.pros_cons.cons && visualizationData.pros_cons.cons.length > 0 && (
                          <div className="bg-red-50 p-5 rounded-xl border border-red-200">
                            <h4 className="text-base font-semibold mb-3 text-red-700">❌ Cons</h4>
                            <ul className="list-disc pl-6 space-y-1 text-sm text-card-foreground">
                              {visualizationData.pros_cons.cons.map((con: string, idx: number) => (
                                <li key={idx}>{con}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Additional Info */}
                  {visualizationData.additional_info && (
                    <div className="mb-6">
                      <h3 className="m-0 mb-4 text-lg font-bold text-card-foreground flex items-center gap-2">
                        <span className="w-1 h-6 bg-primary rounded"></span>
                        Additional Information
                      </h3>
                      <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                        <p className="text-sm text-card-foreground leading-relaxed m-0">{visualizationData.additional_info}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
