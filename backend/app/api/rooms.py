import random
from typing import Dict, List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import get_db

router = APIRouter(prefix="/api/rooms", tags=["rooms"])

class JoinRoomRequest(BaseModel):
    pin: str
    nickname: str
    skin: str

class RoomPlayer:
    def __init__(self, nickname: str, skin: str):
        self.nickname = nickname
        self.skin = skin
        self.score = 0
        self.is_finished = False
        self.ws: Optional[WebSocket] = None

class Room:
    def __init__(self, pin: str):
        self.pin = pin
        self.is_started = False
        self.players: Dict[str, RoomPlayer] = {}
        self.host_ws: Optional[WebSocket] = None

class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}

    def create_room(self) -> str:
        for _ in range(100):
            pin = f"{random.randint(1000, 9999)}"
            if pin not in self.rooms:
                self.rooms[pin] = Room(pin)
                return pin
        raise ValueError("Could not generate a unique PIN")

    def join_room(self, pin: str, nickname: str, skin: str) -> bool:
        if pin not in self.rooms:
            return False
        room = self.rooms[pin]
        if room.is_started:
            return False
        room.players[nickname] = RoomPlayer(nickname, skin)
        return True

manager = RoomManager()

@router.post("/create")
def create_room():
    try:
        pin = manager.create_room()
        return {"status": "success", "pin": pin}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/join")
def join_room(req: JoinRoomRequest):
    success = manager.join_room(req.pin, req.nickname, req.skin)
    if not success:
        raise HTTPException(status_code=400, detail="Room not found, nickname taken, or game already started")
    return {"status": "success", "pin": req.pin}

@router.get("/history")
def get_room_history(db: Session = Depends(get_db)):
    if not db:
        return []
    from app.db.models import RoomHistoryModel
    histories = db.query(RoomHistoryModel).order_by(RoomHistoryModel.created_at.desc()).limit(20).all()
    return [
        {
            "id": h.id,
            "room_pin": h.room_pin,
            "results": h.results,
            "created_at": h.created_at
        }
        for h in histories
    ]

def get_room_players_list(room: Room) -> List[dict]:
    return [
        {
            "nickname": p.nickname,
            "skin": p.skin,
            "score": p.score,
            "is_finished": p.is_finished
        }
        for p in room.players.values()
    ]

@router.websocket("/ws/{pin}/{nickname}")
async def room_websocket(websocket: WebSocket, pin: str, nickname: str):
    await websocket.accept()
    
    if pin not in manager.rooms:
        await websocket.send_json({"type": "error", "message": "Room not found"})
        await websocket.close()
        return

    room = manager.rooms[pin]

    try:
        if nickname == "__host__":
            room.host_ws = websocket
            await websocket.send_json({
                "type": "lobby_update",
                "players": get_room_players_list(room)
            })
        else:
            if nickname not in room.players:
                room.players[nickname] = RoomPlayer(nickname, "man")
                
            player = room.players[nickname]
            player.ws = websocket

            lobby_msg = {
                "type": "lobby_update",
                "players": get_room_players_list(room)
            }
            if room.host_ws:
                await room.host_ws.send_json(lobby_msg)
            for p in room.players.values():
                if p.ws:
                    await p.ws.send_json(lobby_msg)

        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "start":
                if nickname == "__host__":
                    room.is_started = True
                    start_msg = {"type": "start_game"}
                    if room.host_ws:
                        await room.host_ws.send_json(start_msg)
                    for p in room.players.values():
                        if p.ws:
                            await p.ws.send_json(start_msg)
            
            elif msg_type == "update_score":
                score = data.get("score", 0)
                if nickname in room.players:
                    player = room.players[nickname]
                    player.score = score

                    score_msg = {
                        "type": "scoreboard_update",
                        "players": get_room_players_list(room)
                    }
                    if room.host_ws:
                        await room.host_ws.send_json(score_msg)
                    for p in room.players.values():
                        if p.ws:
                            await p.ws.send_json(score_msg)

            elif msg_type == "submit_score":
                score = data.get("score", 0)
                if nickname in room.players:
                    player = room.players[nickname]
                    player.score = score
                    player.is_finished = True

                    score_msg = {
                        "type": "scoreboard_update",
                        "players": get_room_players_list(room)
                    }
                    if room.host_ws:
                        await room.host_ws.send_json(score_msg)
                    for p in room.players.values():
                        if p.ws:
                            await p.ws.send_json(score_msg)

                    all_finished = all(p.is_finished for p in room.players.values())
                    if all_finished:
                        await send_results(room)

            elif msg_type == "end_game":
                if nickname == "__host__":
                    await send_results(room)

    except WebSocketDisconnect:
        if nickname == "__host__":
            room.host_ws = None
        else:
            if nickname in room.players:
                del room.players[nickname]
                
                lobby_msg = {
                    "type": "lobby_update",
                    "players": get_room_players_list(room)
                }
                if room.host_ws:
                    await room.host_ws.send_json(lobby_msg)
                for p in room.players.values():
                    if p.ws:
                        await p.ws.send_json(lobby_msg)

async def send_results(room: Room):
    sorted_players = sorted(
        room.players.values(),
        key=lambda x: x.score,
        reverse=True
    )
    
    leaderboard = [
        {
            "rank": idx + 1,
            "nickname": p.nickname,
            "skin": p.skin,
            "score": p.score
        }
        for idx, p in enumerate(sorted_players)
    ]

    results_msg = {
        "type": "results",
        "leaderboard": leaderboard
    }

    if room.host_ws:
        await room.host_ws.send_json(results_msg)
    for p in room.players.values():
        if p.ws:
            await p.ws.send_json(results_msg)

    # Save to database history
    from app.db.database import SessionLocal
    from app.db.models import RoomHistoryModel
    if SessionLocal:
        db = SessionLocal()
        try:
            db_history = RoomHistoryModel(
                room_pin=room.pin,
                results=leaderboard
            )
            db.add(db_history)
            db.commit()
            print(f"[DB] Saved room {room.pin} history successfully.")
        except Exception as ex:
            print(f"[DB ERROR] Failed to save room history: {ex}")
            db.rollback()
        finally:
            db.close()
