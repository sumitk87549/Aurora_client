import { Component, OnInit, OnDestroy, Renderer2, Inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { CandleService, Candle, CandleImage } from '../services/candle.service';
import { CartService, Cart, CartItem } from '../services/cart.service';
import { WishlistService } from '../services/wishlist.service';
import { ToastService } from '../services/toast.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { API_URL } from '../config/api.config';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class HomeComponent implements OnInit, OnDestroy {
  featuredCandles: Candle[] = [];
  isLoadingFeatured: boolean = false;

  // Cart tracking
  cartItems: Map<number, CartItem> = new Map();
  updatingCart: Set<number> = new Set();

  // Wishlist tracking
  wishlistItemIds: Set<number> = new Set();
  updatingWishlist: Set<number> = new Set();

  // Image carousel
  imageIndices: { [key: number]: number } = {};

  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private meta: Meta,
    private title: Title,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private authService: AuthService,
    private candleService: CandleService,
    private cartService: CartService,
    private wishlistService: WishlistService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    // Set SEO meta tags
    this.title.setTitle('Aurora Flames - Premium Handmade Candles');
    this.meta.updateTag({ name: 'description', content: 'Discover exquisite handmade candles at Aurora Flames. Shop premium scented candles, artisanal wax creations, and unique fragrance blends for your home.' });
    this.meta.updateTag({ name: 'keywords', content: 'handmade candles, scented candles, premium candles, artisanal wax, fragrance candles, Aurora Flames' });
    this.meta.updateTag({ property: 'og:title', content: 'Aurora Flames - Premium Handmade Candles' });
    this.meta.updateTag({ property: 'og:description', content: 'Discover exquisite handmade candles at Aurora Flames. Shop premium scented candles and unique fragrance blends.' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: 'https://auroraflames.com' });
    this.meta.updateTag({ property: 'og:image', content: 'https://auroraflames.com/assets/logo-light-mode.png' });

    // Add structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Aurora Flames",
      "url": "https://auroraflames.com",
      "logo": "https://auroraflames.com/assets/logo-light-mode.png",
      "description": "Premium handmade scented candles and artisanal wax creations",
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+91-9876543210",
        "contactType": "customer service",
        "availableLanguage": "English"
      },
      "sameAs": [
        "https://www.instagram.com/auroraflames"
      ]
    };

    const script = this.renderer.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    this.renderer.appendChild(this.document.head, script);

    this.loadFeaturedCandles();
    if (this.isLoggedIn()) {
      this.loadCart();
      this.loadWishlist();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadFeaturedCandles(): void {
    this.isLoadingFeatured = true;
    const sub = this.candleService.getFeaturedCandles().subscribe({
      next: (candles) => {
        this.featuredCandles = candles;
        this.isLoadingFeatured = false;
      },
      error: () => {
        this.isLoadingFeatured = false;
      }
    });
    this.subscriptions.push(sub);
  }

  loadCart(): void {
    const sub = this.cartService.getCart().subscribe({
      next: (cart) => {
        this.cartItems.clear();
        if (cart?.cartItems) {
          cart.cartItems.forEach(item => {
            if (item.candle) {
              this.cartItems.set(item.candle.id, item);
            }
          });
        }
      }
    });
    this.subscriptions.push(sub);
  }

  loadWishlist(): void {
    const sub = this.wishlistService.getWishlist().subscribe({
      next: (wishlist) => {
        this.wishlistItemIds.clear();
        if (wishlist?.wishlistItems) {
          wishlist.wishlistItems.forEach(item => {
            this.wishlistItemIds.add(item.candle.id);
          });
        }
      }
    });
    this.subscriptions.push(sub);
  }

  // Cart methods
  getCartQuantity(candleId: number): number {
    const item = this.cartItems.get(candleId);
    return item ? item.quantity : 0;
  }

  isInCart(candleId: number): boolean {
    return this.cartItems.has(candleId);
  }

  addToCart(candle: Candle): void {
    if (!this.authService.isLoggedIn()) {
      this.toastService.warning('Please login to add items to cart');
      return;
    }

    this.updatingCart.add(candle.id);
    this.cartService.addToCart(candle.id, 1).subscribe({
      next: (cart) => {
        this.updateCartFromResponse(cart);
        this.toastService.success('Added to cart!');
        this.updatingCart.delete(candle.id);
      },
      error: () => {
        this.toastService.error('Failed to add to cart');
        this.updatingCart.delete(candle.id);
      }
    });
  }

  updateQuantity(candle: Candle, delta: number): void {
    const currentItem = this.cartItems.get(candle.id);
    if (!currentItem) return;

    const newQuantity = currentItem.quantity + delta;

    if (newQuantity <= 0) {
      this.removeFromCart(candle);
      return;
    }

    this.updatingCart.add(candle.id);
    this.cartService.updateCartItem(currentItem.id, newQuantity).subscribe({
      next: (cart) => {
        this.updateCartFromResponse(cart);
        this.updatingCart.delete(candle.id);
      },
      error: () => {
        this.toastService.error('Failed to update quantity');
        this.updatingCart.delete(candle.id);
      }
    });
  }

  removeFromCart(candle: Candle): void {
    const currentItem = this.cartItems.get(candle.id);
    if (!currentItem) return;

    this.updatingCart.add(candle.id);
    this.cartService.removeFromCart(currentItem.id).subscribe({
      next: (cart) => {
        this.updateCartFromResponse(cart);
        this.updatingCart.delete(candle.id);
      },
      error: () => {
        this.toastService.error('Failed to remove from cart');
        this.updatingCart.delete(candle.id);
      }
    });
  }

  private updateCartFromResponse(cart: Cart): void {
    this.cartItems.clear();
    if (cart?.cartItems) {
      cart.cartItems.forEach(item => {
        this.cartItems.set(item.candle.id, item);
      });
    }
  }

  isUpdatingCart(candleId: number): boolean {
    return this.updatingCart.has(candleId);
  }

  // Wishlist methods
  isInWishlist(candleId: number): boolean {
    return this.wishlistItemIds.has(candleId);
  }

  toggleWishlist(candle: Candle, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (!this.authService.isLoggedIn()) {
      this.toastService.warning('Please login to manage wishlist');
      return;
    }

    this.updatingWishlist.add(candle.id);

    if (this.isInWishlist(candle.id)) {
      this.wishlistService.getWishlist().subscribe({
        next: (wishlist) => {
          const item = wishlist.wishlistItems.find(i => i.candle.id === candle.id);
          if (item) {
            this.wishlistService.removeFromWishlist(item.id).subscribe({
              next: () => {
                this.wishlistItemIds.delete(candle.id);
                this.toastService.info('Removed from wishlist');
                this.updatingWishlist.delete(candle.id);
              },
              error: () => {
                this.updatingWishlist.delete(candle.id);
              }
            });
          }
        }
      });
    } else {
      this.wishlistService.addToWishlist(candle.id).subscribe({
        next: () => {
          this.wishlistItemIds.add(candle.id);
          this.toastService.success('Added to wishlist!');
          this.updatingWishlist.delete(candle.id);
        },
        error: () => {
          this.updatingWishlist.delete(candle.id);
        }
      });
    }
  }

  isUpdatingWishlist(candleId: number): boolean {
    return this.updatingWishlist.has(candleId);
  }

  // Image carousel
  getCurrentImageUrl(candle: Candle): string {
    if (!candle.images || candle.images.length === 0) {
      return '/assets/default-candle.jpg';
    }
    const index = this.imageIndices[candle.id] || 0;
    const image = candle.images[index];
    return this.getImageUrl(image);
  }

  getImageUrl(image?: CandleImage): string {
    if (!image || !image.id) return '/assets/default-candle.jpg';
    if (image.imageData) return image.imageData;
    return `${API_URL}/candles/images/${image.id}`;
  }

  nextImage(candle: Candle, event: Event): void {
    event.stopPropagation();
    if (!candle.images || candle.images.length <= 1) return;
    const currentIndex = this.imageIndices[candle.id] || 0;
    this.imageIndices[candle.id] = (currentIndex + 1) % candle.images.length;
  }

  prevImage(candle: Candle, event: Event): void {
    event.stopPropagation();
    if (!candle.images || candle.images.length <= 1) return;
    const currentIndex = this.imageIndices[candle.id] || 0;
    this.imageIndices[candle.id] = (currentIndex - 1 + candle.images.length) % candle.images.length;
  }

  navigateToCandleDetail(candle: Candle): void {
    this.router.navigate(['/candles', candle.id]);
  }

  navigateToCandles() {
    this.router.navigate(['/candles']);
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}
