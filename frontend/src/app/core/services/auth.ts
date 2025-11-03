import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private base = environment.apiUrl?.replace(/\/$/, '') ?? 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  register(payload: { username: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.base}/auth/register`, payload);
  }

  login(payload: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.base}/auth/login`, payload);
  }

  forgotPassword(payload: { email: string }): Observable<any> {
    return this.http.post(`${this.base}/auth/forgot`, payload);
  }

  resetPassword(payload: { email: string; otp: string; newPassword: string }): Observable<any> {
    return this.http.post(`${this.base}/auth/reset`, payload);
  }

  saveToken(token: string) {
    localStorage.setItem('jwt_token', token);
  }

  getToken(): string | null {
    
    return localStorage.getItem('jwt_token');
  }

  logout() {
    localStorage.removeItem('jwt_token');
  }



   getUsername(): string | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log(payload);
      // Use your backend claim (usually `sub` or `username`)
      return payload.username || payload.sub || null;
    } catch (err) {
      console.error('❌ Error decoding JWT:', err);
      return null;
    }
  }
}
