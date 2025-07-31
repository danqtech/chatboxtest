'use client'
import { useState, useRef, useEffect } from 'react'
import { parseCommand, getCommandHelp, updateChatState, getCommandSuggestions, type ChatState } from '../commandHandler'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const questions = [
  'What is your favorite country?',
  'What is your favorite continent?',
  'What is your favorite destination?'
]

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: questions[0] }])
  const [chatState, setChatState] = useState<ChatState>({
    country: '',
    continent: '',
    destination: '',
    onboardingComplete: false,
    currentQuestion: 0
  })
  const [input, setInput] = useState('')
  const [showHelp, setShowHelp] = useState<string | null>(null)
  const [changingPreference, setChangingPreference] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView() }, [messages])
  
  useEffect(() => {
    const helpText = getCommandHelp(input)
    setShowHelp(helpText)
    
    const commandSuggestions = getCommandSuggestions(input)
    setSuggestions(commandSuggestions)
    setSelectedSuggestion(-1)
  }, [input])

  async function send() {
    if (!input.trim()) return
    const userMessage = input.trim()
    
    const commandResult = parseCommand(userMessage)
    if (commandResult.isCommand && commandResult.command && commandResult.response) {
      setMessages(prev => [...prev, { role: 'user', content: userMessage }, { role: 'assistant', content: commandResult.response || '' }])
      setInput('')
      setChangingPreference(commandResult.command)
      return
    }
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInput('')

    if (changingPreference) {
      const updatedState = updateChatState(chatState, changingPreference, userMessage)
      setChatState(updatedState)
      const preferenceType = changingPreference.replace('change-', '')
      setMessages(prev => [...prev, { role: 'assistant', content: `Great! Your favorite ${preferenceType} has been updated to ${userMessage}.` }])
      setChangingPreference(null)
      return
    }

    if (!chatState.onboardingComplete) {
      const newState = { ...chatState }
      
      if (chatState.currentQuestion === 0) {
        newState.country = userMessage
        newState.currentQuestion = 1
        setMessages(prev => [...prev, { role: 'assistant', content: questions[1] }])
      } else if (chatState.currentQuestion === 1) {
        newState.continent = userMessage
        newState.currentQuestion = 2
        setMessages(prev => [...prev, { role: 'assistant', content: questions[2] }])
      } else if (chatState.currentQuestion === 2) {
        newState.destination = userMessage
        newState.onboardingComplete = true
        setMessages(prev => [...prev, { role: 'assistant', content: 'Great! Now I can help you with geography questions.' }])
      }
      
      setChatState(newState)
      return
    }

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, preferences: chatState })
      })

      if (!res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages(prev => {
          const copy = [...prev]
          const lastMessage = copy[copy.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            copy[copy.length - 1] = {
              role: 'assistant',
              content: (lastMessage.content || '') + chunk
            }
          }
          return copy
        })
      }
    } catch (error) {
      setMessages(prev => {
        const copy = [...prev]
        const lastMessage = copy[copy.length - 1]
        if (lastMessage.role === 'assistant') {
          lastMessage.content = 'Error: Failed to get response'
        }
        return copy
      })
    }
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-96 flex flex-col rounded-lg shadow-lg border bg-white dark:bg-gray-900">
      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[75%] break-words ${m.role === 'user' ? 'self-end bg-blue-600 text-white' : 'self-start bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-50'} rounded-md px-3 py-1`}
          >
            {m.content}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="p-3 flex gap-2">
        <div className="relative flex-1">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (selectedSuggestion >= 0 && suggestions.length > 0) {
                  setInput(suggestions[selectedSuggestion])
                  setSuggestions([])
                  setSelectedSuggestion(-1)
                } else {
                  send()
                }
              } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
                e.preventDefault()
                setSelectedSuggestion(prev => prev < suggestions.length - 1 ? prev + 1 : 0)
              } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
                e.preventDefault()
                setSelectedSuggestion(prev => prev > 0 ? prev - 1 : suggestions.length - 1)
              } else if (e.key === 'Escape') {
                setSuggestions([])
                setSelectedSuggestion(-1)
              }
            }}
            className="w-full rounded-md border px-2 py-1 text-sm bg-transparent outline-none"
            placeholder="Type a message"
          />
          {suggestions.length > 0 && (
            <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-w-xs">
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion}
                  className={`px-3 py-2 text-sm cursor-pointer first:rounded-t-lg last:rounded-b-lg ${
                    index === selectedSuggestion 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                  onClick={() => {
                    setInput(suggestion)
                    setSuggestions([])
                    setSelectedSuggestion(-1)
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
          {showHelp && suggestions.length === 0 && (
            <div className="absolute bottom-full mb-2 left-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-white/20 backdrop-blur-sm whitespace-nowrap">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                {showHelp}
              </div>
              <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-600"></div>
            </div>
          )}
        </div>
        <button
          onClick={send}
          className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  )
}