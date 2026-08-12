export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
}

export interface ScoreSubmitResponse {
  nickname: string;
  score: number;
}

// Resolve the backend API endpoint URL from Vite env variables or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiService {
  /**
   * Submit score to backend API.
   * Gracefully returns null if network or backend is offline.
   */
  public static async submitScore(nickname: string, score: number): Promise<ScoreSubmitResponse | null> {
    try {
      const response = await fetch(`${API_URL}/api/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname, score }),
      });

      if (!response.ok) {
        console.warn(`[API ERROR] Score submission returned HTTP ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (err) {
      console.error('[API ERROR] Failed to submit score to server:', err);
      return null;
    }
  }

  /**
   * Fetch top scores from backend API.
   * Gracefully returns null if backend is offline.
   */
  public static async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[] | null> {
    try {
      const response = await fetch(`${API_URL}/api/leaderboard?limit=${limit}`);

      if (!response.ok) {
        console.warn(`[API ERROR] Fetching leaderboard returned HTTP ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (err) {
      console.error('[API ERROR] Failed to fetch leaderboard from server:', err);
      return null;
    }
  }

  /**
   * Request backend to create a new room. Returns PIN.
   */
  public static async createRoom(): Promise<string | null> {
    try {
      const response = await fetch(`${API_URL}/api/rooms/create`, {
        method: 'POST'
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.pin || null;
    } catch (err) {
      console.error('[API ERROR] Failed to create room:', err);
      return null;
    }
  }

  /**
   * Request backend to join a room.
   */
  public static async joinRoom(pin: string, nickname: string, skin: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pin, nickname, skin })
      });
      return response.ok;
    } catch (err) {
      console.error('[API ERROR] Failed to join room:', err);
      return false;
    }
  }

  /**
   * Helper to construct the WebSocket URL for room connections.
   */
  public static getWebSocketUrl(pin: string, nickname: string): string {
    const wsBase = API_URL.replace(/^http/, 'ws');
    return `${wsBase}/api/rooms/ws/${pin}/${nickname}`;
  }

  /**
   * Fetch multiplayer room history.
   */
  public static async getRoomHistory(): Promise<any[] | null> {
    try {
      const response = await fetch(`${API_URL}/api/rooms/history`);
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error('[API ERROR] Failed to fetch room history:', err);
      return null;
    }
  }
}
