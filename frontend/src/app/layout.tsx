import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'DhruvGPT — LLM Trained From Scratch',
  description: 'A 30M parameter GPT model built from scratch by Dhruv Kumar. Pretrained on TinyStories, finetuned on Alpaca.',
  keywords: ['LLM', 'GPT', 'AI', 'Machine Learning', 'Transformer', 'NLP'],
  authors: [{ name: 'Dhruv Kumar' }],
  openGraph: {
    title: 'DhruvGPT — LLM Trained From Scratch',
    description: 'A 30M parameter GPT model built from scratch. Pretrained + SFT finetuned.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="scanline" />
        {children}
      </body>
    </html>
  )
}
