import { inject, Injectable } from '@angular/core';
import Stomp from 'stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth';


@Injectable({ providedIn: 'root' })
export class WsService {
  private stompClient: Stomp.Client | null = null;
  private connected = false;
  private apiWsUrl = `${environment.wsUrl}`; 
  private connectPromise: Promise<void> | null = null;

    authService = inject(AuthService);

  // ✅ Connect returns a Promise to ensure connection readiness
  connect(token?: string): Promise<void> {
    if (this.connected) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;
    console.log(token);
    
    this.connectPromise = new Promise((resolve, reject) => {
      const socket = new SockJS(this.apiWsUrl);
      this.stompClient = Stomp.over(socket);

      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      console.log('🌐 Connecting WebSocket...');

      this.stompClient.connect(
        headers,
        () => {
          this.connected = true;
          console.log('✅ WebSocket connected');
          resolve();
        },
        (err) => {
          console.error('❌ WebSocket connection error:', err);
          this.connected = false;
          this.connectPromise = null;
          reject(err);
        }
      );
    });

    return this.connectPromise;
  }

  disconnect() {
    if (this.stompClient && this.connected) {
      this.stompClient.disconnect(() => {
        this.connected = false;
        this.connectPromise = null;
        console.log('🔌 WebSocket disconnected');
      });
    }
  }

  // ✅ Wait for connection before subscribing
  async subscribeToUserUpdates(callback: (msg: any) => void) {
    await this.connect();
    if (!this.stompClient) return;
    this.stompClient.subscribe('/user/topic/updates', (message) => {
      callback(JSON.parse(message.body));
    });
    console.log('📡 Subscribed to /user/topic/updates');
  }

  // ✅ Wait for connection before subscribing to group
  async subscribeToGroup(roomId: string, callback: (msg: any) => void) {
    await this.connect();
    if (!this.stompClient) return;
    this.stompClient.subscribe(`/topic/group/${roomId}`, (message) => {
      callback(JSON.parse(message.body));
    });
    console.log(`📡 Subscribed to /topic/group/${roomId}`);
  }

  // ✅ Wait for connection before sending message
    async sendMessage(destination: string, body: any) {
    await this.connect();
    if (!this.stompClient || !this.connected) {
      console.warn('⚠️ WebSocket not connected. Message not sent.');
      return;
    }

    
    const token = this.authService.getToken();
    const headers: any = {};

    if (token) headers['Authorization'] = `Bearer ${token}`;

    this.stompClient.send(destination, headers, JSON.stringify(body));
    console.log(`📨 Sent message to ${destination}`);
  }


  // *******

  subscribePrivate(callback: (msg: any) => void) {
  if (!this.stompClient) return;
  this.stompClient.subscribe('/user/queue/private', (msg) => {
    const data = JSON.parse(msg.body);
    callback(data);
  });
}

sendPrivate(message: any) {
  if (this.stompClient && this.connected) {
    this.stompClient.send('/app/chat.private', {}, JSON.stringify(message));
  }
}

}
