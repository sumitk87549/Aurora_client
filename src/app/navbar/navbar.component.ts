import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CartService } from '../services/cart.service';
import { UserService, UserProfile } from '../services/user.service';
import { ThemeService } from '../services/theme.service';
import { CommonModule, NgIf, NgClass, AsyncPipe } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, NgIf, NgClass, RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  isMobileMenuOpen = false;
  isScrolled = false;
  cartItemCount = 0;
  isDarkMode = false;

  // User profile info
  userName: string = '';
  userAvatar: string = '🕯️';
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    public authService: AuthService,
    private cartService: CartService,
    private userService: UserService,
    public themeService: ThemeService
  ) { }

  ngOnInit(): void {
    // Subscribe to theme changes
    const themeSub = this.themeService.theme$.subscribe(theme => {
      this.isDarkMode = theme === 'dark';
    });
    this.subscriptions.push(themeSub);

    if (this.isLoggedIn()) {
      this.loadUserProfile();
      this.loadCartCount();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadUserProfile(): void {
    // Initial fetch
    this.userService.refreshProfile();

    // Subscribe to updates
    const sub = this.userService.userProfile$.subscribe(profile => {
      if (profile) {
        this.userName = profile.firstName || 'User';
        this.userAvatar = profile.profileEmoji || '🕯️';
      } else {
        this.userName = 'User';
        this.userAvatar = '🕯️';
      }
    });
    this.subscriptions.push(sub);
  }

  loadCartCount(): void {
    const sub = this.cartService.getCart().subscribe({
      next: (cart) => {
        this.cartItemCount = cart ? cart.cartItems.reduce((acc: number, item: any) => acc + item.quantity, 0) : 0;
      },
      error: () => {
        this.cartItemCount = 0;
      }
    });
    this.subscriptions.push(sub);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  logout() {
    this.authService.logout();
    this.closeMobileMenu();
    this.userName = '';
    this.userAvatar = '🕯️';
    this.router.navigate(['/']);
  }
}
