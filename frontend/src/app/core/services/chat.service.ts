import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  /** 🧠 Helper: Builds headers with Authorization token */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  // ✅ Fetch user’s chat rooms (groups + DMs)
  getUserChatRooms(username: string): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/chats/rooms/${username}`, { headers });
  }

  // ✅ Create group or DM
  createGroup(data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/chats/create`, data, { headers });
  }

  // ✅ Add members to group
  addMembers(data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/chats/add-members`, data, { headers });
  }

  // ✅ Remove member
  removeMember(groupId: string, adminUsername: string, memberToRemove: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.apiUrl}/chats/${groupId}/remove-member`, {
      params: { adminUsername, memberToRemove },
      headers
    });
  }

  // ✅ Assign admin
  assignAdmin(groupId: string, adminUsername: string, newAdminUsername: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/chats/${groupId}/assign-admin`, null, {
      params: { adminUsername, newAdminUsername },
      headers
    });
  }

  // ✅ Get messages of a room
  getMessages(roomId: string): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/messages/${roomId}`, { headers });
  }

  // ✅ Send message
  sendMessage(data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/messages/send`, data, { headers });
  }

  // ✅ User list
  getAllUsers(): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/users`, { headers });
  }

  // ✅ Search users
  searchUsers(query: string): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/users/search?query=${query}`, { headers });
  }

  // ✅ Get group details (members + admins)
  getGroupDetails(groupId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/groups/${groupId}`, { headers });
  }

  getGroupById(id: string) {
    return this.http.get<any>(`${this.apiUrl}/chats/groups/${id}`);
  }

  deleteChat(chatId: string) {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.apiUrl}/chats/delete/${chatId}`, { headers });


  }



  // Get or create a private chat between current user and another user
  getOrCreatePrivateChat(otherUsername: string) {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/chats/private/${otherUsername}`, {}, { headers });
  }
  
  // Get all private chat rooms for a user
  getPrivateChats(username: string) {
    const headers = this.getAuthHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/chats/private/rooms/${username}`,  { headers });
  }




}
