# Dash and Dodge — หนีล้อ ทะลวงเลน (NheeLorTaloungLane)

A 2D Web Arcade / Endless Crossing game built with Phaser 3 (TypeScript + Vite) and FastAPI (Python + PostgreSQL).

## Project Structure

- `frontend/` - Phaser 3 game client
- `backend/` - FastAPI service for leaderboard tracking

## Setup Instructions

### Frontend
1. Navigate to `frontend/`:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Open `http://localhost:5173` to play the game.

### Backend
1. Navigate to `backend/`:
   ```bash
   cd backend
   python -m venv venv
   .\venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```
2. The interactive Swagger docs will be available at `http://localhost:8000/docs`.
