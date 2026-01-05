import { Component, OnInit } from '@angular/core';
import { WishlistService, Wishlist } from '../services/wishlist.service';
import { API_URL } from '../config/api.config';
import { CartService } from '../services/cart.service';
import { CommonModule } from '@angular/common';
import { CandleImage } from '../services/candle.service';
import { Router } from '@angular/router';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-wishlist',
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class WishlistComponent implements OnInit {
  wishlist: Wishlist | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(
    private wishlistService: WishlistService,
    private cartService: CartService,
    private router: Router,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.isLoading = true;
    this.wishlistService.getWishlist().subscribe({
      next: (data) => {
        this.wishlist = data;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load wishlist';
        this.isLoading = false;
      }
    });
  }

  removeFromWishlist(itemId: number): void {
    this.wishlistService.removeFromWishlist(itemId).subscribe({
      next: (updatedWishlist) => {
        this.wishlist = updatedWishlist;
        this.toastService.success('Item removed from wishlist');
      },
      error: (error) => {
        this.toastService.error('Failed to remove from wishlist');
      }
    });
  }

  addToCart(candleId: number): void {
    this.cartService.addToCart(candleId, 1).subscribe({
      next: () => {
        this.toastService.success('Added to cart successfully!');
      },
      error: (error) => {
        this.toastService.error('Failed to add to cart');
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getImageUrl(image?: CandleImage): string {
    if (!image || !image.id) {
      return '/assets/default-candle.jpg';
    }

    // If image has base64 data, use it directly
    if (image.imageData) {
      return image.imageData;
    }

    // Fallback to API endpoint if no base64 data
    return `${API_URL}/candles/images/${image.id}`;
  }

  navigateToCandleDetail(candleId: number): void {
    this.router.navigate(['/candles', candleId]);
  }
}
