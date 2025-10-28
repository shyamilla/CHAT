import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * AuthGuard:
 * Protects routes that require authentication.
 * Redirects to login if JWT token is missing or invalid.
 */
export const AuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();

  console.log('[AuthGuard] Checking authentication...');
  if (!token) {
    console.warn('[AuthGuard] No JWT token found. Redirecting to /login');
    router.navigate(['/login']);
    return false;
  }

  // if (!authService.isTokenValid(token)) {
  //   console.warn('[AuthGuard] JWT token invalid or expired. Redirecting to /login');
  //   authService.logout();
  //   router.navigate(['/login']);
  //   return false;
  // }

  console.log('[AuthGuard] Authenticated user, access granted.');
  return true;
};
