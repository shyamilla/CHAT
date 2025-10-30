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
  templateUrl: './chat-list.html',
  styleUrl: './chat-list.css'
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
          next: (res) => {
            (this.users = res || []);
            console.log(this.users);
            
          },
          error: (err) => console.error(err)
        });
      });
    this.subs.push(s);
  }

  // loadChats() {
  //   if (!this.username) return;
  //   this.chat.getUserChatRooms(this.username).subscribe({
  //     next: (res) => (this.chats = res || []),
  //     error: (err) => console.error(err)
  //   });
  // }


  loadChats() {
  if (!this.username) return;

  this.chat.getUserChatRooms(this.username).subscribe({
    next: (groupChats) => {
      this.chat.getPrivateChats(this.username).subscribe({
        next: (privateChats) => {
          const groups = (groupChats || []).map(c => ({ ...c, type: 'group' }));

          // 🧠 Backend already provides displayName for private chats
          const privates = (privateChats || []).map(c => ({
            ...c,
            type: 'private',
            displayName: c.displayName || c.name
          }));

          this.chats = [...privates, ...groups];
        },
        error: (err) => console.error('Error loading private chats:', err)
      });
    },
    error: (err) => console.error('Error loading group chats:', err)
  });
}




  // openChat(roomId: string) {
  //   this.router.navigate(['/chats/rooms', roomId]);
  // }

  openChat(chat: any) {
  if (chat.type === 'private') {
    // navigate to personal chat with the other username
    const other = chat.members.find((m: string) => m !== this.username);
    this.router.navigate(['/chats/personal', other]);
  } else {
    this.router.navigate(['/chats/rooms', chat.id]);
  }
}


  // ✅ Start DM between two users
  startDirectChat(otherUsername: string) {

    // check error at this place, upon click on this, the page is redirected to login.
    if (!this.username) return;
    const name = `${[ otherUsername].sort().join('-')}`; 
    const payload = { 
      name,
      creatorUsername: this.username,
      memberUsernames: [otherUsername]
    };
    this.chat.createGroup(payload).subscribe({
      next: (room) => {
        console.log(room);
        this.router.navigate(['/chats/rooms/', room.id]);
      },
      error: (err) => {
        console.error(err)
        console.log(err);
        
      }
    });
  }

  createGroupManual() { 
    this.router.navigate(['/chats/create-group']);
  }

   /** 🗑 Delete entire chat */
  deleteChat(chat: any, event: MouseEvent) {
    event.stopPropagation(); // prevent navigation

    if (!confirm(`Are you sure you want to delete "${chat.name}"?`)) return;

    this.chat.deleteChat(chat.id).subscribe({
      next: () => {
        this.chats = this.chats.filter((c) => c.id !== chat.id);
        console.log(`✅ Deleted chat ${chat.id}`);
      },
      error: (err) => console.error('❌ Delete error:', err)
    });
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
