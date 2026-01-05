import { Component, OnInit, OnDestroy } from '@angular/core';
import { CandleService, Candle, CandleImage } from '../services/candle.service';
import { CartService, Cart, CartItem } from '../services/cart.service';
import { WishlistService, Wishlist } from '../services/wishlist.service';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { CommonModule, NgIf, NgFor, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { API_URL } from '../config/api.config';

@Component({
  selector: 'app-candles',
  templateUrl: './candles.component.html',
  styleUrls: ['./candles.component.scss'],
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, FormsModule]
})
export class CandlesComponent implements OnInit, OnDestroy {
  candles: Candle[] = [];
  filteredCandles: Candle[] = [];
  paginatedCandles: Candle[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  // Filter and Sort properties
  searchQuery: string = '';
  sortBy: string = 'name-asc';
  priceRange: { min: number; max: number } = { min: 0, max: 10000 };
  showAvailableOnly: boolean = false;

  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 12;
  totalPages: number = 1;

  // Cart tracking
  cartItems: Map<number, CartItem> = new Map();
  updatingCart: Set<number> = new Set();

  // Wishlist tracking
  wishlistItemIds: Set<number> = new Set();
  updatingWishlist: Set<number> = new Set();

  private subscriptions: Subscription[] = [];

  constructor(
    private candleService: CandleService,
    private cartService: CartService,
    private wishlistService: WishlistService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private meta: Meta,
    private title: Title
  ) { }

  ngOnInit(): void {
    // Set SEO meta tags
    this.title.setTitle('Handmade Candles Collection - Aurora Flames');
    this.meta.updateTag({ name: 'description', content: 'Browse our exquisite collection of handmade scented candles. Premium artisanal wax creations with unique fragrances for your home decor.' });
    this.meta.updateTag({ name: 'keywords', content: 'handmade candles, scented candles, artisanal candles, fragrance candles, premium candles, Aurora Flames' });
    this.meta.updateTag({ property: 'og:title', content: 'Handmade Candles Collection - Aurora Flames' });
    this.meta.updateTag({ property: 'og:description', content: 'Browse our exquisite collection of handmade scented candles and unique fragrance blends.' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: 'https://auroraflames.com/candles' });

    this.loadCandles();
    // Always try to load cart if user is logged in
    if (this.isLoggedIn()) {
      console.log('User is logged in, loading cart and wishlist...');
      this.loadCart();
      this.loadWishlist();
    } else {
      console.log('User is not logged in');
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadCandles(): void {
    this.isLoading = true;
    const sub = this.candleService.getAllCandles().subscribe({
      next: (data) => {
        this.candles = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load candles';
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  loadCart(): void {
    console.log('Loading cart...');
    const sub = this.cartService.getCart().subscribe({
      next: (cart) => {
        console.log('Cart loaded:', cart);
        this.cartItems.clear();
        if (cart?.cartItems) {
          cart.cartItems.forEach(item => {
            console.log(`Adding cart item: candle ${item.candle.id}, quantity ${item.quantity}`);
            this.cartItems.set(item.candle.id, item);
          });
        }
        console.log('Final cartItems map:', this.cartItems);
      },
      error: (error) => {
        console.error('Failed to load cart:', error);
      } // Silently fail
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
      },
      error: () => { } // Silently fail
    });
    this.subscriptions.push(sub);
  }

  // Cart methods
  getCartQuantity(candleId: number): number {
    const item = this.cartItems.get(candleId);
    const quantity = item ? item.quantity : 0;
    console.log(`Getting cart quantity for candle ${candleId}: ${quantity}`, item);
    return quantity;
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
      error: (error) => {
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

    if (newQuantity > candle.stockQuantity) {
      this.toastService.warning('Maximum stock reached');
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
        this.toastService.info('Removed from cart');
        this.updatingCart.delete(candle.id);
      },
      error: () => {
        this.toastService.error('Failed to remove from cart');
        this.updatingCart.delete(candle.id);
      }
    });
  }

  private updateCartFromResponse(cart: Cart): void {
    console.log('Updating cart from response:', cart);
    this.cartItems.clear();
    if (cart?.cartItems) {
      cart.cartItems.forEach(item => {
        console.log(`Updating cart item: candle ${item.candle.id}, quantity ${item.quantity}`);
        this.cartItems.set(item.candle.id, item);
      });
    }
    console.log('Cart updated. New cartItems map:', this.cartItems);
  }

  isUpdatingCart(candleId: number): boolean {
    return this.updatingCart.has(candleId);
  }

  // Public method to refresh cart data
  refreshCart(): void {
    if (this.isLoggedIn()) {
      console.log('Manually refreshing cart...');
      this.loadCart();
    }
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
      // Need to find the wishlist item ID to remove
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
                this.toastService.error('Failed to remove from wishlist');
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
          this.toastService.error('Failed to add to wishlist');
          this.updatingWishlist.delete(candle.id);
        }
      });
    }
  }

  isUpdatingWishlist(candleId: number): boolean {
    return this.updatingWishlist.has(candleId);
  }

  // Search and Filter methods
  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let tempCandles = [...this.candles]; // Create a copy to avoid mutation

    // 1. Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase().trim();
      tempCandles = tempCandles.filter(candle =>
        candle.name.toLowerCase().includes(query) ||
        candle.description.toLowerCase().includes(query)
      );
    }

    // 2. Price range filter
    tempCandles = tempCandles.filter(candle =>
      candle.price >= this.priceRange.min && candle.price <= this.priceRange.max
    );

    // 3. Availability filter
    if (this.showAvailableOnly) {
      tempCandles = tempCandles.filter(candle =>
        candle.available && candle.stockQuantity > 0
      );
    }

    // 4. Sort - create new array to avoid mutation
    this.filteredCandles = this.sortCandles([...tempCandles]);

    // 5. Paginate
    this.totalPages = Math.ceil(this.filteredCandles.length / this.itemsPerPage);
    if (this.totalPages === 0) this.totalPages = 1;
    if (this.currentPage > this.totalPages) this.currentPage = 1;
    this.updatePagination();
  }

  sortCandles(candles: Candle[]): Candle[] {
    return candles.sort((a, b) => {
      switch (this.sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'newest':
          return b.id - a.id;
        default:
          return 0;
      }
    });
  }

  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedCandles = this.filteredCandles.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
      window.scrollTo(0, 0);
    }
  }

  getPages(): number[] {
    return Array(this.totalPages).fill(0).map((x, i) => i + 1);
  }

  // Carousel Logic
  imageIndices: { [key: number]: number } = {};

  nextImage(candle: Candle, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!candle.images || candle.images.length <= 1) return;

    const currentIndex = this.imageIndices[candle.id] || 0;
    this.imageIndices[candle.id] = (currentIndex + 1) % candle.images.length;
  }

  prevImage(candle: Candle, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!candle.images || candle.images.length <= 1) return;

    const currentIndex = this.imageIndices[candle.id] || 0;
    this.imageIndices[candle.id] = (currentIndex - 1 + candle.images.length) % candle.images.length;
  }

  getCurrentImageUrl(candle: Candle): string {
    if (!candle.images || candle.images.length === 0) {
      return '/assets/default-candle.jpg';
    }

    const index = this.imageIndices[candle.id] || 0;
    const image = candle.images[index];
    return this.getImageUrl(image);
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  getImageUrl(image?: CandleImage): string {
    if (!image || !image.id) {
      return '/assets/default-candle.jpg';
    }

    if (image.imageData) {
      return image.imageData;
    }

    return `${API_URL}/candles/images/${image.id}`;
  }

  navigateToCandleDetail(candle: Candle): void {
    this.router.navigate(['/candles', candle.id]);
  }
}
