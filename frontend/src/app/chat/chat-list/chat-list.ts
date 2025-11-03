import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription, debounceTime } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';
import { ChatService } from '../../core/services/chat.service';
import { WsService } from '../../core/services/chat-socket';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './chat-list.html',
  styleUrls: ['./chat-list.css']
})
export class ChatListComponent implements OnInit, OnDestroy {
  chats: any[] = [];
  users: any[] = [];
  username = localStorage.getItem('username') ?? '';
  searchForm: FormGroup;
  private subs: Subscription[] = [];

  // 🔹 Group creation section
  creatingGroup = false;
  groupForm!: FormGroup;
  groupSearch = new FormControl('');
  groupResults: any[] = [];
  selectedMembers: string[] = [];

  constructor(
    private fb: FormBuilder,
    private chat: ChatService,
    private ws: WsService,
    private router: Router
  ) {
    this.searchForm = this.fb.group({
      query: ['']
    });
  }

  ngOnInit() {
    const token = localStorage.getItem('jwt_token') ?? undefined;
    if (token) this.ws.connect(); // Expected 0 arguments, but got 1.ts(2554)


    // Subscribe for user updates
    this.ws.subscribeToUserUpdates(); // Property 'subscribeToUserUpdates' does not exist on type 'WsService'.ts(2339)


    // WebSocket-driven chat list updates
    const chatSub = this.ws.chatList$.subscribe((list : any[]) => { // Property 'chatList$' does not exist on type 'WsService'.ts(2339)

      // Parameter 'list' implicitly has an 'any' type.ts(7006)

      if (list && list.length > 0) {
        this.chats = this.filterUniqueChats(list);
      } else {
        this.loadChats();
      }
    });
    this.subs.push(chatSub);

    // Initial chat load
    this.loadChats();

    // 🔎 Debounced user search (for personal chat)
    const searchSub = this.searchForm.get('query')!.valueChanges
      .pipe(debounceTime(400))
      .subscribe((query) => {
        if (!query || query.trim().length < 1) {
          this.users = [];
          return;
        }
        this.chat.searchUsers(query.trim()).subscribe({
          next: (res) => (this.users = res || []),
          error: (err) => console.error('❌ User search error:', err)
        });
      });
    this.subs.push(searchSub);

    // 🧱 Group form init
    this.groupForm = this.fb.group({
      name: ['', Validators.required]
    });

    // 🔍 Group member search
    const groupSearchSub = this.groupSearch.valueChanges
      .pipe(debounceTime(400))
      .subscribe((term) => {
        if (!term || term.trim().length < 1) {
          this.groupResults = [];
          return;
        }
        this.chat.searchUsers(term.trim()).subscribe({
          next: (res) => (this.groupResults = res || []),
          error: (err) => console.error('❌ Group search error:', err)
        });
      });
    this.subs.push(groupSearchSub);
  }

  get queryControl(): FormControl {
    return this.searchForm.get('query') as FormControl;
  }

  /** 🧠 Load all personal + group chats for current user */
  loadChats() {
    if (!this.username) return;
    this.chat.getUserChatRooms(this.username).subscribe({
      next: (res) => {
        this.chats = this.filterUniqueChats(res || []);
        this.ws.updateChatList(this.chats);
      },
      error: (err) => console.error('❌ Error loading chats:', err)
    });
  }

  /** 🔎 Remove duplicates by name */
  private filterUniqueChats(list: any[]): any[] {
    const seen = new Set<string>();
    return list.filter((chat) => {
      const name = (chat.displayName || chat.name || '').toLowerCase().trim();
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }

  /** 🚪 Open selected chat (group or private) */
  openChat(chat: any) {
    if (chat.isGroup || chat.type === 'group') {
      this.router.navigate(['/chats/rooms', chat.id]);
    } else {
      const other = chat.members.find((m: string) => m !== this.username);
      this.router.navigate(['/chats/personal', other]);
    }
  }

  /** 💬 Start a personal chat with another user */
  startDirectChat(otherUsername: string) {
    if (!this.username || !otherUsername) return;

    this.chat.getOrCreatePrivateChat(otherUsername).subscribe({
      next: (data) => {
        console.log('✅ Private chat started:', data);
        this.router.navigate(['/chats/personal', otherUsername]);
      },
      error: (err) => console.error('❌ Error starting private chat:', err),
    });
  }

  /** ➕ Toggle group creation UI */
  toggleGroupCreation() {
    this.creatingGroup = !this.creatingGroup;
    this.selectedMembers = [];
    this.groupForm.reset();
  }

  /** 👥 Select or deselect group members */
  toggleMember(username: string) {
    if (this.selectedMembers.includes(username)) {
      this.selectedMembers = this.selectedMembers.filter((u) => u !== username);
    } else {
      this.selectedMembers.push(username);
    }
  }

  /** 🏗 Create a new group */
  createGroup() {
    const name = this.groupForm.value.name;
    if (!name || this.selectedMembers.length === 0) return;

    this.chat.createGroup(name, this.selectedMembers).subscribe({
      next: () => {
        console.log('✅ Group created successfully');
        this.toggleGroupCreation();
        this.loadChats();
      },
      error: (err) => console.error('❌ Group creation failed:', err)
    });
  }

  /** 🗑 Delete chat */
  // deleteChat(chat: any, event: MouseEvent) {
  //   event.stopPropagation();
  //   if (!confirm(`Delete "${chat.name}"?`)) return;

  //   this.chat.deleteChat(chat.id).subscribe({
  //     next: () => {
  //       this.chats = this.chats.filter((c) => c.id !== chat.id);
  //       this.ws.updateChatList(this.chats);
  //     },
  //     error: (err) => console.error('❌ Delete error:', err)
  //   });
  // }

  /** 🧹 Cleanup subscriptions */
  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }


getChatDisplayName(chat: any): string {
  // ✅ Handle groups first
  if (chat.isGroup || chat.type === 'group') {
    return chat.displayName || chat.name || 'Unnamed Group';
  }

  // ✅ Handle private chats
  if (Array.isArray(chat.members)) {
    const other = chat.members.find((m: string) => m !== this.username);
    return other || chat.displayName || 'Unknown';
  }

  return chat.displayName || 'Unknown';
}



}
