import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService } from '../../core/services/chat.service';
import { WsService } from '../../core/services/chat-socket';
import { AuthService } from '../../core/services/auth';
import { createLinkedSignal } from '@angular/core/primitives/signals';

@Component({
  selector: 'app-personal-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './personal-chat.html',
  styleUrls: ['./personal-chat.css'],
})
export class PersonalChatComponent implements OnInit, OnDestroy {
  username: string = '';
  receiverUsername: string | null = null;
  roomId: string | null = null;
  messages: any[] = [];
  chatForm: FormGroup;
  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private chatService: ChatService,
    private ws: WsService,
    private auth: AuthService,
    private router: Router
  ) {
    this.chatForm = this.fb.group({
      content: [''],
    });
  }

  async ngOnInit() {
    // Get logged-in username
    // this.username = this.auth.getUsername()?.trim() || '';
    this.username = localStorage.getItem('username') || '';
    const me = this.username.trim().toLowerCase();

    // Get receiver username from route
    this.receiverUsername = this.route.snapshot.paramMap.get('username');
    if (!this.receiverUsername) {
      console.error('No receiver username provided.');
      return;
    }
    this.receiverUsername = this.receiverUsername.trim();

    // Ensure WebSocket connection
    await this.ws.connect();

    // Get or create private chat room
    this.chatService.getOrCreatePrivateChat(this.receiverUsername).subscribe({
      next: (res) => {
        const room = res.room || res;
        this.roomId = room.id || room._id || room.roomId;

        if (!this.roomId) {
          console.error('No valid roomId found:', res);
          return;
        }

        // Load previous messages
        this.loadMessagesFromDB();

        // Subscribe to WebSocket room
        this.ws.subscribeToRoom(this.roomId);

        // Listen for incoming messages
        const msgSub = this.ws.messageStream$.subscribe((msg) => {
          if (!msg) return;
          if (!msg.roomId || msg.roomId !== this.roomId) return;

          // ensure structure
          const senderUsername = (msg.senderUsername || msg.sender || '').trim();
          if (!senderUsername || !msg.content) return;

          // Dedup / merge logic:
          // 1) If incoming message contains clientId and we have an optimistic message with same clientId => replace
          // 2) Otherwise, try fallback dedupe by sender+content+timestamp proximity (5s)
          const incomingClientId = msg.clientId; // optional
          const incomingTimestamp = msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now();

          // try clientId match first
          let replaced = false;
          if (incomingClientId) {
            const idx = this.messages.findIndex((m) => m.clientId && m.clientId === incomingClientId);
            if (idx !== -1) {
              // replace optimistic with server message (keeping order)
              const isMine = senderUsername.toLowerCase() === me;
              this.messages[idx] = {
                ...msg,
                senderDisplayName: isMine ? 'You' : msg.senderUsername || msg.sender,
                isOwn: isMine,
                // keep clientId for traceability if needed
                clientId: incomingClientId,
              };
              replaced = true;
            }
          }

          if (!replaced) {
            // fallback dedupe: find optimistic message with same content + same sender + timestamp within 5s
            const fallbackIdx = this.messages.findIndex((m) => {
              if (!m.clientId && m.senderUsername) {
                const sameSender = (m.senderUsername || '').trim().toLowerCase() === senderUsername.toLowerCase();
                const sameContent = (m.content || '') === (msg.content || '');
                const t1 = new Date(m.timestamp || m.createdAt || 0).getTime();
                const diff = Math.abs(t1 - incomingTimestamp);
                return sameSender && sameContent && diff < 5000; // within 5 seconds
              }
              return false;
            });

            if (fallbackIdx !== -1) {
              const isMine = senderUsername.toLowerCase() === me;
              this.messages[fallbackIdx] = {
                ...msg,
                senderDisplayName: isMine ? 'You' : msg.senderUsername || msg.sender,
                isOwn: isMine
              };
              replaced = true;
            }
          }

          if (!replaced) {
            // no duplicate found — push normally
            const isMine = senderUsername.toLowerCase() === me;
            const messageWithDisplay = {
              ...msg,
              senderDisplayName: isMine ? 'You' : msg.senderUsername || msg.sender,
              isOwn: isMine,
            };
            this.messages.push(messageWithDisplay);
          }

          // scroll after updating messages
          setTimeout(() => this.scrollToBottom(), 100);
        });

        this.subs.push(msgSub);
      },
      error: (err) => console.error('Error loading private chat:', err),
    });
  }

  /** Load previous messages from DB and mark "You" */
  private loadMessagesFromDB() {
    console.log("loadMessagesFromDb: invoked")
    if (!this.roomId) return;
    const me = this.username.trim().toLowerCase();

    this.chatService.getMessages(this.roomId).subscribe({
      next: (msgs) => {
        this.messages = (msgs || [])
          .map((msg: any) => {
            const sender = (msg.senderUsername || msg.sender || '').trim().toLowerCase();
            const isMine = sender === me;
            console.log({
              ...msg,
              senderDisplayName: isMine ? 'You' : msg.senderUsername || msg.sender,
              isOwn: isMine,
              senderUsername: msg.senderUsername,
              sender:msg.sender,
              me:me,
            })
            return {
              ...msg,
              senderDisplayName: isMine ? 'You' : msg.senderUsername || msg.sender,
              isOwn: isMine
            };
          })
          .sort((a: any, b: any) => {
            const t1 = new Date(a.timestamp || 0).getTime();
            const t2 = new Date(b.timestamp || 0).getTime();
            return t1 - t2;
          });

        setTimeout(() => this.scrollToBottom(), 200);
      },
      error: (err) => console.error('Error fetching messages:', err),
    });
  }

  /** Send message */
  sendMessage() {
    const content = this.chatForm.value.content?.trim();
    if (!content || !this.roomId || !this.receiverUsername) return;

    // create a client-side id so we can match the server echo (if server echoes unknown fields)
    const clientId = `c_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // optimistic message (added immediately)
    const optimisticMsg = {
      clientId,
      roomId: this.roomId,
      senderUsername: this.username,
      receiverUsername: this.receiverUsername,
      content,
      timestamp: new Date().toISOString(), // local timestamp
      senderDisplayName: 'You',
      isOwn: true,
    };

    // send via WebSocket including clientId — server may or may not preserve it
    this.ws.sendMessage(this.roomId, content, this.receiverUsername.trim(), clientId); 
    // Expected 2-3 arguments, but got 4.ts(2554)

  
    // push optimistic message (so UI updates instantly)
    // this.messages.push(optimisticMsg);
    console.log(optimisticMsg)
    this.chatForm.reset();
    setTimeout(() => this.scrollToBottom(), 100);
  }

  private scrollToBottom() {
    const el = document.querySelector('.chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }


   goBack() {
    this.router.navigate(['/chats']); // 👈 navigate back to chat list
  }


  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
