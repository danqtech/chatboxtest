'use client'
import { useState, useRef, useEffect } from 'react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatState {
  country: string
  continent: string
  destination: string
  onboardingComplete: boolean
  currentQuestion: number
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
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView() }, [messages])

  async function send() {
    if (!input.trim()) return
    const userMessage = input.trim()
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInput('')

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
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            content: copy[copy.length - 1].content + chunk
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
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          className="flex-1 rounded-md border px-2 py-1 text-sm bg-transparent outline-none"
          placeholder="Type a message"
        />
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