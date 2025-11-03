import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  message = '';
  error = '';

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  get f() {
    return this.form.controls;
  }

  submit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.error = '';
    this.message = '';

    this.http.post(`${environment.apiUrl}/auth/register`, this.form.value).subscribe({
      next: () => {
        this.message = 'Registration successful! Redirecting to login...';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.error = err.error?.message || 'Registration failed!';
      },
      complete: () => (this.loading = false)
    });
  }
}
