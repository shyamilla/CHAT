import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { HttpClientModule } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    // ✅ Properly initialize the reactive form
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  // ✅ Use bracket syntax to avoid TS4111 ("must be accessed with ['email']")
  get f() {
    return this.form.controls;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    this.auth
      .forgotPassword({ email: this.form.value.email })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          // Redirect to reset screen with email param
          this.router.navigate(['/reset-password'], {
            queryParams: { email: this.form.value.email }
          });
        },
        error: (err) => {
          this.error = err?.error?.error ?? 'Failed to send OTP';
        }
      });
  }
}
