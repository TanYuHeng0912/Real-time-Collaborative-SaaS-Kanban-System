import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { CardUpdateMessage } from '@/types';

interface UseWebSocketProps {
  boardId: number | null;
  onCardUpdate: (message: CardUpdateMessage) => void;
}

export const useWebSocket = ({ boardId, onCardUpdate }: UseWebSocketProps) => {
  const clientRef = useRef<Client | null>(null);
  const onCardUpdateRef = useRef(onCardUpdate);

  useEffect(() => {
    onCardUpdateRef.current = onCardUpdate;
  }, [onCardUpdate]);

  useEffect(() => {
    if (!boardId) return;

    // Determine WebSocket URL - use environment variable or fallback
    // VITE_WS_URL should be the full WebSocket URL including /ws endpoint
    // IMPORTANT: SockJS requires https:// (not wss://) - it handles the protocol internally
    // For Docker: VITE_WS_URL=/api/ws (relative, proxied by nginx)
    // For Render: VITE_WS_URL=https://kanban-backend-d0s2.onrender.com/api/ws
    const wsUrl = import.meta.env.VITE_WS_URL || 
      (import.meta.env.PROD ? 'https://kanban-backend-d0s2.onrender.com/api/ws' : '/api/ws');
    
    console.log('[WebSocket] Connecting to:', wsUrl);

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl) as any,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log(`[WebSocket] Connected to board ${boardId}`);
        client.subscribe(`/topic/board/${boardId}`, (message) => {
          try {
            const update: CardUpdateMessage = JSON.parse(message.body);
            console.log('[WebSocket] Received update:', update);
            onCardUpdateRef.current(update);
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', error, message.body);
          }
        });
      },
      onStompError: (frame) => {
        console.error('[WebSocket] STOMP error:', frame);
      },
      onWebSocketError: (event) => {
        console.error('[WebSocket] Connection error:', event);
      },
      onDisconnect: () => {
        console.log('[WebSocket] Disconnected');
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [boardId]);
};

