import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Order {
    id: number;
    orderNumber: string;
    totalAmount: number;
    subtotal: number;
    shippingCost: number;
    discountAmount: number;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    shippingAddress: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    orderDate: string;
    expectedDeliveryDate: string;
    deliveryDate?: string;
    orderItems: OrderItem[];
}

export interface OrderItem {
    id: number;
    candle: {
        id: number;
        name: string;
        price: number;
    };
    quantity: number;
    priceAtTime: number;
}

export interface CheckoutRequest {
    shippingAddress: string;
    paymentMethod: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    city?: string;
    state?: string;
    pincode?: string;
    orderNotes?: string;
}

export interface RazorpayOrderResponse {
    razorpayOrderId: string;
    amount: number;
    currency: string;
    razorpayKeyId: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
}

export interface DashboardStats {
    totalRevenue: number;
    todayRevenue: number;
    totalOrders: number;
    pendingOrders: number;
}

export interface PaymentConfig {
    razorpayConfigured: boolean;
    razorpayKeyId: string;
}

import { API_URL } from '../config/api.config';

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private apiUrl = `${API_URL}/orders`;

    constructor(private http: HttpClient) { }

    // Get payment configuration
    getPaymentConfig(): Observable<PaymentConfig> {
        return this.http.get<PaymentConfig>(`${this.apiUrl}/payment/config`);
    }

    // Checkout with COD
    checkoutCOD(request: CheckoutRequest): Observable<Order> {
        return this.http.post<Order>(`${this.apiUrl}/checkout/cod`, request);
    }

    // Create Razorpay order
    createRazorpayOrder(request: CheckoutRequest): Observable<RazorpayOrderResponse> {
        return this.http.post<RazorpayOrderResponse>(`${this.apiUrl}/checkout/razorpay/create`, request);
    }

    // Verify Razorpay payment
    verifyRazorpayPayment(paymentData: any): Observable<Order> {
        return this.http.post<Order>(`${this.apiUrl}/checkout/razorpay/verify`, paymentData);
    }

    // ================== CUSTOMER METHODS ==================

    // Get authenticated user's orders
    getUserOrders(): Observable<Order[]> {
        return this.http.get<Order[]>(this.apiUrl);
    }

    // Get order by ID
    getOrderById(id: number): Observable<Order> {
        return this.http.get<Order>(`${this.apiUrl}/${id}`);
    }

    // Get order by order number
    getOrderByNumber(orderNumber: string): Observable<Order> {
        return this.http.get<Order>(`${this.apiUrl}/number/${orderNumber}`);
    }

    // ================== ADMIN METHODS ==================

    // Get all orders (admin only)
    getAllOrders(): Observable<Order[]> {
        return this.http.get<Order[]>(`${this.apiUrl.replace('/orders', '')}/admin/orders`);
    }

    // Update order status (admin only)
    updateOrderStatus(orderId: number, status: string): Observable<Order> {
        return this.http.put<Order>(`${this.apiUrl.replace('/orders', '')}/admin/orders/${orderId}/status?status=${status}`, {});
    }

    // Get dashboard statistics (admin only)
    getDashboardStats(): Observable<DashboardStats> {
        // For now, return mock data until backend is ready
        return new Observable<DashboardStats>(observer => {
            observer.next({
                totalRevenue: 125000,
                todayRevenue: 2500,
                totalOrders: 150,
                pendingOrders: 12
            });
            observer.complete();
        });

        // Uncomment this when backend is ready
        // return this.http.get<DashboardStats>(`${this.apiUrl}/admin/stats`);
    }
}
