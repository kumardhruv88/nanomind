<div align="center">

# DhruvGPT

### A 30M Parameter GPT Trained From Scratch

[![Python](https://img.shields.io/badge/Python_3.10+-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

*Transformer architecture built from scratch · Pretrained on TinyStories · Finetuned on Alpaca*

</div>

---

## What Is This?

DhruvGPT is a complete end-to-end LLM project — from building the transformer architecture in raw PyTorch, to training on Kaggle GPUs, to deploying a production web interface and public API.

**Not fine-tuning a Llama. Not wrapping GPT-4. Built from `nn.Linear` up.**

```
Token Embeddings → 6x Transformer Blocks → LM Head → Next Token
```

---

## Training Summary

| Phase | Details | Result |
|---|---|---|
| **Architecture** | GPT decoder, 6L/6H/384D, weight tying | 30M params |
| **Tokenizer** | GPT-2 BPE via tiktoken | 50,257 vocab |
| **Pretraining** | TinyStories 50M tokens, 50K steps, Kaggle T4 | val_loss 2.11 |
| **SFT Finetune** | Alpaca 52K, 3 epochs, lr=5e-5 | val_loss 1.93 |
| **Hardware** | Kaggle Tesla T4 (15.6 GB VRAM) | ~6 hrs pretrain |

---

## Project Structure

```
dhruv-llm/
├── backend/
│   ├── main.py              # FastAPI app — model loading + all routes
│   ├── requirements.txt     # Python dependencies
│   ├── Procfile             # Railway/Render deployment
│   └── railway.toml         # Railway config
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx   # Root layout
│   │   │   └── page.tsx     # Full UI — all components
│   │   ├── lib/
│   │   │   └── api.ts       # Typed API client
│   │   └── styles/
│   │       └── globals.css  # Design system + animations
│   ├── package.json
│   ├── tailwind.config.js
│   └── vercel.json
│
├── models/                  ← PUT YOUR .pt FILES HERE
│   ├── sft_model.pt         # SFT finetuned (primary)
│   └── best_model.pt        # Pretrained (fallback)
│
├── notebooks/               ← PUT YOUR KAGGLE NOTEBOOK HERE
│   └── training.ipynb
│
├── CONTEXT.md               # Full project context for AI assistants
├── README.md                # This file
├── .gitignore
└── start.sh                 # One-command local startup
```

---

## Quick Start

### 1. Add Your Model Files

```bash
# Copy your downloaded .pt files into models/
cp ~/Downloads/sft_model.pt   models/
cp ~/Downloads/best_model.pt  models/
```

### 2. Start Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API live at: `http://localhost:8000`
Swagger docs: `http://localhost:8000/docs`

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

App live at: `http://localhost:3000`

### Or use the one-liner:

```bash
chmod +x start.sh && ./start.sh
```

---

## API Usage

### Text Generation

```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Once upon a time", "max_tokens": 150, "temperature": 0.85}'
```

### Instruction Following

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"instruction": "Write a story about a brave cat", "max_tokens": 150}'
```

### Python Client

```python
import requests

# Story generation
res = requests.post("http://localhost:8000/generate", json={
    "prompt": "The little dog found a mysterious door and",
    "max_tokens": 200,
    "temperature": 0.85
})
print(res.json()["generated"])

# Instruction mode
res = requests.post("http://localhost:8000/chat", json={
    "instruction": "Write a bedtime story about friendship",
    "max_tokens": 200
})
print(res.json()["response"])
```

---

## Deployment

### Frontend → Vercel (Free)

```bash
# 1. Push to GitHub
git push origin main

# 2. Go to vercel.com → New Project → Import repo
# 3. Set Root Directory: frontend
# 4. Add environment variable:
#    NEXT_PUBLIC_API_URL = https://your-backend.railway.app
# 5. Deploy
```

### Backend → Railway (Free Tier)

```bash
# 1. railway.app → New Project → Deploy from GitHub
# 2. Set Root Directory: backend
# 3. Add model files via Railway volumes or HuggingFace download
# 4. Deploy
```

> **Note on model files:** The `.pt` files are ~115MB each and are gitignored.
> For production deployment, host them on HuggingFace Hub or a storage bucket
> and add a download step in your startup script.

---

## Model Architecture

```
Input IDs
    │
    ▼
Token Embedding (50257 × 384)
    +
Position Embedding (128 × 384)
    │
    ▼
┌─────────────────────────────┐
│  Transformer Block × 6      │
│  ┌───────────────────────┐  │
│  │ LayerNorm              │  │
│  │ CausalSelfAttention   │  │  ← 6 heads, causal mask
│  │   + residual          │  │
│  │ LayerNorm              │  │
│  │ FeedForward (4× MLP)  │  │  ← GELU activation
│  │   + residual          │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
    │
    ▼
LayerNorm (final)
    │
    ▼
LM Head (384 → 50257)         ← weight-tied with token embedding
    │
    ▼
Next Token Logits
```

**Total: 29,974,656 parameters**

---

## Generation Quality

This is a 30M model — set expectations accordingly:

| Task | Quality |
|---|---|
| Story continuation | ✅ Coherent short stories |
| Creative writing prompts | ✅ Works well |
| Simple instructions | ⚠️ Partially follows |
| Factual Q&A | ❌ Not reliable |
| Math / reasoning | ❌ Not capable |

For best results: use story completion mode with temperature 0.8–0.9.

---

## What I Learned Building This

- Transformer internals: attention, residuals, layer norm placement
- Why weight tying works (token embed ↔ LM head)
- Chinchilla scaling: tokens needed = 20× parameters
- Why pretraining loss ≠ generation quality
- Gradient accumulation for simulating larger batches
- SFT changes behavior, not capability

---

## Author

**Dhruv Kumar** — CSE @ NSUT Delhi (2023–2027)

- National Winner, Smart India Hackathon 2025
- GSoC 2026 Participant (HistoMoE / HEST-1k)
- GitHub: [@kumardhruv88](https://github.com/kumardhruv88)

---

<div align="center">

Built with PyTorch · Served with FastAPI · Deployed on Vercel

*Every weight in this model was initialized randomly and learned from data.*

</div>
