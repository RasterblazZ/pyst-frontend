import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

declare const google: any;

@Injectable({
  providedIn: 'root'
})
export class Auth {
  user = signal<any>(null);

  constructor(private router: Router) {
    const savedUser = localStorage.getItem('auth_user');

    if (savedUser) {
      this.user.set(JSON.parse(savedUser));
    }
  }

  initializeGoogle(clientId: string) {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        const payload = this.decodeToken(response.credential);

        localStorage.setItem(
          'auth_user',
          JSON.stringify(payload)
        );

        this.user.set(payload);

        this.router.navigate(['/dashboard']);
      }
    });
  }

  renderButton(element: HTMLElement) {
    google.accounts.id.renderButton(element, {
      theme: 'outline',
      size: 'large',
      shape: 'pill'
    });
  }

  logout() {
    google.accounts.id.disableAutoSelect();

    localStorage.removeItem('auth_user');

    this.user.set(null);

    this.router.navigate(['/login']);
  }

  private decodeToken(token: string) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  }
}