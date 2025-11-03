import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
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

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private chatService: ChatService,
    private socket: WsService,
    private auth: AuthService
  ) {
    this.chatForm = this.fb.group({
      content: ['']
    });
  }

  ngOnInit() {
    this.username = this.auth.getUsername()?.trim() || null;
    const me = this.username?.toLowerCase() || '';

    const roomParam = this.route.snapshot.paramMap.get('roomId');
    const userParam = this.route.snapshot.paramMap.get('username');

    if (roomParam) {
      // ✅ Group chat
      this.roomId = roomParam;
      this.isGroup = true;

      // 🧩 Fetch group info
      this.chatService.getRoomById(roomParam).subscribe({
        next: (room) => (this.groupName = room?.name || 'Group Chat'),
        error: (err) => console.error('Error fetching group name:', err)
      });

      this.loadGroupMessages(roomParam);
      this.socket.subscribeToRoom(roomParam);
    } else if (userParam) {
      // ✅ Private chat
      this.receiverUsername = userParam.trim().toLowerCase();
      this.isGroup = false;
      this.loadPrivateChat(this.receiverUsername);
    }

    // 💬 Listen for real-time messages
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

  /** 🧩 Load group messages */
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
      error: (err) => console.error('❌ Error loading group messages:', err)
    });
  }

  /** 💬 Load private chat messages */
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
        this.socket.subscribeToRoom(this.roomId!);
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => console.error('❌ Error loading private chat:', err)
    });
  }

  /** 🚀 Send message */
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

  /** 📜 Scroll to bottom */
  private scrollToBottom() {
    const el = document.querySelector('.chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  trackByMessage(index: number, msg: any): string {
    return msg.id || index.toString();
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
