import { Injectable } from '@angular/core';
import Stomp from 'stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth';
import { v4 as uuidv4 } from 'uuid'; // ✅ use unique IDs (install: npm i uuid)

@Injectable({ providedIn: 'root' })
export class WsService {
  private stompClient: Stomp.Client | null = null;
  private connected = false;
  private connectPromise: Promise<void> | null = null;

  private messageSubject = new Subject<any>();
  messages$ = this.messageSubject.asObservable();
  public messageStream$ = this.messages$;

  private chatListSubject = new BehaviorSubject<any[]>([]);
  chatList$ = this.chatListSubject.asObservable();

  private activeSubscriptions = new Map<string, any>();
  private reconnectAttempts = 0;
  private readonly baseDelay = 3000;

  constructor(private auth: AuthService) {}

  /** 🔗 Connect WebSocket with JWT */
  connect(): Promise<void> {
    const token = this.auth.getToken();
    if (!token) return Promise.reject('❌ No JWT token found.');

    if (this.connected && this.stompClient?.connected) {
      return Promise.resolve();
    }

    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve, reject) => {
      const socketUrl = `${environment.wsUrl}?token=${token}`;
      const socket = new SockJS(socketUrl);
      this.stompClient = Stomp.over(socket);
      this.stompClient.debug = () => {};

      this.stompClient.connect(
        {},
        () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          console.log('✅ WebSocket connected successfully');

          setTimeout(() => {
            this.subscribeToPrivateQueue();
            this.subscribeToUserUpdates();
          }, 300);

          this.connectPromise = null;
          resolve();
        },
        (err) => {
          console.error('❌ WebSocket connection failed:', err);
          this.connected = false;
          this.connectPromise = null;
          this.scheduleReconnect();
          reject(err);
        }
      );

      (socket as any)._transport?.ws?.addEventListener('close', () => {
        this.connected = false;
        this.connectPromise = null;
        this.scheduleReconnect();
      });
    });

    return this.connectPromise;
  }

  private scheduleReconnect() {
    const delay = Math.min(this.baseDelay * Math.pow(2, this.reconnectAttempts++), 30000);
    console.warn(`🔁 Attempting reconnect in ${delay / 1000}s`);
    setTimeout(() => this.connect(), delay);
  }

  private subscribeToPrivateQueue() {
    if (!this.stompClient) return;

    const destination = `/user/queue/private`;
    if (this.activeSubscriptions.has(destination)) return;

    const sub = this.stompClient.subscribe(destination, (msg) => {
      try {
        const data = JSON.parse(msg.body);
        this.handleIncoming(data);
      } catch (e) {
        console.error('❌ Error parsing private message:', e);
      }
    });

    this.activeSubscriptions.set(destination, sub);
  }

  async subscribeToRoom(roomId: string) {
    if (!roomId) return;
    const destination = `/topic/messages/${roomId}`;
    if (this.activeSubscriptions.has(destination)) return;

    await this.ensureConnected();

    const sub = this.stompClient!.subscribe(destination, (msg) => {
      try {
        const data = JSON.parse(msg.body);
        this.handleIncoming(data);
      } catch (e) {
        console.error('❌ Error parsing room message:', e);
      }
    });

    this.activeSubscriptions.set(destination, sub);
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected && this.stompClient?.connected) return;
    try {
      await this.connect();
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
      return this.ensureConnected();
    }
  }

  /** 💬 Send message with unique clientId */
  sendMessage(roomId: string, content: string, receiverUsername?: string, clientId?: string) {
    if (!this.stompClient || !this.connected) {
      console.error('⚠️ Cannot send — WebSocket not connected');
      return;
    }

    const senderUsername = this.auth.getUsername();
    const payload = {
      roomId,
      senderUsername,
      receiverUsername,
      content,
      clientId: clientId || uuidv4(),
      timestamp: new Date().toISOString(),
    };

    console.log('📤 Sending message:', payload);
    this.stompClient.send('/app/send-message', {}, JSON.stringify(payload));
  }

  /** 📥 Handle incoming messages + prevent duplicates */
  private seenClientIds = new Set<string>();

  private handleIncoming(msg: any) {
    if (!msg || !msg.content) return;

    // 🧠 Skip duplicates using clientId
    if (msg.clientId && this.seenClientIds.has(msg.clientId)) {
      console.log('🚫 Duplicate ignored:', msg.clientId);
      return;
    }

    if (msg.clientId) this.seenClientIds.add(msg.clientId);
    this.messageSubject.next(msg);
  }

  public subscribeToUserUpdates() {
    if (!this.stompClient || !this.connected) return;

    const destination = `/user/queue/chats`;
    if (this.activeSubscriptions.has(destination)) return;

    const sub = this.stompClient.subscribe(destination, (msg) => {
      try {
        const updatedList = JSON.parse(msg.body);
        this.chatListSubject.next(updatedList);
      } catch (e) {
        console.error('❌ Error parsing chat list update:', e);
      }
    });

    this.activeSubscriptions.set(destination, sub);
  }

  updateChatList(list: any[]) {
    this.chatListSubject.next(list);
  }

  disconnect() {
    if (this.stompClient && this.connected) {
      this.activeSubscriptions.forEach((s) => s.unsubscribe());
      this.activeSubscriptions.clear();

      this.stompClient.disconnect(() => {
        console.log('🔌 WebSocket disconnected');
      });

      this.connected = false;
    }
    this.connectPromise = null;
  }
}
