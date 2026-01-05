import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CartService, Cart } from '../services/cart.service';
import { OrderService } from '../services/order.service';
import { PricingService, OrderSummary } from '../services/pricing.service';
import { ToastService } from '../services/toast.service';
import { INDIAN_STATES, STATE_CITIES, State } from '../data/location-data';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

declare var Razorpay: any;

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class CheckoutComponent implements OnInit {
  cart: Cart | null = null;
  checkoutForm: FormGroup;
  isLoading: boolean = true;
  isProcessing: boolean = false;
  errorMessage: string = '';
  razorpayConfigured = false;
  razorpayKeyId = '';

  // Location data
  states: State[] = INDIAN_STATES;
  cities: string[] = [];

  // Order summary
  orderSummary: OrderSummary | null = null;

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private orderService: OrderService,
    private pricingService: PricingService,
    private toastService: ToastService,
    private router: Router
  ) {
    this.checkoutForm = this.fb.group({
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      customerEmail: ['', [Validators.required, Validators.email]],
      customerPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      shippingAddress: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      paymentMethod: ['COD', Validators.required],
      orderNotes: ['']
    });
  }

  ngOnInit(): void {
    this.loadCart();
    this.loadPaymentConfig();
    this.loadRazorpayScript();

    // Watch for state changes to update cities
    this.checkoutForm.get('state')?.valueChanges.subscribe(stateName => {
      this.onStateChange(stateName);
    });
  }

  onStateChange(stateName: string): void {
    const state = this.states.find(s => s.name === stateName);
    if (state) {
      this.cities = STATE_CITIES[state.code] || [];
      // Reset city if current city is not in new list
      const currentCity = this.checkoutForm.get('city')?.value;
      if (currentCity && !this.cities.includes(currentCity)) {
        this.checkoutForm.patchValue({ city: '' });
      }
    } else {
      this.cities = [];
    }
    // Recalculate order summary with new state
    this.calculateOrderSummary();
  }

  loadCart(): void {
    this.isLoading = true;
    this.cartService.getCart().subscribe({
      next: (data) => {
        this.cart = data;
        this.isLoading = false;
        if (!data || !data.cartItems || data.cartItems.length === 0) {
          this.router.navigate(['/cart']);
        }
        this.calculateOrderSummary();
      },
      error: (error) => {
        this.errorMessage = 'Failed to load cart';
        this.isLoading = false;
      }
    });
  }

  calculateOrderSummary(): void {
    if (!this.cart || this.cart.cartItems.length === 0) {
      this.orderSummary = null;
      return;
    }

    const subtotal = this.getTotalPrice();
    const stateName = this.checkoutForm.get('state')?.value || 'Rajasthan';
    this.orderSummary = this.pricingService.calculateOrderSummary(subtotal, stateName);
  }

  loadPaymentConfig(): void {
    this.orderService.getPaymentConfig().subscribe(config => {
      this.razorpayConfigured = config.razorpayConfigured;
      this.razorpayKeyId = config.razorpayKeyId;
    });
  }

  loadRazorpayScript(): void {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }

  getTotalPrice(): number {
    if (!this.cart) return 0;
    return this.cart.cartItems.reduce((total, item) =>
      total + (item.priceAtTime * item.quantity), 0);
  }

  getShippingCost(): number {
    return this.orderSummary?.deliveryCharge || 0;
  }

  getGST(): number {
    return this.orderSummary?.gst || 0;
  }

  getGrandTotal(): number {
    return this.orderSummary?.totalAmount || 0;
  }

  onSubmit(): void {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.toastService.warning('Please fill all required fields correctly');
      return;
    }

    this.isProcessing = true;
    const formValue = this.checkoutForm.value;
    const request = {
      ...formValue,
      shippingAddress: `${formValue.shippingAddress}, ${formValue.city}, ${formValue.state} - ${formValue.pincode}`
    };

    if (this.checkoutForm.get('paymentMethod')?.value === 'COD') {
      this.processCODOrder(request);
    } else {
      this.processRazorpayOrder(request);
    }
  }

  processCODOrder(request: any): void {
    this.orderService.checkoutCOD(request).subscribe({
      next: (order) => {
        this.toastService.success('Order placed successfully! Order #' + order.orderNumber);
        this.router.navigate(['/orders', order.id]);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to place order';
        this.toastService.error(this.errorMessage);
        this.isProcessing = false;
      }
    });
  }

  processRazorpayOrder(request: any): void {
    this.orderService.createRazorpayOrder(request).subscribe({
      next: (response) => {
        this.openRazorpayCheckout(response);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to initiate payment';
        this.toastService.error(this.errorMessage);
        this.isProcessing = false;
      }
    });
  }

  openRazorpayCheckout(orderData: any): void {
    const options = {
      key: this.razorpayKeyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Aurora Flames',
      description: 'Order #' + orderData.orderNumber,
      order_id: orderData.razorpayOrderId,
      handler: (response: any) => {
        this.verifyPayment(response, orderData.orderNumber);
      },
      prefill: {
        name: orderData.customerName,
        email: orderData.customerEmail,
        contact: orderData.customerPhone
      },
      theme: {
        color: '#C4956A'
      }
    };

    if (typeof Razorpay !== 'undefined') {
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        this.toastService.error('Payment Failed: ' + response.error.description);
        this.isProcessing = false;
      });
      rzp.open();
    } else {
      this.toastService.error('Razorpay SDK not loaded. Please check your internet connection.');
      this.isProcessing = false;
    }
  }

  verifyPayment(paymentResponse: any, orderNumber: string): void {
    const paymentData = {
      razorpay_order_id: paymentResponse.razorpay_order_id,
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_signature: paymentResponse.razorpay_signature,
      orderNumber: orderNumber
    };

    this.orderService.verifyRazorpayPayment(paymentData).subscribe({
      next: (order) => {
        this.toastService.success('Payment Successful! Order Placed.');
        this.router.navigate(['/orders', order.id]);
      },
      error: (error) => {
        this.toastService.error('Payment verification failed. Please contact support.');
        this.isProcessing = false;
      }
    });
  }
}
