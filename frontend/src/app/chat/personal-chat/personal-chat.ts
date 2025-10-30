import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { WsService } from '../../core/services/chat-socket';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-personal-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './personal-chat.html',
  styleUrls: ['./personal-chat.css']
})
export class PersonalChatComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private chatService = inject(ChatService);
  private ws = inject(WsService);

  form = this.fb.group({
    message: ['']
  });

  roomId = '';
  me = '';
  otherUser = '';
  messages: any[] = [];
  sub?: Subscription;

  ngOnInit() {
    this.otherUser = this.route.snapshot.paramMap.get('username')!;
    this.me = localStorage.getItem('username') || '';

    // get or create chat room
    this.chatService.getOrCreatePrivateChat(this.otherUser).subscribe({
    

      next: (room) => {
        this.roomId = room.name; // use backend’s lexicographic name
        this.loadHistory();
        this.subscribePrivate();
      },
      error: (err) => console.error('Error getting private chat:', err)
    });
  }

  loadHistory() {
    this.chatService.getMessages(this.roomId).subscribe({
      next: (res) => {
        this.messages = res;
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => console.error('Error loading messages:', err)
    });
  }

  subscribePrivate() {
    this.ws.subscribePrivate((msg: any) => {
      if (msg.roomId === this.roomId) {
        this.messages.push(msg);
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  sendMessage() {
    const content = this.form.value.message?.trim();
    if (!content) return;
    const msg = {
      roomId: this.roomId,
      senderUsername: this.me,
      content
    };

    this.ws.sendPrivate(msg);

    this.form.reset();
  }

  scrollToBottom() {
    const el = document.getElementById('messageList');
    if (el) el.scrollTop = el.scrollHeight;
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
