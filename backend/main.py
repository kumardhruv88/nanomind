"""
NanoMind AI - Backend API
FastAPI server for serving the custom trained GPT model
Author: Dhruv Kumar
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import torch
import torch.nn as nn
from torch.nn import functional as F
from transformers import GPT2TokenizerFast
import math
import os
import json
import asyncio
from typing import Optional
import time

# ── App Setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="NanoMind AI API",
    description="A 30M parameter GPT model trained from scratch by Dhruv Kumar",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model Config ───────────────────────────────────────────────────────────────
VOCAB_SIZE  = 50257
BLOCK_SIZE  = 128
N_EMBD      = 384
N_HEAD      = 6
N_LAYER     = 6
DROPOUT     = 0.0

device = 'cuda' if torch.cuda.is_available() else 'cpu'

# ── Model Architecture ─────────────────────────────────────────────────────────
class CausalSelfAttention(nn.Module):
    def __init__(self):
        super().__init__()
        assert N_EMBD % N_HEAD == 0
        self.n_head   = N_HEAD
        self.n_embd   = N_EMBD
        self.head_dim = N_EMBD // N_HEAD
        self.c_attn   = nn.Linear(N_EMBD, 3 * N_EMBD, bias=False)
        self.c_proj   = nn.Linear(N_EMBD, N_EMBD, bias=False)
        self.dropout  = nn.Dropout(DROPOUT)
        self.register_buffer(
            "mask",
            torch.tril(torch.ones(BLOCK_SIZE, BLOCK_SIZE))
            .view(1, 1, BLOCK_SIZE, BLOCK_SIZE)
        )

    def forward(self, x):
        B, T, C = x.size()
        q, k, v = self.c_attn(x).split(self.n_embd, dim=2)
        q = q.view(B, T, self.n_head, self.head_dim).transpose(1, 2)
        k = k.view(B, T, self.n_head, self.head_dim).transpose(1, 2)
        v = v.view(B, T, self.n_head, self.head_dim).transpose(1, 2)
        scale = 1.0 / math.sqrt(self.head_dim)
        att = (q @ k.transpose(-2, -1)) * scale
        att = att.masked_fill(self.mask[:,:,:T,:T] == 0, float('-inf'))
        att = F.softmax(att, dim=-1)
        att = self.dropout(att)
        out = att @ v
        out = out.transpose(1, 2).contiguous().view(B, T, C)
        return self.c_proj(out)


class FeedForward(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(N_EMBD, 4 * N_EMBD, bias=False),
            nn.GELU(),
            nn.Linear(4 * N_EMBD, N_EMBD, bias=False),
            nn.Dropout(DROPOUT),
        )
    def forward(self, x):
        return self.net(x)


class TransformerBlock(nn.Module):
    def __init__(self):
        super().__init__()
        self.ln1  = nn.LayerNorm(N_EMBD)
        self.ln2  = nn.LayerNorm(N_EMBD)
        self.attn = CausalSelfAttention()
        self.ff   = FeedForward()
    def forward(self, x):
        x = x + self.attn(self.ln1(x))
        x = x + self.ff(self.ln2(x))
        return x


class GPT(nn.Module):
    def __init__(self):
        super().__init__()
        self.token_emb = nn.Embedding(VOCAB_SIZE, N_EMBD)
        self.pos_emb   = nn.Embedding(BLOCK_SIZE, N_EMBD)
        self.drop      = nn.Dropout(DROPOUT)
        self.blocks    = nn.Sequential(*[TransformerBlock() for _ in range(N_LAYER)])
        self.ln_f      = nn.LayerNorm(N_EMBD)
        self.lm_head   = nn.Linear(N_EMBD, VOCAB_SIZE, bias=False)
        self.token_emb.weight = self.lm_head.weight
        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(self, idx, targets=None):
        B, T = idx.size()
        pos    = torch.arange(0, T, device=idx.device)
        x      = self.token_emb(idx) + self.pos_emb(pos)
        x      = self.drop(x)
        x      = self.blocks(x)
        x      = self.ln_f(x)
        logits = self.lm_head(x)
        loss   = None
        if targets is not None:
            loss = F.cross_entropy(logits.view(-1, VOCAB_SIZE), targets.view(-1))
        return logits, loss


# ── Model Loading ──────────────────────────────────────────────────────────────
enc   = None
model = None
model_info = {}

class _EncWrapper:
    """
    Thin wrapper around GPT2TokenizerFast so the rest of the code can call
    enc.encode(text)  ->  list[int]
    enc.decode(ids)   ->  str
    exactly like tiktoken does.
    """
    def __init__(self, tok):
        self._tok = tok

    def encode(self, text: str):
        return self._tok.encode(text)

    def decode(self, ids):
        return self._tok.decode(ids, clean_up_tokenization_spaces=False)


def load_model():
    global enc, model, model_info

    # ── Tokenizer ── (GPT2TokenizerFast downloads from HuggingFace CDN,
    #   not Azure blob, so it works even when openaipublic.blob.core.windows.net
    #   is blocked on the local network)
    try:
        hf_cache = os.path.join(os.path.dirname(__file__), "hf_cache")
        os.makedirs(hf_cache, exist_ok=True)
        raw_tok = GPT2TokenizerFast.from_pretrained(
            "gpt2",
            cache_dir=hf_cache,
        )
        enc = _EncWrapper(raw_tok)
        print("✅ Tokenizer (GPT2TokenizerFast) loaded successfully.")
    except Exception as e:
        print(f"⚠️  Failed to load tokenizer: {e}")
        print("   Make sure you have internet access and 'transformers' is installed:")
        print("   pip install transformers")
        enc = None

    # Try SFT model first, fallback to pretrained
    model_paths = [
        ("sft",        "../models/sft_model.pt"),
        ("pretrained", "../models/best_model.pt"),
        ("sft",        "models/sft_model.pt"),
        ("pretrained", "models/best_model.pt"),
    ]

    loaded = False
    for model_type, path in model_paths:
        if os.path.exists(path):
            print(f"Loading {model_type} model from {path}...")
            try:
                ckpt = torch.load(path, map_location=device, weights_only=False)
                model = GPT().to(device)
                model.load_state_dict(ckpt['model'])
                model.eval()
                model_info = {
                    "type":      model_type,
                    "path":      path,
                    "val_loss":  round(float(ckpt.get('val_loss', 0)), 4),
                    "step":      ckpt.get('step', ckpt.get('epoch', 'N/A')),
                    "params":    sum(p.numel() for p in model.parameters()),
                    "device":    device,
                }
                print(f"✅ Model loaded: {model_info}")
                loaded = True
            except Exception as e:
                print(f"❌ Failed to load model from {path}: {e}")
            break

    if not loaded:
        print("⚠️  No model file found. API will return demo responses.")
        model_info = {"type": "demo", "params": 0, "device": device}

load_model()


# ── Generation ─────────────────────────────────────────────────────────────────
@torch.no_grad()
def generate_text(prompt: str, max_tokens: int = 150, temperature: float = 0.85, top_k: int = 50) -> str:
    if enc is None:
        raise RuntimeError("Tokenizer not loaded. Run the tiktoken cache command first.")
    if model is None:
        return "Model not loaded. Please place model files in the /models directory."

    tokens   = enc.encode(prompt)
    generated = list(tokens)
    prev_token   = None
    repeat_count = 0

    for _ in range(max_tokens):
        inp    = torch.tensor([generated[-BLOCK_SIZE:]], dtype=torch.long, device=device)
        logits, _ = model(inp)
        logits = logits[0, -1, :]

        # Repetition penalty — block tokens seen 3+ times in last 20
        recent = generated[-20:]
        for tid in set(recent):
            if recent.count(tid) >= 3:
                logits[tid] = float('-inf')

        logits = logits / temperature
        v, _   = torch.topk(logits, min(top_k, logits.size(-1)))
        logits[logits < v[-1]] = float('-inf')
        probs      = F.softmax(logits, dim=-1)
        next_token = torch.multinomial(probs, num_samples=1).item()

        if next_token == prev_token:
            repeat_count += 1
            if repeat_count >= 3:
                break
        else:
            repeat_count = 0
        prev_token = next_token

        generated.append(next_token)

        text_so_far = enc.decode(generated[len(tokens):])
        if '<|endoftext|>' in text_so_far:
            break
        if text_so_far.count('\n\n') >= 2:
            break

    result = enc.decode(generated[len(tokens):])
    result = result.replace('<|endoftext|>', '').strip()
    if '###' in result:
        result = result.split('###')[0].strip()
    return result


def format_instruction_prompt(instruction: str, input_text: str = "") -> str:
    if input_text.strip():
        return f"### Instruction:\n{instruction}\n\n### Input:\n{input_text}\n\n### Response:\n"
    return f"### Instruction:\n{instruction}\n\n### Response:\n"


# ── Pydantic Models ────────────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: Optional[int] = 150
    temperature: Optional[float] = 0.85
    top_k: Optional[int] = 50

class ChatRequest(BaseModel):
    instruction: str
    input_text: Optional[str] = ""
    max_tokens: Optional[int] = 150
    temperature: Optional[float] = 0.85


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "name":        "DhruvGPT API",
        "description": "A GPT model trained from scratch",
        "author":      "Dhruv Kumar",
        "version":     "1.0.0",
        "docs":        "/docs",
        "endpoints": {
            "health":   "GET  /health",
            "info":     "GET  /model/info",
            "generate": "POST /generate",
            "chat":     "POST /chat",
        }
    }


@app.get("/health")
def health():
    return {
        "status":       "healthy",
        "model_loaded": model is not None,
        "device":       device,
        "timestamp":    time.time()
    }


@app.get("/model/info")
def get_model_info():
    return {
        "model_info":   model_info,
        "architecture": {
            "type":        "GPT (Decoder-only Transformer)",
            "parameters":  "~30M",
            "vocab_size":  VOCAB_SIZE,
            "context_len": BLOCK_SIZE,
            "n_layers":    N_LAYER,
            "n_heads":     N_HEAD,
            "n_embd":      N_EMBD,
        },
        "training": {
            "pretrain_dataset": "TinyStories (50M tokens)",
            "finetune_dataset":  "Alpaca 52K",
            "pretrain_steps":    50000,
            "finetune_epochs":   3,
        }
    }


@app.post("/generate")
def generate(req: GenerateRequest):
    if enc is None:
        raise HTTPException(status_code=503, detail="Tokenizer not loaded. See server logs for fix instructions.")
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    if req.max_tokens and req.max_tokens > 500:
        raise HTTPException(status_code=400, detail="max_tokens cannot exceed 500")

    start = time.time()
    output = generate_text(
        prompt=req.prompt,
        max_tokens=req.max_tokens,
        temperature=req.temperature,
        top_k=req.top_k
    )
    elapsed = round(time.time() - start, 3)

    return {
        "prompt":        req.prompt,
        "generated":     output,
        "full_text":     req.prompt + output,
        "tokens_generated": len(enc.encode(output)),
        "time_seconds":  elapsed,
        "model_type":    model_info.get("type", "unknown")
    }


@app.post("/chat")
def chat(req: ChatRequest):
    if enc is None:
        raise HTTPException(status_code=503, detail="Tokenizer not loaded. See server logs for fix instructions.")
    if not req.instruction.strip():
        raise HTTPException(status_code=400, detail="Instruction cannot be empty")

    prompt = format_instruction_prompt(req.instruction, req.input_text or "")
    start  = time.time()
    output = generate_text(
        prompt=prompt,
        max_tokens=req.max_tokens,
        temperature=req.temperature,
    )
    elapsed = round(time.time() - start, 3)

    return {
        "instruction":   req.instruction,
        "input":         req.input_text,
        "response":      output,
        "tokens_generated": len(enc.encode(output)),
        "time_seconds":  elapsed,
        "model_type":    model_info.get("type", "unknown")
    }


@app.get("/examples")
def get_examples():
    return {
        "story_starters": [
            "Once upon a time there was a brave little cat who",
            "The princess looked at the dragon and said",
            "In a small village there lived a kind old man who",
            "One day a puppy named Max found a mysterious door",
            "The boy climbed the tallest tree and saw",
        ],
        "instructions": [
            "Write a short story about a brave cat.",
            "Tell me a story about friendship.",
            "Write a bedtime story for children.",
        ]
    }


# ══════════════════════════════════════════════════════════════════════════════
#  OpenAI-Compatible API  (/v1/*)
#  Lets anyone use NanoMind AI exactly like ChatGPT or Claude:
#
#    from openai import OpenAI
#    client = OpenAI(base_url="http://localhost:8000/v1", api_key="nanomind")
#    resp = client.chat.completions.create(
#        model="nanomind-30m",
#        messages=[{"role": "user", "content": "Tell me a story"}]
#    )
#    print(resp.choices[0].message.content)
#
#  Works with any OpenAI-compatible library (LangChain, LiteLLM, etc.)
# ══════════════════════════════════════════════════════════════════════════════

class OAIMessage(BaseModel):
    role:    str
    content: str

class OAIChatRequest(BaseModel):
    model:       str            = "nanomind-30m"
    messages:    list[OAIMessage]
    max_tokens:  Optional[int]  = 150
    temperature: Optional[float] = 0.8
    stream:      Optional[bool]  = False


@app.get("/v1/models")
def list_models():
    """OpenAI-compatible model list endpoint."""
    return {
        "object": "list",
        "data": [
            {
                "id":       "nanomind-30m",
                "object":   "model",
                "created":  1710000000,
                "owned_by": "aryan012234",
                "permission": [],
                "root":     "nanomind-30m",
                "parent":    None,
            }
        ]
    }


@app.post("/v1/chat/completions")
def oai_chat_completions(req: OAIChatRequest):
    """
    OpenAI-compatible chat completions endpoint.

    Usage (Python):
        from openai import OpenAI
        client = OpenAI(
            base_url="https://aryan012234-nanomind-api.hf.space/v1",
            api_key="nanomind"   # any non-empty string
        )
        response = client.chat.completions.create(
            model="nanomind-30m",
            messages=[{"role": "user", "content": "Tell me a short story"}],
            max_tokens=150,
            temperature=0.8
        )

    Usage (curl):
        curl -X POST https://aryan012234-nanomind-api.hf.space/v1/chat/completions \\
          -H "Content-Type: application/json" \\
          -H "Authorization: Bearer nanomind" \\
          -d '{
            "model": "nanomind-30m",
            "messages": [{"role": "user", "content": "Once upon a time"}],
            "max_tokens": 150
          }'
    """
    if enc is None:
        raise HTTPException(status_code=503, detail="Tokenizer not loaded.")

    # Extract the last user message as the instruction
    user_messages = [m for m in req.messages if m.role == "user"]
    if not user_messages:
        raise HTTPException(status_code=400, detail="No user message provided.")

    instruction = user_messages[-1].content.strip()
    if not instruction:
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    # Use system message as context if provided
    system_messages = [m for m in req.messages if m.role == "system"]
    system_ctx = system_messages[0].content if system_messages else ""

    # Format as Alpaca instruction prompt
    prompt = format_instruction_prompt(instruction, system_ctx)

    start  = time.time()
    output = generate_text(
        prompt=prompt,
        max_tokens=req.max_tokens or 150,
        temperature=req.temperature or 0.8,
    )
    elapsed = round(time.time() - start, 3)
    n_tokens = len(enc.encode(output))

    # Return OpenAI-shaped response
    return {
        "id":      f"chatcmpl-nanomind-{int(time.time())}",
        "object":  "chat.completion",
        "created": int(time.time()),
        "model":   "nanomind-30m",
        "choices": [
            {
                "index":         0,
                "message":       {"role": "assistant", "content": output},
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens":     len(enc.encode(instruction)),
            "completion_tokens": n_tokens,
            "total_tokens":      len(enc.encode(instruction)) + n_tokens,
        },
        "system_fingerprint": "nanomind-30m-v1",
        "x_latency_seconds": elapsed,
    }
