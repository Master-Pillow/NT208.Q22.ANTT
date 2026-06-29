import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

function getCurrentUserId(): number | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.id ? Number(user.id) : null;
  } catch {
    return null;
  }
}

/**
 * Socket singleton dùng chung cho toàn app. Tự động join phòng `user_<id>` của
 * người dùng hiện tại mỗi khi (re)connect — cần cho realtime theo phòng user và
 * cho việc backend kiểm tra "người nhận đang online" trước khi gửi email.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, { transports: ['websocket'] });

    const joinUserRoom = () => {
      const userId = getCurrentUserId();
      if (userId) socket?.emit('join_user', userId);
    };

    socket.on('connect', joinUserRoom);
    joinUserRoom();
  }

  return socket;
}
