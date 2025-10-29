import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../../core/services/chat.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-modify-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './modify-group.html',
  styleUrl: './modify-group.css'
})
export class ModifyGroupComponent implements OnInit {
  groupId = '';
  users: any[] = [];
  members: string[] = [];
  admins: string[] = [];
  loading = false;
  message = '';
  form!: FormGroup; // ✅ define here, initialize later

  constructor(
    private fb: FormBuilder,
    private chat: ChatService,
    private route: ActivatedRoute,
    public router: Router
  ) {}

  ngOnInit() {
    this.groupId = this.route.snapshot.paramMap.get('id') ?? '';

    // ✅ Initialize the form properly here
    this.form = this.fb.group({
      newMembers: this.fb.array([])
    });

    this.loadUsers();
    this.loadGroupDetails();
  }

  loadUsers() {
    this.chat.getAllUsers().subscribe({
      next: (res) => (this.users = res),
      error: (err) => console.error(err)
    });
  }

  loadGroupDetails() {
    if (!this.groupId) return;
    this.chat.getGroupDetails(this.groupId).subscribe({ //Property 'getGroupDetails' does not exist on type 'ChatService'.ts(2339)

      next: (group) => {
        this.members = group.members || [];
        this.admins = group.admins || [];
      },
      error: (err) => console.error(err)
    });
  }

  onMemberToggle(username: string, checked: boolean) {
    const arr = this.form.get('newMembers') as FormArray;
    if (checked) arr.push(this.fb.control(username));
    else {
      const i = arr.controls.findIndex(c => c.value === username);
      if (i !== -1) arr.removeAt(i);
    }
  }

  addMembers() {
    if (!this.groupId) return;
    const payload = {
      groupId: this.groupId,
      memberUsernames: this.form.value.newMembers
    };

    this.loading = true;
    this.chat.addMembers(payload).subscribe({
      next: () => {
        this.message = '✅ Members added successfully!';
        this.loadGroupDetails();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.message = '❌ Failed to add members.';
        this.loading = false;
      }
    });
  }

  removeMember(username: string) {
    const adminUsername = localStorage.getItem('username')!;
    this.chat.removeMember(this.groupId, adminUsername, username).subscribe({
      next: () => {
        this.message = `✅ Removed ${username}`;
        this.loadGroupDetails();
      },
      error: (err) => console.error(err)
    });
  }

  promoteToAdmin(username: string) {
    const adminUsername = localStorage.getItem('username')!;
    this.chat.assignAdmin(this.groupId, adminUsername, username).subscribe({
      next: () => {
        this.message = `⭐ Promoted ${username} to admin`;
        this.loadGroupDetails();
      },
      error: (err) => console.error(err)
    });
  }
}
