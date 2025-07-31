const OpenAI = require('openai')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
})

export async function POST(req: Request) {
  const { message, preferences } = await req.json()
  
  const messages = [{ role: 'user', content: message }]
  
  if (preferences) {
    messages.unshift({
      role: 'system',
      content: `You are a geography chatbot. The user's preferences are: Favorite country: ${preferences.country}, Favorite continent: ${preferences.continent}, Favorite destination: ${preferences.destination}. Use this information to provide personalized responses about world geography.`
    })
  }
  
  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      stream: true
    })
    
    const encoder = new TextEncoder()
    
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            controller.enqueue(encoder.encode(content))
          }
        }
        controller.close()
      }
    })
    
    return new Response(readableStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
    
  } catch (error) {
    console.error('OpenAI error:', error)
    return new Response('Error: Failed to get response', { status: 500 })
  }
}

