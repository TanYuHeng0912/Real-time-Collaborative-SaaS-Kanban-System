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

  useEffect(() => {
    if (!boardId) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('/api/ws') as any,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        client.subscribe(`/topic/board/${boardId}`, (message) => {
          const update: CardUpdateMessage = JSON.parse(message.body);
          onCardUpdate(update);
        });
      },
      onStompError: (frame) => {
        console.error('WebSocket error:', frame);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [boardId, onCardUpdate]);
};

