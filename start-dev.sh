#!/bin/bash
set -eo pipefail

# BGChat Development Startup Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "🚀 Starting BGChat in development mode..."

# Set environment variables for development
export FLASK_ENV=development
export REACT_APP_ENVIRONMENT=development

# Function to cleanup background processes
cleanup() {
    echo "🛑 Shutting down development servers..."
    [[ -n "${BACKEND_PID:-}" ]] && kill "$BACKEND_PID" 2>/dev/null || true
    [[ -n "${FRONTEND_PID:-}" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Activate backend venv (prefer .venv, fall back to README's myenv)
activate_backend_venv() {
    if [[ -f "$BACKEND_DIR/.venv/bin/activate" ]]; then
        # shellcheck source=/dev/null
        source "$BACKEND_DIR/.venv/bin/activate"
    elif [[ -f "$BACKEND_DIR/myenv/bin/activate" ]]; then
        # shellcheck source=/dev/null
        source "$BACKEND_DIR/myenv/bin/activate"
    else
        echo "No Python virtual environment found in backend/."
        echo "Create one and install dependencies, for example:"
        echo "  cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
        exit 1
    fi
}

# Start backend server with virtual environment
echo "🔧 Starting Flask backend server..."
activate_backend_venv
(
    cd "$BACKEND_DIR"
    python3 run.py
) &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend development server
echo "⚛️  Starting React development server..."
(
    cd "$FRONTEND_DIR"
    npm start
) &
FRONTEND_PID=$!

echo "✅ Development servers started!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for background processes
wait 