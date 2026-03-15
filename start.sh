#!/bin/bash
echo ""
echo "  DhruvGPT — Local Development"
echo "  ─────────────────────────────"
echo ""

if [ ! -f "models/sft_model.pt" ] && [ ! -f "models/best_model.pt" ]; then
  echo "  ⚠️  No model files in models/ — place sft_model.pt or best_model.pt there"
  echo ""
fi

echo "  [1/2] Starting FastAPI backend → http://localhost:8000"
cd backend && pip install -r requirements.txt -q
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

sleep 2

echo "  [2/2] Starting Next.js frontend → http://localhost:3000"
cd frontend && npm install -q && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "  ✅ Backend  → http://localhost:8000"
echo "  ✅ API Docs → http://localhost:8000/docs"  
echo "  ✅ Frontend → http://localhost:3000"
echo ""
echo "  Ctrl+C to stop both"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
