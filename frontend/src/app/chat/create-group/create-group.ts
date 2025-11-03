import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormArray, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatService } from '../../core/services/chat.service';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-create-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './create-group.html',
  styleUrls: ['./create-group.css'] // ✅ should be styleUrls (plural)
})
export class CreateGroupComponent implements OnInit {
  users: any[] = [];
  loading = false;
  message = '';
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private chat: ChatService,
    private auth: AuthService, // ✅ to get username from JWT
    public router: Router
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      groupName: ['', [Validators.required, Validators.minLength(3)]],
      members: this.fb.array([], [Validators.required])
    });

    this.loadUsers();
  }

  /** ✅ Load available users */
  loadUsers() {
    this.chat.searchUsers('').subscribe({
      next: (res) => (this.users = res || []),
      error: (err) => console.error('❌ Failed to load users:', err)
    });
  }

  /** ✅ Handle checkbox toggle */
  onMemberToggle(username: string, checked: boolean) {
    const membersArray = this.form.get('members') as FormArray;
    if (checked) {
      membersArray.push(this.fb.control(username));
    } else {
      const idx = membersArray.controls.findIndex(c => c.value === username);
      if (idx !== -1) membersArray.removeAt(idx);
    }
  }

  /** ✅ Create a group chat */
  createGroup() {
    if (this.form.invalid) return;
    this.loading = true;

    const currentUser = this.decodeUsername();

    const payload = {
      name: this.form.value.groupName,
      creatorUsername: currentUser,
      memberUsernames: this.form.value.members
    };

    this.chat.createGroup(
  this.form.value.groupName,
  this.form.value.members
).subscribe({
  next: () => {
    this.message = '✅ Group created successfully!';
    setTimeout(() => this.router.navigate(['/chats']), 800);
  },
  error: (err) => {
    console.error('❌ Failed to create group:', err);
    this.message = '❌ Failed to create group.';
    this.loading = false;
  }
});

  }

  /** ✅ Decode username from JWT */
  private decodeUsername(): string {
    const token = this.auth.getToken();
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.username || '';
    } catch {
      return '';
    }
  }
}
