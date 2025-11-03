// src/app/core/services/chat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth';

export interface ChatRoom {
  messages: never[];
  room: any;
  id: string;
  name?: string;
  isGroup: boolean;
  members: string[];
  admins?: string[];
  createdAt?: string;
}

export interface ChatMessage {
  id?: string;
  roomId: string;
  senderUsername: string;
  receiverUsername?: string | null;
  content: string;
  timestamp?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private api = environment.apiUrl; // e.g., http://localhost:8080
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  messages$ = this.messagesSubject.asObservable();

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  /** 🔹 Get all users (for search or group creation) */
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/users`, { headers: this.headers() });
  }

  /** 🔹 Search users by username */
  searchUsers(query: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/users/search?query=${query}`, {
      headers: this.headers(),
    });
  }

  /** 🔹 Create or fetch a private chat */
  getOrCreatePrivateChat(receiverUsername: string): Observable<ChatRoom> {
    return this.http.post<ChatRoom>(
      `${this.api}/chats/private/${receiverUsername}`,
      {},
      { headers: this.headers() }
    );
  }

  /** 🔹 Get all rooms for a user */
  getUserChatRooms(username: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/chats/rooms/${username}`, {
      headers: this.headers(),
    });
  }

  /** 🔹 Get messages for a specific room */
  getMessages(roomId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.api}/chats/${roomId}/messages`, {
      headers: this.headers(),
    });
  }

  /** 🔹 Send a message (private or group) */
 /** 🔹 Send a message (private or group) */
sendMessage(roomId: string | null, content: string, receiverUsername?: string): Observable<ChatMessage> {
  const body: any = { content };

  if (roomId) body.roomId = roomId;
  if (receiverUsername) body.receiverUsername = receiverUsername;

  return this.http.post<ChatMessage>(`${this.api}/chats/messages/send`, body, {
    headers: this.headers(),
  });
}



  /** 🔹 Create a new group */
  createGroup(name: string, memberUsernames: string[]): Observable<ChatRoom> {
  const payload = { name, memberUsernames };
  return this.http.post<ChatRoom>(
    `${this.api}/chats/group/create`,
    payload,
    { headers: this.headers() }
  );
}




  /** 🔹 Add members to a group */
  addMembers(groupId: string, memberUsernames: string[]): Observable<ChatRoom> {
    return this.http.post<ChatRoom>(
      `${this.api}/chats/group/${groupId}/add`,
      { memberUsernames },
      { headers: this.headers() }
    );
  }

  /** 🔹 Update local message stream (used with WebSocket events) */
  appendMessage(message: ChatMessage) {
    const current = this.messagesSubject.value;
    this.messagesSubject.next([...current, message]);
  }

  /** 🔹 Clear messages (on room switch) */
  clearMessages() {
    this.messagesSubject.next([]);
  }


  // Helpers

  getRoomById(roomId: string) {
  return this.http.get<any>(`${environment.apiUrl}/chats/room/${roomId}`, {  headers: this.headers()});
}

}
