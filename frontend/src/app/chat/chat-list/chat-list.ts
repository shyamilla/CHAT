import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Subscription, debounceTime } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';
import { ChatService } from '../../core/services/chat.service';
import { WsService } from '../../core/services/chat-socket';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './chat-list.html'
})
export class ChatListComponent implements OnInit, OnDestroy {
  chats: any[] = [];
  users: any[] = [];
  username = localStorage.getItem('username') ?? '';
  searchForm;
  private subs: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private chat: ChatService,
    private ws: WsService,
    private router: Router
  ) {
    // ✅ Initialize form only after fb is available
    this.searchForm = this.fb.group({
      query: ['']
    });
  }

  ngOnInit() {
    const token = localStorage.getItem('jwt_token') ?? undefined;
    this.ws.connect(token);

    // ✅ Subscribe to user-specific WebSocket updates
    this.ws.subscribeToUserUpdates((msg) => {
      const body = msg.body;
      console.log('[WS] user update:', body);
      if (body && body.toString().startsWith('GROUP_CREATED')) {
        this.loadChats();
      } else {
        this.loadChats();
      }
    });

    this.loadChats();

    // ✅ Debounced user search
    const s = this.searchForm.get('query')!.valueChanges
      .pipe(debounceTime(300))
      .subscribe((v) => {
        if (!v || v.length < 1) {
          this.users = [];
          return;
        }
        this.chat.searchUsers(v).subscribe({
          next: (res) => (this.users = res || []),
          error: (err) => console.error(err)
        });
      });
    this.subs.push(s);
  }

  loadChats() {
    if (!this.username) return;
    this.chat.getUserChatRooms(this.username).subscribe({
      next: (res) => (this.chats = res || []),
      error: (err) => console.error(err)
    });
  }

  openChat(roomId: string) {
    this.router.navigate(['/chat', roomId]);
  }

  // ✅ Start DM between two users
  startDirectChat(otherUsername: string) {
    if (!this.username) return;
    const name = `DM:${[this.username, otherUsername].sort().join('-')}`;
    const payload = {
      name,
      creatorUsername: this.username,
      memberUsernames: [otherUsername]
    };
    this.chat.createGroup(payload).subscribe({
      next: (room) => {
        this.router.navigate(['/chat', room.id]);
      },
      error: (err) => console.error(err)
    });
  }

  createGroupManual() {
    this.router.navigate(['/chats/create-group']);
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
