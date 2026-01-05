import { Component, OnInit } from '@angular/core';
import { CartService, Cart } from '../services/cart.service';
import { PricingService, OrderSummary } from '../services/pricing.service';
import { ToastService } from '../services/toast.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, SlicePipe } from '@angular/common';
import { API_URL } from '../config/api.config';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  standalone: true,
  imports: [CommonModule, SlicePipe, RouterLink]
})
export class CartComponent implements OnInit {
  cart: Cart | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';
  orderSummary: OrderSummary | null = null;

  constructor(
    private cartService: CartService,
    private pricingService: PricingService,
    private toastService: ToastService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    this.isLoading = true;
    this.cartService.getCart().subscribe({
      next: (data) => {
        this.cart = data;
        this.isLoading = false;
        this.calculateOrderSummary();
      },
      error: (error) => {
        this.errorMessage = 'Failed to load cart';
        this.isLoading = false;
      }
    });
  }

  navigateToCandleDetail(candleId: number): void {
    this.router.navigate(['/candles', candleId]);
  }

  calculateOrderSummary(): void {
    if (!this.cart || this.cart.cartItems.length === 0) {
      this.orderSummary = null;
      return;
    }

    // Default to Rajasthan for cart page (actual address comes at checkout)
    const subtotal = this.getTotalPrice();
    this.orderSummary = this.pricingService.calculateOrderSummary(subtotal, 'Rajasthan');
  }

  updateQuantity(itemId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(itemId);
      return;
    }

    // Store current order of cart items
    const currentOrder = this.cart ? this.cart.cartItems.map(item => item.id) : [];

    this.cartService.updateCartItem(itemId, quantity).subscribe({
      next: (updatedCart) => {
        // Preserve the original order of cart items
        if (updatedCart.cartItems.length > 0) {
          updatedCart.cartItems.sort((a, b) => {
            const indexA = currentOrder.indexOf(a.id);
            const indexB = currentOrder.indexOf(b.id);
            return indexA - indexB;
          });
        }
        this.cart = updatedCart;
        this.calculateOrderSummary();
      },
      error: (error) => {
        this.toastService.error('Failed to update quantity');
      }
    });
  }

  removeItem(itemId: number): void {
    // Store current order of cart items (excluding the one being removed)
    const currentOrder = this.cart ?
      this.cart.cartItems.filter(item => item.id !== itemId).map(item => item.id) : [];

    this.cartService.removeFromCart(itemId).subscribe({
      next: (updatedCart) => {
        // Preserve the original order for remaining items
        if (updatedCart.cartItems.length > 0) {
          updatedCart.cartItems.sort((a, b) => {
            const indexA = currentOrder.indexOf(a.id);
            const indexB = currentOrder.indexOf(b.id);
            return indexA - indexB;
          });
        }
        this.cart = updatedCart;
        this.calculateOrderSummary();
        this.toastService.info('Item removed from cart');
      },
      error: (error) => {
        this.toastService.error('Failed to remove item');
      }
    });
  }

  async clearCart(): Promise<void> {
    const confirmed = await this.toastService.confirm({
      title: 'Clear Cart',
      message: 'Are you sure you want to remove all items from your cart?',
      confirmText: 'Clear All',
      cancelText: 'Keep Items'
    });

    if (confirmed) {
      this.cartService.clearCart().subscribe({
        next: () => {
          this.cart = { ...this.cart!, cartItems: [] };
          this.orderSummary = null;
          this.toastService.success('Cart cleared successfully');
        },
        error: (error) => {
          this.toastService.error('Failed to clear cart');
        }
      });
    }
  }

  getTotalPrice(): number {
    if (!this.cart) return 0;
    return this.cart.cartItems.reduce((total, item) =>
      total + (item.priceAtTime * item.quantity), 0);
  }

  getTotalItems(): number {
    if (!this.cart) return 0;
    return this.cart.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  proceedToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  getFreeDeliveryThreshold(): number {
    return this.pricingService.getFreeDeliveryThreshold();
  }

  getAmountToFreeDelivery(): number {
    return Math.max(0, this.getFreeDeliveryThreshold() - this.getTotalPrice());
  }

  getImageUrl(image?: any): string {
    if (!image || !image.id) return '/assets/default-candle.jpg';
    if (image.imageData) return image.imageData;
    return `${API_URL}/candles/images/${image.id}`;
  }
}
