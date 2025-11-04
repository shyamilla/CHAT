import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService } from '../../core/services/chat.service';
import { WsService } from '../../core/services/chat-socket';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './chat-room.html',
  styleUrls: ['./chat-room.css']
})
export class ChatRoomComponent implements OnInit, OnDestroy {
  roomId: string | null = null;
  receiverUsername: string | null = null;
  groupName: string | null = null;
  isGroup = false;
  messages: any[] = [];
  username: string | null = null;
  chatForm: FormGroup;
  private subs: Subscription[] = [];
  private subscribedRoom: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private chatService: ChatService,
    private socket: WsService,
    private auth: AuthService,
    private router: Router,      // ✅ must inject Router here
  ) {
    this.chatForm = this.fb.group({
      content: ['']
    });
  }

  ngOnInit() {
    this.username = localStorage.getItem('username');
    const me = this.username?.toLowerCase() || '';
    console.log('[Init] Username:', this.username);

    const urlSegments = this.route.snapshot.url;
    if (urlSegments.length >= 3) {
      this.roomId = urlSegments[2].path;
      console.log('[Init] Detected Room mode, roomId:', this.roomId);
    }

    let userParamRaw: string | null = null;
    if (this.route.snapshot.paramMap.has('userParam')) {
      userParamRaw = this.route.snapshot.paramMap.get('userParam');
    } else if (this.route.snapshot.queryParamMap.has('userParam')) {
      userParamRaw = this.route.snapshot.queryParamMap.get('userParam');
    }

    if (this.roomId) {
      this.isGroup = true;
      console.log('[Init] Mode: Group chat, roomId:', this.roomId);

      this.chatService.getRoomById(this.roomId).subscribe({
        next: (room) => {
          this.groupName = room?.name || 'Group Chat';
        },
        error: (err) => console.error('[Group info] Error:', err)
      });

      this.loadGroupMessages(this.roomId);
      this.subscribeToRoomOnce(this.roomId);

    } else if (userParamRaw && userParamRaw.trim().length > 0) {
      this.receiverUsername = userParamRaw.trim().toLowerCase();
      this.isGroup = false;
      console.log('[Init] Mode: Private chat, receiverUsername:', this.receiverUsername);
      this.loadPrivateChat(this.receiverUsername);
    } else {
      console.warn('[Init] Unable to determine chat type (group/private). Check route params!');
    }

    // Listen for real-time messages only once
    const msgSub = this.socket.messages$.subscribe((msg: any) => {
      if (!msg) return;

      const sender = (msg.senderUsername || msg.sender || '').trim().toLowerCase();
      const receiver = (msg.receiverUsername || msg.receiver || '').trim().toLowerCase();

      const isGroupMsg = this.isGroup && msg.roomId === this.roomId;
      const isPrivateMsg =
        !this.isGroup &&
        ((sender === (this.receiverUsername || '').toLowerCase() && receiver === me) ||
          (sender === me && receiver === (this.receiverUsername || '').toLowerCase()));

      if (isGroupMsg || isPrivateMsg) {
        // Avoid duplicates
        const alreadyExists = this.messages.some(
          (m) =>
            (m.id && msg.id && m.id === msg.id) ||
            (m.timestamp === msg.timestamp && m.senderUsername === msg.senderUsername)
        );
        if (alreadyExists) return;

        const displayMsg = {
          ...msg,
          senderDisplayName: sender === me ? 'You' : msg.senderUsername || msg.sender,
          isOwn: sender === me
        };

        this.messages.push(displayMsg);
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
    this.subs.push(msgSub);
  }

  private loadGroupMessages(roomId: string) {
    const me = this.username?.toLowerCase() || '';
    this.chatService.getMessages(roomId).subscribe({
      next: (msgs) => {
        this.messages = (msgs || []).map((m: any) => {
          const sender = (m.senderUsername || m.sender || '').trim().toLowerCase();
          return {
            ...m,
            senderDisplayName: sender === me ? 'You' : m.senderUsername || m.sender,
            isOwn: sender === me
          };
        });
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => console.error('[GroupMessages] Error loading:', err)
    });
  }

  private loadPrivateChat(otherUser: string) {
    const me = this.username?.toLowerCase() || '';
    this.chatService.getOrCreatePrivateChat(otherUser).subscribe({
      next: (res) => {
        this.roomId = res.room.id;
        this.messages = (res.messages || []).map((m: any) => {
          const sender = (m.senderUsername || m.sender || '').trim().toLowerCase();
          return {
            ...m,
            senderDisplayName: sender === me ? 'You' : m.senderUsername || m.sender,
            isOwn: sender === me
          };
        });
        this.subscribeToRoomOnce(this.roomId!);
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => console.error('[PrivateChat] Error:', err)
    });
  }

  private subscribeToRoomOnce(roomId: string) {
    if (this.subscribedRoom === roomId) {
      console.log('[Socket] Already subscribed to room:', roomId);
      return;
    }
    this.socket.subscribeToRoom(roomId);
    this.subscribedRoom = roomId;
    console.log('[Socket] Subscribed to room:', roomId);
  }

  sendMessage() {
    const content = this.chatForm.value.content?.trim();
    if (!content || !this.roomId) return;

    if (this.isGroup) {
      this.socket.sendMessage(this.roomId, content);
    } else {
      this.socket.sendMessage(this.roomId, content, this.receiverUsername!);
    }

    this.chatForm.reset();
  }

  private scrollToBottom() {
    const el = document.querySelector('.chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  trackByMessage(index: number, msg: any): string {
    return msg.id || index.toString();
  }


   goBack() {
    this.router.navigate(['/chats']); // 👈 navigate back to chat list
  }

  ngOnDestroy() {
    console.log('[ngOnDestroy] Unsubscribing from', this.subs.length, 'subscriptions');
    this.subs.forEach((s) => s.unsubscribe());
    this.subscribedRoom = null;
  }
}
