import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { WsService } from '../../core/services/chat-socket';
import { Subscription } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './chat-room.html'
})
export class ChatRoomComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  roomId = '';
  username = localStorage.getItem('username') ?? '';
  messages: any[] = [];
  loading = true;

  messageForm; // declare first
  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private chat: ChatService,
    private ws: WsService
  ) {
    // ✅ Initialize form inside constructor
    this.messageForm = this.fb.group({
      content: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('roomId') ?? '';

    if (!this.roomId) {
      console.error('No roomId found in route');
      return;
    }

    // ✅ Fetch chat history
    this.loadMessages();

    // ✅ Subscribe to live WebSocket updates
    this.ws.subscribeToGroup(this.roomId, (msg) => {
      this.messages.push(msg);
      this.scrollToBottom();
    });
  }

  loadMessages() {
    this.chat.getMessages(this.roomId).subscribe({
      next: (res) => {
        this.messages = res || [];
        this.loading = false;
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => {
        console.error('Error loading messages:', err);
        this.loading = false;
      }
    });
  }

  sendMessage() {
    const content = this.messageForm.value.content?.trim();
    if (!content) return;

    const msg = {
      roomId: this.roomId,
      senderUsername: this.username,
      content
    };

    // ✅ Send via WebSocket
    this.ws.sendMessage('/app/chat.sendMessage', msg);

    // ✅ Optimistic UI update
    this.messages.push({
      ...msg,
      timestamp: new Date().toISOString()
    });

    this.messageForm.reset();
    this.scrollToBottom();
  }

  scrollToBottom() {
    try {
      setTimeout(() => {
        if (this.scrollContainer)
          this.scrollContainer.nativeElement.scrollTop =
            this.scrollContainer.nativeElement.scrollHeight;
      }, 50);
    } catch (err) {
      console.warn('Scroll failed:', err);
    }
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
