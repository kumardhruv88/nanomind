'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { generateText, chat, getModelInfo, getHealth, getExamples, ModelInfo } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────
type Mode   = 'story' | 'chat'
type Status = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

// ── Helpers ────────────────────────────────────────────────────────────────────
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}

// Smooth scroll helper
const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

// ── Scroll Reveal Hook ─────────────────────────────────────────────────────────
function useScrollReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setIsVisible(true); obs.unobserve(e.target) } },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    )
    if (el) obs.observe(el)
    return () => { if (el) obs.unobserve(el) }
  }, [threshold])
  return { ref, isVisible }
}

// ── Typewriter ─────────────────────────────────────────────────────────────────
function useTypewriter(text: string, active: boolean, speed = 15) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone]           = useState(false)
  useEffect(() => {
    if (!active || !text) return
    setDisplayed('')
    setDone(false)
    let i = 0
    const iv = setInterval(() => {
      if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++ }
      else { setDone(true); clearInterval(iv) }
    }, speed)
    return () => clearInterval(iv)
  }, [text, active, speed])
  return { displayed, done }
}

// ── Nav ────────────────────────────────────────────────────────────────────────
function Nav({ online }: { online: boolean | null }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-[100] px-8 flex items-center justify-between pointer-events-auto transition-all duration-300",
      scrolled ? "py-4 bg-[#080810]/80 backdrop-blur-md border-b border-white/5" : "py-6 bg-transparent border-b border-transparent"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="font-display font-semibold text-xl tracking-tight text-white">
          NanoMind AI
        </span>
      </div>

      {/* Center Links */}
      <div className="hidden md:flex items-center gap-8 font-body text-[15px] text-[#A0A0A5]">
        <button onClick={() => scrollTo('about')}     className="hover:text-white transition-colors cursor-pointer">About</button>
        <button onClick={() => scrollTo('technology')} className="hover:text-white transition-colors cursor-pointer">Technology</button>
        <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">API Docs</a>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-2">
        <a href="https://github.com/kumardhruv88" target="_blank" rel="noopener noreferrer" className="btn-secondary hidden sm:inline-block">GitHub</a>
        <button className="btn-primary" onClick={() => scrollTo('console')}>Try it</button>
      </div>
    </nav>
  )
}

// ── Hero ───────────────────────────────────────────────────────────────────────
function Hero({ modelInfo }: { modelInfo: ModelInfo | null }) {
  return (
    /* Outer wrapper: tall enough to show the orb, NO overflow:hidden */
    <div className="relative min-h-[110vh] w-full flex flex-col items-center">

      {/* ── Hero text – lives above the orb in z-index ── */}
      <div className="relative z-30 text-center px-4 pt-36 sm:pt-44 lg:pt-52">
        <h1 className="font-display font-semibold text-[3.2rem] sm:text-[4.5rem] lg:text-[5.5rem] leading-[1.05] tracking-tight mb-6 text-white">
          <span className="block opacity-0 animate-[glideUp_0.8s_ease_forwards]">
            Elevate Your
          </span>
          <span className="block opacity-0 animate-[glideUp_0.8s_ease_0.12s_forwards]">
            Language Intelligence
          </span>
        </h1>

        <p className="font-body text-[#A0A0A5] text-base md:text-lg max-w-[520px] mx-auto mb-10
                      opacity-0 animate-[glideUp_0.8s_ease_0.22s_forwards]">
          Unlock localized reasoning potential in a fully transparent environment,
          powered by NanoMind 30M — trained from scratch.
        </p>

        <div className="opacity-0 animate-[glideUp_0.8s_ease_0.32s_forwards]">
          <button
            className="btn-primary text-base px-9 py-4 shadow-[0_0_30px_rgba(255,215,0,0.2)]"
            onClick={() => scrollTo('console')}
          >
            Console &amp; Generate
          </button>
        </div>
      </div>

      {/* ── Golden Orb — no clipping parent ── */}
      <div className="orb-container">
        <div className="liquid-orb">
          <div className="orb-highlight" />
        </div>
        {/* warm glow aura beneath orb */}
        <div className="orb-aura" />
      </div>

      {/* ── Floating stat cards removed ── */}

    </div>
  )
}

// ── About Section ──────────────────────────────────────────────────────────────
function About() {
  const { ref, isVisible } = useScrollReveal()
  return (
    <div id="about" ref={ref} className={cn(
      'max-w-6xl mx-auto mb-32 px-6 reveal-up', isVisible && 'is-visible'
    )}>
      <div className="text-center mb-16">
        <p className="font-body text-xs text-yellow-400/70 tracking-[0.25em] uppercase mb-4">About the project</p>
        <h2 className="font-display text-4xl md:text-5xl font-semibold mb-6">What is NanoMind?</h2>
        <p className="font-body text-[#A0A0A5] max-w-2xl mx-auto leading-relaxed">
          NanoMind is a GPT-style transformer built entirely from scratch — every layer, every weight,
          trained by hand. No wrappers, no pretrained checkpoints. Just raw PyTorch and math.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {[
          {
            title: 'Built from Scratch',
            body: 'Custom decoder-only transformer with causal self-attention, RMSNorm, and weight-tied embeddings. Pure PyTorch, no HuggingFace under the hood.'
          },
          {
            title: 'Two-Stage Training',
            body: 'Pre-trained on 50M tokens from TinyStories to learn language structure. Fine-tuned on Alpaca 52K instructions for instruction-following capability.'
          },
          {
            title: 'Fully Transparent',
            body: 'Every endpoint is open. Inspect the architecture, reproduce the training, tweak the hyperparameters. Science should be reproducible.'
          }
        ].map((card, i) => (
          <div key={i} className="group relative overflow-hidden bg-[#0A0A10] border border-white/5 rounded-2xl p-8 hover:border-[#D4AF37]/30 transition-all duration-500 shadow-xl">
            {/* Elegant glass gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-10 h-[2px] bg-gradient-to-r from-[#D4AF37] to-transparent mb-2" />
              <h3 className="font-display text-xl font-medium text-white tracking-wide">{card.title}</h3>
              <p className="font-body text-[#8F9098] leading-relaxed text-[15px] font-light">{card.body}</p>
            </div>
            
            {/* Subtle glow on hover */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-[#D4AF37]/10 blur-3xl group-hover:bg-[#D4AF37]/20 transition-all duration-700" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Technology Section ──────────────────────────────────────────────────────────
function Technology({ modelInfo }: { modelInfo: ModelInfo | null }) {
  const { ref, isVisible } = useScrollReveal()
  const arch = modelInfo?.architecture
  const train = modelInfo?.training

  const specs = [
    { label: 'Architecture',    value: 'Decoder-only GPT' },
    { label: 'Parameters',      value: arch?.parameters       ?? '~30M' },
    { label: 'Layers',          value: String(arch?.n_layers   ?? 6) },
    { label: 'Attention Heads', value: String(arch?.n_heads    ?? 6) },
    { label: 'Embedding Dim',   value: String(arch?.n_embd     ?? 384) },
    { label: 'Context Length',  value: String(arch?.context_len ?? 128) + ' tokens' },
    { label: 'Vocab Size',      value: (arch?.vocab_size ?? 50257).toLocaleString() },
  ]

  const trainingStages = [
    {
      phase: '01',
      title: 'Pre-training',
      dataset: train?.pretrain_dataset ?? 'TinyStories (50M tokens)',
      steps: (train?.pretrain_steps ?? 50000).toLocaleString() + ' steps',
      desc: 'Autoregressive next-token prediction on a curated children\'s story corpus — builds core vocabulary, grammar, and narrative reasoning.'
    },
    {
      phase: '02',
      title: 'Instruction Fine-tuning',
      dataset: train?.finetune_dataset ?? 'Alpaca 52K',
      steps: (train?.finetune_epochs ?? 3) + ' epochs',
      desc: 'Supervised fine-tuning on the Alpaca PromptFormat (### Instruction / ### Response) teaches the model to follow user directives.'
    }
  ]

  return (
    <div id="technology" ref={ref} className={cn(
      'max-w-6xl mx-auto mb-32 px-6 reveal-up', isVisible && 'is-visible'
    )}>
      <div className="text-center mb-16">
        <p className="font-body text-xs text-yellow-400/70 tracking-[0.25em] uppercase mb-4">Under the hood</p>
        <h2 className="font-display text-4xl md:text-5xl font-semibold mb-6">Technology</h2>
        <p className="font-body text-[#A0A0A5] max-w-xl mx-auto leading-relaxed">
          A minimal but complete transformer implementation — every architectural decision
          is intentional and documented.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">

        {/* Architecture Spec Card */}
        <div className="glass-panel p-8 md:p-10 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display text-2xl font-semibold">Architecture</h3>
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
          </div>
          <div className="space-y-3 flex-1">
            {specs.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <span className="font-body text-[#A0A0A5] text-sm">{s.label}</span>
                <span className="font-display font-medium text-white">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Training Stages Card */}
        <div className="flex flex-col gap-6">
          {trainingStages.map((stage, i) => (
            <div key={i} className="group relative overflow-hidden bg-[#0A0A10] border border-white/5 rounded-2xl p-8 hover:border-[#D4AF37]/30 transition-all duration-500 shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
              
              <div className="relative z-10 flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <span className="font-display font-light text-[13px] text-[#A0A0A5] tracking-widest">{stage.phase}</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                </div>
                
                <h3 className="font-display text-[22px] font-medium tracking-wide text-white">{stage.title}</h3>
                
                <div className="flex gap-3 flex-wrap">
                  <span className="font-body text-[12px] font-medium text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-4 py-1.5 rounded-full tracking-wide">
                    {stage.dataset}
                  </span>
                  <span className="font-body text-[12px] font-medium text-white/50 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full tracking-wide">
                    {stage.steps}
                  </span>
                </div>
                
                <p className="font-body text-[#8F9098] text-[15px] font-light leading-relaxed pt-2">{stage.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

// ── Interactive Console ────────────────────────────────────────────────────────
function ConsoleSection({
  mode, setMode, examples, onStory, onChat, status, output, timeSeconds, tokensGenerated
}: any) {
  const { ref, isVisible } = useScrollReveal()
  const [currentPrompt,  setCurrentPrompt]  = useState('')
  const [currentContext, setCurrentContext] = useState('')
  const [temp,   setTemp]   = useState(0.8)
  const [length, setLength] = useState(200)

  const handleSubmit = () => {
    if (!currentPrompt.trim()) return
    if (mode === 'story') onStory(currentPrompt, temp, length)
    else onChat(currentPrompt, currentContext, temp)
  }

  return (
    <div id="console" ref={ref} className={cn('max-w-6xl mx-auto mt-4 mb-32 px-6 reveal-up', isVisible && 'is-visible')}>

      <div className="text-center mb-16">
        <p className="font-body text-xs text-[#D4AF37]/70 tracking-[0.25em] uppercase mb-4">Live demo</p>
        <h2 className="font-display text-4xl md:text-5xl font-semibold mb-6">Interactive Workspace</h2>
        <p className="font-body text-[#8F9098] max-w-2xl mx-auto text-[15px] leading-relaxed">
          Prompt the model directly. Base model for raw text completion, Instruct for structured generation.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">

        {/* ── Input Card ── */}
        <div className="flex-1 group relative overflow-hidden bg-[#08080F] border border-white/[0.07] rounded-2xl p-8 flex flex-col shadow-2xl">
          {/* Mesh grid background */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          {/* Subtle top gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
          {/* Gold corner glow */}
          <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-[#D4AF37]/10 blur-3xl group-hover:bg-[#D4AF37]/15 transition-all duration-700 pointer-events-none" />

          <div className="relative z-10 flex flex-col h-full">
            {/* Mode Toggle */}
            <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl w-fit mb-8">
              {(['story', 'chat'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    'font-body text-[13px] font-medium px-6 py-2 rounded-lg transition-all duration-300',
                    mode === m ? 'bg-white text-black shadow-md' : 'text-[#A0A0A5] hover:text-white'
                  )}
                >
                  {m === 'story' ? 'Base Model' : 'Instruct Model'}
                </button>
              ))}
            </div>

            {/* Prompt Chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {examples.slice(0, 3).map((ex: string) => (
                <button
                  key={ex}
                  onClick={() => setCurrentPrompt(ex)}
                  className="font-body text-[12px] text-[#A0A0A5] bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-md hover:bg-white/[0.08] hover:text-white hover:border-[#D4AF37]/30 transition-all text-left"
                >
                  {ex.length > 38 ? ex.slice(0, 38) + '…' : ex}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <div className="flex-1 flex flex-col gap-3 mb-6">
              <textarea
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                rows={mode === 'chat' ? 3 : 5}
                placeholder={mode === 'story' ? 'Enter a starting phrase…' : 'Enter your instruction…'}
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-4 font-body text-[16px] text-white placeholder-white/25 focus:outline-none focus:border-[#D4AF37]/40 transition-colors resize-none"
              />
              {mode === 'chat' && (
                <textarea
                  value={currentContext}
                  onChange={(e) => setCurrentContext(e.target.value)}
                  rows={2}
                  placeholder="Optional context / input…"
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 font-body text-[14px] text-[#A0A0A5] placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors resize-none"
                />
              )}
            </div>

            {/* Sliders */}
            <div className="flex items-center gap-8 mb-8">
              {[
                { label: 'Temperature', value: temp.toFixed(2), min: '0.1', max: '1.5', step: '0.05', handler: (v: string) => setTemp(parseFloat(v)) },
                { label: 'Max Length',  value: String(length),  min: '50',  max: '500', step: '10',   handler: (v: string) => setLength(parseInt(v)) }
              ].map((slider) => (
                <div className="flex-1" key={slider.label}>
                  <div className="flex justify-between font-body text-[11px] text-[#A0A0A5] mb-2 tracking-wide uppercase">
                    <span>{slider.label}</span>
                    <span className="text-[#D4AF37] font-medium">{slider.value}</span>
                  </div>
                  <input
                    type="range"
                    min={slider.min} max={slider.max} step={slider.step}
                    value={slider.label === 'Temperature' ? temp : length}
                    onChange={(e) => slider.handler(e.target.value)}
                    className="w-full accent-[#D4AF37]"
                    style={{ WebkitAppearance: 'none', appearance: 'none' }}
                  />
                </div>
              ))}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleSubmit}
              disabled={!currentPrompt.trim() || status === 'loading'}
              className="w-full py-4 rounded-xl font-body font-semibold text-[14px] tracking-wide transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed
                bg-white text-black hover:bg-[#D4AF37] shadow-[0_4px_24px_rgba(212,175,55,0.12)] hover:shadow-[0_4px_32px_rgba(212,175,55,0.28)]"
            >
              {status === 'loading' ? 'Generating…' : 'Generate →'}
            </button>
          </div>
        </div>

        {/* ── Output Card ── */}
        <div className="flex-1 lg:max-w-[48%] group relative overflow-hidden bg-[#05050D] border border-white/[0.07] rounded-2xl p-8 flex flex-col shadow-2xl">
          {/* Mesh grid */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          {/* Glow */}
          <div className={cn(
            "absolute -bottom-16 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl transition-all duration-700 pointer-events-none",
            status === 'loading' ? 'bg-[#D4AF37]/20 animate-pulse' :
            status === 'done'    ? 'bg-emerald-500/10' : 'bg-[#D4AF37]/5'
          )} />

          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-5 border-b border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-2 h-2 rounded-full transition-colors duration-500',
                  status === 'loading'   ? 'bg-[#D4AF37] animate-pulse' :
                  status === 'done'      ? 'bg-emerald-400' :
                  status === 'streaming' ? 'bg-[#D4AF37]' : 'bg-white/20'
                )} />
                <span className="font-body text-[11px] font-medium text-[#A0A0A5] uppercase tracking-[0.2em]">
                  {status === 'loading' ? 'Processing' : status === 'done' ? 'Complete' : 'Output Stream'}
                </span>
              </div>
              {status === 'done' && (
                <div className="font-mono text-[11px] text-[#D4AF37]/80 bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-3 py-1.5 rounded-full">
                  {tokensGenerated} tok · {timeSeconds}s
                </div>
              )}
            </div>

            {/* Output content */}
            <div className="flex-1 font-body text-[16px] leading-8 text-white/90 overflow-y-auto min-h-[260px]">
              {status === 'idle' && (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-white/15">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                    <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2"/><path d="M12 6v6l4 2"/>
                  </svg>
                  <span className="text-sm text-center leading-relaxed max-w-[200px]">Enter a prompt and click Generate to begin</span>
                </div>
              )}
              {status === 'loading' && (
                <div className="flex items-start gap-3 pt-2">
                  <div className="flex gap-1 mt-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"
                        style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                  <span className="text-[#D4AF37]/60 text-sm italic font-light animate-pulse">Model is thinking…</span>
                </div>
              )}
              {status === 'error' && (
                <div className="text-red-400/80 font-mono text-sm bg-red-500/5 border border-red-500/20 rounded-xl p-4">{output}</div>
              )}
              {(status === 'done' || status === 'streaming') && (
                <OutputText text={output} active={status === 'done'} />
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function OutputText({ text, active }: { text: string; active: boolean }) {
  const { displayed, done } = useTypewriter(text, active, 10)
  return (
    <div className="whitespace-pre-wrap font-body text-[16px] leading-8 text-white/85">
      {displayed}
      {!done && (
        <span className="inline-block w-[2px] h-5 bg-[#D4AF37] ml-0.5 translate-y-[3px]"
          style={{ animation: 'pulse 0.8s ease-in-out infinite' }} />
      )}
    </div>
  )
}

// ── API Usage Section ───────────────────────────────────────────────────────────
function DetailsSection() {
  const { ref, isVisible } = useScrollReveal()
  const [activeTab, setActiveTab] = useState<'python' | 'curl' | 'js'>('python')

  const codeSnippets = {
    python: `from openai import OpenAI

client = OpenAI(
    base_url="https://dhruvkumar88-dhruvgpt-api.hf.space/v1",
    api_key="dhruvgpt"   # any non-empty string
)

response = client.chat.completions.create(
    model="dhruvgpt-30m",
    messages=[
        {"role": "user", "content": "Once upon a time"}
    ],
    max_tokens=150,
    temperature=0.8
)

print(response.choices[0].message.content)`,
    curl: `curl -X POST \\
  https://dhruvkumar88-dhruvgpt-api.hf.space/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer dhruvgpt" \\
  -d '{
    "model": "dhruvgpt-30m",
    "messages": [
      {"role": "user", "content": "Tell me a story"}
    ],
    "max_tokens": 150,
    "temperature": 0.8
  }'`,
    js: `import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  modelName: "dhruvgpt-30m",
  openAIApiKey: "dhruvgpt",
  configuration: {
    baseURL:
      "https://dhruvkumar88-dhruvgpt-api.hf.space/v1",
  },
  maxTokens: 150,
  temperature: 0.8,
});

const res = await model.invoke(
  "Once upon a time there was"
);
console.log(res.content);`
  }

  const tabLabels = { python: 'Python SDK', curl: 'cURL', js: 'LangChain JS' }

  return (
    <div ref={ref} className={cn('max-w-6xl mx-auto mb-32 px-6 reveal-up', isVisible && 'is-visible')}>

      <div className="text-center mb-14">
        <p className="font-body text-xs text-[#D4AF37]/70 tracking-[0.25em] uppercase mb-4">Open API</p>
        <h2 className="font-display text-4xl md:text-5xl font-semibold mb-6">Use DhruvGPT Anywhere</h2>
        <p className="font-body text-[#8F9098] max-w-2xl mx-auto text-[15px] leading-relaxed">
          Full OpenAI-compatible API. Drop in as a replacement for any chat model — Claude, GPT-4, Mistral.
          Works with the OpenAI Python SDK, LangChain, LiteLLM, and raw HTTP.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Code Snippet Card */}
        <div className="group relative overflow-hidden bg-[#05050D] border border-white/[0.07] rounded-2xl flex flex-col shadow-2xl md:col-span-2 lg:col-span-1">
          <div className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[#D4AF37]/8 blur-3xl group-hover:bg-[#D4AF37]/12 transition-all duration-700 pointer-events-none" />

          {/* Tab bar */}
          <div className="relative z-10 flex items-center gap-0 px-6 pt-5 border-b border-white/[0.07]">
            <div className="flex items-center gap-2 mr-4">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
            </div>
            {(Object.keys(tabLabels) as Array<keyof typeof tabLabels>).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={cn(
                  'font-body text-[12px] px-4 py-3 border-b-2 transition-all -mb-px tracking-wide',
                  activeTab === t
                    ? 'text-[#D4AF37] border-[#D4AF37]'
                    : 'text-[#A0A0A5] border-transparent hover:text-white'
                )}>
                {tabLabels[t]}
              </button>
            ))}
          </div>

          <pre className="relative z-10 p-6 font-mono text-[12.5px] text-white/75 leading-6 overflow-x-auto whitespace-pre">
            <code>{codeSnippets[activeTab]}</code>
          </pre>
        </div>

        {/* API Endpoints Card */}
        <div className="group relative overflow-hidden bg-[#08080F] border border-white/[0.07] rounded-2xl p-8 shadow-2xl">
          <div className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-[#D4AF37]/8 blur-3xl group-hover:bg-[#D4AF37]/12 transition-all duration-700 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-6 bg-gradient-to-b from-[#D4AF37] to-transparent rounded-full" />
              <h3 className="font-display text-xl font-medium text-white tracking-wide">API Endpoints</h3>
            </div>

            <div className="space-y-3">
              {[
                { method: 'GET',  path: '/health',                 label: 'Health check',           compat: false },
                { method: 'GET',  path: '/model/info',             label: 'Architecture details',   compat: false },
                { method: 'POST', path: '/generate',               label: 'Raw text completion',     compat: false },
                { method: 'POST', path: '/chat',                   label: 'Instruction following',  compat: false },
                { method: 'GET',  path: '/v1/models',              label: 'List models',             compat: true },
                { method: 'POST', path: '/v1/chat/completions',    label: 'Chat (OpenAI-compatible)', compat: true },
              ].map((ep, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0 group/ep hover:bg-white/[0.02] rounded-lg px-2 -mx-2 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'font-mono text-[10px] font-bold px-2 py-0.5 rounded w-11 text-center',
                      ep.method === 'POST'
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : 'text-sky-400 bg-sky-500/10 border border-sky-500/20'
                    )}>{ep.method}</span>
                    <span className="font-mono text-[12px] text-white/70">{ep.path}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ep.compat && (
                      <span className="font-body text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2 py-0.5 rounded-full">OpenAI</span>
                    )}
                    <span className="font-body text-[11px] text-[#8F9098] hidden sm:block">{ep.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.05]">
              <p className="font-body text-[12px] text-[#8F9098] leading-relaxed">
                Base URL: <span className="font-mono text-white/60 text-[11px]">https://dhruvkumar88-dhruvgpt-api.hf.space</span><br/>
                API Key: any non-empty string — model is free and open source
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}


// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="pt-24 pb-12 px-6 max-w-7xl mx-auto relative z-10">
      <div className="border-t border-white/10 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <span className="font-display font-semibold text-xl text-white">NanoMind AI</span>
          <p className="font-body text-xs text-[#A0A0A5] mt-1">30M parameter GPT — built from scratch by <a href="https://github.com/kumardhruv88" className="hover:text-yellow-400 transition-colors">Dhruv Kumar</a></p>
        </div>
        <div className="flex gap-8 font-body text-sm text-[#A0A0A5]">
          <button onClick={() => scrollTo('about')}      className="hover:text-white transition-colors">About</button>
          <button onClick={() => scrollTo('technology')} className="hover:text-white transition-colors">Technology</button>
          <button onClick={() => scrollTo('console')}    className="hover:text-white transition-colors">Console</button>
          <a href="https://github.com/kumardhruv88" className="hover:text-white transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Home() {
  const [mode,            setMode]            = useState<Mode>('story')
  const [status,          setStatus]          = useState<Status>('idle')
  const [output,          setOutput]          = useState('')
  const [prompt,          setPrompt]          = useState('')
  const [timeSeconds,     setTimeSeconds]     = useState(0)
  const [tokensGenerated, setTokensGenerated] = useState(0)
  const [modelInfo,       setModelInfo]       = useState<ModelInfo | null>(null)
  const [online,          setOnline]          = useState<boolean | null>(null)

  const [examples, setExamples] = useState<{ story_starters: string[]; instructions: string[] }>({
    story_starters: [
      'Once upon a time there was a brave little cat who',
      'The princess looked at the dragon and said',
      'In a small village there lived a kind old man who',
    ],
    instructions: [
      'Write a short story about a brave cat.',
      'Explain the concept of verifiable compute.',
      'Write a bedtime story.',
    ]
  })

  useEffect(() => {
    // Fetch model info and examples
    getModelInfo().then(setModelInfo).catch(() => {})
    getExamples().then(setExamples).catch(() => {})

    // Health check — determines the navbar status dot color
    getHealth()
      .then(() => setOnline(true))
      .catch(() => setOnline(false))
  }, [])

  const handleStoryGenerate = useCallback(async (p: string, temp: number, maxTokens: number) => {
    setStatus('loading')
    setOutput('')
    setPrompt(p)
    try {
      const res = await generateText({ prompt: p, max_tokens: maxTokens, temperature: temp })
      setOutput(res.generated)
      setTimeSeconds(res.time_seconds)
      setTokensGenerated(res.tokens_generated)
      setStatus('done')
    } catch (err: any) {
      setOutput(err?.response?.data?.detail || 'Failed to connect to the API. Make sure the backend is running.')
      setStatus('error')
    }
  }, [])

  const handleChat = useCallback(async (instruction: string, inputText: string, temp: number) => {
    setStatus('loading')
    setOutput('')
    setPrompt(instruction)
    try {
      const res = await chat({ instruction, input_text: inputText, max_tokens: 200, temperature: temp })
      setOutput(res.response)
      setTimeSeconds(res.time_seconds)
      setTokensGenerated(res.tokens_generated)
      setStatus('done')
    } catch (err: any) {
      setOutput(err?.response?.data?.detail || 'Failed to connect to the API. Make sure the backend is running.')
      setStatus('error')
    }
  }, [])

  return (
    <main className="min-h-screen relative overflow-x-hidden bg-[#080810]">

      {/* ── Full-page background layers (fixed, below everything) ── */}
      <div className="bg-mesh"     aria-hidden="true" />
      <div className="bg-sparkles" aria-hidden="true" />
      <div className="bg-glow"     aria-hidden="true" />

      {/* ── Page content ── */}
      <div className="relative z-10">
        <Nav online={online} />
        <Hero modelInfo={modelInfo} />

        {/* 
          Spacer: because the orb extends ~60px below the hero container
          we add a matching top padding so sections start below the orb 
        */}
        <div className="h-24 md:h-16" />

        <About />
        <Technology modelInfo={modelInfo} />

        <ConsoleSection
          mode={mode} setMode={setMode}
          examples={mode === 'story' ? examples.story_starters : examples.instructions}
          onStory={handleStoryGenerate}
          onChat={handleChat}
          status={status} output={output} prompt={prompt}
          timeSeconds={timeSeconds} tokensGenerated={tokensGenerated}
        />

        <DetailsSection />
        <Footer />
      </div>
    </main>
  )
}
