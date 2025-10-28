import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css']
})
export class ResetPasswordComponent {
  form: FormGroup;
  loading = false;
  error = '';
  message = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {
    const email = this.route.snapshot.queryParamMap.get('email') || '';

    this.form = this.fb.group({
      email: [email, [Validators.required, Validators.email]],
      otp: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(1)]],
    });
  }

  get f() {
    return this.form.controls;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.message = '';

    this.http.post(`${environment.apiUrl}/auth/reset`, this.form.value).subscribe({
      next: (res: any) => {
        this.message = res?.message || 'Password reset successful! Redirecting...';
        setTimeout(() => this.router.navigate(['/auth/login']), 1500);
      },
      error: (err) => {
        console.error('Reset error:', err);
        this.error = err.error?.error || err.error?.message || 'Reset failed!';
      },
      complete: () => (this.loading = false),
    });
  }
}
