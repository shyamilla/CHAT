import { Injectable } from '@angular/core';
import Stomp from 'stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WsService {
  private stompClient: Stomp.Client | null = null;
  private connected = false;
  private apiWsUrl = `${environment.apiUrl.replace('/api', '')}/ws`; 
  private connectPromise: Promise<void> | null = null;

  // ✅ Connect returns a Promise to ensure connection readiness
  connect(token?: string): Promise<void> {
    if (this.connected) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;

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
    this.stompClient.send(destination, {}, JSON.stringify(body));
    console.log(`📨 Sent message to ${destination}`);
  }
}
