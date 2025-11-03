import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

/**
 * Automatically attaches JWT token to all requests
 * except /auth endpoints.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  let token = authService.getToken();

  // 🔒 Trim and validate token
  token = token ? token.trim() : '';

  // ⛔ Skip for auth endpoints (login/register)
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  // ✅ Attach header only if token is valid (non-empty)
  if (token && token !== 'null' && token !== 'undefined') {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  // If no valid token, continue without modifying
  return next(req);
};
