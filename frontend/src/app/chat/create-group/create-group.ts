import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormArray, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatService } from '../../core/services/chat.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-create-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './create-group.html'
})
export class CreateGroupComponent implements OnInit {
  users: any[] = [];
  loading = false;
  message = '';
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private chat: ChatService,
    public router: Router
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      groupName: ['', [Validators.required, Validators.minLength(3)]],
      members: this.fb.array([], [Validators.required])
    });

    this.loadUsers();
  }

  loadUsers() {
    this.chat.getAllUsers().subscribe({
      next: (res) => (this.users = res),
      error: (err) => console.error(err)
    });
  }

  onMemberToggle(username: string, checked: boolean) {
    const membersArray = this.form.get('members') as FormArray;
    if (checked) membersArray.push(this.fb.control(username));
    else {
      const idx = membersArray.controls.findIndex(c => c.value === username);
      if (idx !== -1) membersArray.removeAt(idx);
    }
  }

  createGroup() {
    if (this.form.invalid) return;
    this.loading = true;

    const payload = {
      name: this.form.value.groupName,
      creatorUsername: localStorage.getItem('username'),
      memberUsernames: this.form.value.members
    };

    this.chat.createGroup(payload).subscribe({
      next: () => {
        this.message = '✅ Group created successfully!';
        setTimeout(() => this.router.navigate(['/chats']), 1000);
      },
      error: (err) => {
        console.error(err);
        this.message = '❌ Failed to create group.';
        this.loading = false;
      }
    });
  }
}
