import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';

import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements AfterViewInit {
  @ViewChild('googleButton', { static: false })
  googleButton!: ElementRef;

  constructor(public auth: Auth) {}

  ngAfterViewInit(): void {
    this.auth.renderButton(this.googleButton.nativeElement);
  }
}