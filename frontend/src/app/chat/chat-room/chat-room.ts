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
    // this.username = this.auth.getUsername()?.trim() || null;
    
    // do not change this part of code to access username from local storage
    this.username = localStorage.getItem('username')

    // further if the username is same as sender name, the display should be 'you' rather than the current username
    
    const me = this.username?.toLowerCase() || '';
    console.log('[Init] Username:', this.username);

    const urlSegments = this.route.snapshot.url;
    console.log('[Init] ActivatedRoute urlSegments:', urlSegments);

    if (urlSegments.length >= 3) {
      this.roomId = urlSegments[2].path;
      console.log('[Init] Detected Room mode, roomId:', this.roomId);
    } else {
      console.log('[Init] Not enough URL segments for roomId.');
    }

    // Attempt to get userParam from either route params or query params
    let userParamRaw: string | null = null;
    if (this.route.snapshot.paramMap.has('userParam')) {
      userParamRaw = this.route.snapshot.paramMap.get('userParam');
    } else if (this.route.snapshot.queryParamMap.has('userParam')) {
      userParamRaw = this.route.snapshot.queryParamMap.get('userParam');
    }
    console.log('[Init] userParam:', userParamRaw);

    if (this.roomId) {
      this.isGroup = true;
      console.log('[Init] Mode: Group chat, roomId:', this.roomId);

      // Fetch group info
      this.chatService.getRoomById(this.roomId).subscribe({
        next: (room) => {
          this.groupName = room?.name || 'Group Chat';
          console.log('[Group info] Loaded:', this.groupName, room);
        },
        error: (err) => console.error('[Group info] Error:', err)
      });

      this.loadGroupMessages(this.roomId);
      this.socket.subscribeToRoom(this.roomId);
      console.log('[WebSocket] Subscribed to group room:', this.roomId);

    } else if (userParamRaw && userParamRaw.trim().length > 0) {
      // userParam is defined and non-empty string
      this.receiverUsername = userParamRaw.trim().toLowerCase();
      this.isGroup = false;
      console.log('[Init] Mode: Private chat, receiverUsername:', this.receiverUsername);

      this.loadPrivateChat(this.receiverUsername);
    } else {
      console.warn('[Init] Unable to determine chat type (group/private). Check route params!');
    }

    // Listen for real-time messages
    const msgSub = this.socket.messages$.subscribe((msg: any) => {
      console.log('[Socket] Message arrived:', msg);
      if (!msg) {
        console.warn('[Socket] Empty message received.');
        return;
      }

      const sender = (msg.senderUsername || msg.sender || '').trim().toLowerCase();
      const receiver = (msg.receiverUsername || msg.receiver || '').trim().toLowerCase();

      const isGroupMsg = this.isGroup && msg.roomId === this.roomId;
      const isPrivateMsg =
        !this.isGroup &&
        ((sender === (this.receiverUsername || '').toLowerCase() && receiver === me) ||
          (sender === me && receiver === (this.receiverUsername || '').toLowerCase()));

      console.log('[Socket] isGroupMsg:', isGroupMsg, 'isPrivateMsg:', isPrivateMsg);

      if (isGroupMsg || isPrivateMsg) {
        const displayMsg = {
          ...msg,
          senderDisplayName: sender === me ? 'You' : msg.senderUsername || msg.sender,
          isOwn: sender === me
        };

        this.messages.push(displayMsg);
        setTimeout(() => this.scrollToBottom(), 100);
        console.log('[Socket] Message pushed:', displayMsg, 'Total messages:', this.messages.length);
      }
    });
    this.subs.push(msgSub);
    console.log('[Init] Socket message subscription added.');
  }

  /** 🧩 Load group messages */
  private loadGroupMessages(roomId: string) {
    const me = this.username?.toLowerCase() || '';
    console.log('[GroupMessages] Loading for room:', roomId);
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
        console.log('[GroupMessages] Loaded messages:', this.messages.length, this.messages);
      },
      error: (err) => console.error('[GroupMessages] Error loading:', err)
    });
  }

  /** 💬 Load private chat messages */
  private loadPrivateChat(otherUser: string) {
    const me = this.username?.toLowerCase() || '';
    console.log('[PrivateChat] Loading for:', otherUser);
    this.chatService.getOrCreatePrivateChat(otherUser).subscribe({
      next: (res) => {
        console.log('[PrivateChat] API response:', res);
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
        console.log('[PrivateChat] Messages loaded:', this.messages.length, this.messages);
      },
      error: (err) => console.error('[PrivateChat] Error:', err)
    });
  }

  /** 🚀 Send message */
  sendMessage() {
    const content = this.chatForm.value.content?.trim();
    if (!content || !this.roomId) {
      console.warn('[SendMessage] No content or roomId; aborting.');
      return;
    }

    if (this.isGroup) {
      console.log('[SendMessage] To group:', this.roomId, 'content:', content);
      this.socket.sendMessage(this.roomId, content);
    } else {
      console.log('[SendMessage] To user:', this.receiverUsername, 'room:', this.roomId, 'content:', content);
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
    console.log('[ngOnDestroy] Unsubscribing from', this.subs.length, 'subscriptions');
    this.subs.forEach((s) => s.unsubscribe());
  }
}
