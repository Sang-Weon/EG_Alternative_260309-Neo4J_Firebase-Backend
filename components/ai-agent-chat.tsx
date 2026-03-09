"use client"

import { useChat } from '@ai-sdk/react'
import type { UIMessage } from 'ai'
import { DefaultChatTransport } from 'ai'
import { useState, useRef, useEffect } from 'react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, Send, User, ChevronDown, Sparkles, Database } from "lucide-react"

export function AIAgentChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/agent' }),
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    await sendMessage({ text })
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white z-50 p-0"
      >
        <Sparkles className="w-6 h-6" />
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[380px] h-[600px] flex flex-col shadow-2xl border-zinc-700 bg-zinc-950/95 backdrop-blur z-50 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/20 rounded-md">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm">이지자산평가 AI Agent</h3>
            <p className="text-[10px] text-zinc-400">Powered by Claude 3.5 Sonnet</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 text-zinc-400 hover:text-white">
          <ChevronDown className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-zinc-500 text-xs my-8 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-zinc-600" />
              <p>무엇을 도와드릴까요?</p>
              <p className="text-[10px]">예: "송도 PF 프로젝트의 현재 가치평가 결과를 알려줘"</p>
            </div>
          )}

          {messages.map((m: UIMessage) => {
            const textContent = m.parts
              .filter((p: any) => p.type === 'text')
              .map((p: any) => p.text)
              .join('')
            const toolParts = m.parts.filter((p: any) =>
              p.type === 'dynamic-tool' || (typeof p.type === 'string' && p.type.startsWith('tool-'))
            )
            return (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`p-2 rounded-md flex-shrink-0 h-8 w-8 flex items-center justify-center ${
                  m.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                }`}>
                  {m.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div className={`text-sm px-4 py-2 rounded-2xl max-w-[80%] whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-blue-600/20 text-blue-100 rounded-tr-none border border-blue-500/30'
                    : 'bg-zinc-800 text-zinc-300 rounded-tl-none border border-zinc-700'
                }`}>
                  {textContent}
                  {toolParts.map((part: any, idx: number) => (
                    <div key={idx} className="mt-2 text-[10px] bg-black/50 p-2 rounded border border-purple-500/30 font-mono text-purple-300">
                      <div className="flex items-center gap-1 mb-1">
                        <Database className="w-3 h-3" />
                        <span>Neo4j 자산 그래프 쿼리 실행 중...</span>
                      </div>
                      <div className="opacity-70 truncate">
                        {typeof part.input === 'object' && part.input !== null
                          ? (part.input as any).cypher ?? JSON.stringify(part.input)
                          : String(part.input ?? '')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {isLoading && (
            <div className="flex gap-3">
               <div className="p-2 rounded-md flex-shrink-0 h-8 w-8 flex items-center justify-center bg-purple-600">
                 <Bot className="w-4 h-4 text-white" />
               </div>
               <div className="text-sm px-4 py-2 rounded-2xl bg-zinc-800 text-zinc-400 rounded-tl-none border border-zinc-700 flex items-center gap-1">
                 <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                 <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                 <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        <form onSubmit={handleSubmit} className="flex gap-2 relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="대체투자 자산에 대해 물어보세요..."
            className="bg-black border-zinc-700 pr-10"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="absolute right-1 top-1 h-8 w-8 bg-purple-600 hover:bg-purple-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  )
}
