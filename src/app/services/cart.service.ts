import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Candle } from './candle.service';

export interface CartItem {
  id: number;
  candle: Candle;
  quantity: number;
  priceAtTime: number;
}

export interface Cart {
  id: number;
  user: any;
  cartItems: CartItem[];
}

import { API_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = `${API_URL}/cart`;

  constructor(private http: HttpClient) { }

  getCart(): Observable<Cart> {
    return this.http.get<Cart>(this.apiUrl);
  }

  addToCart(candleId: number, quantity: number): Observable<Cart> {
    return this.http.post<Cart>(`${this.apiUrl}/add?candleId=${candleId}&quantity=${quantity}`, {});
  }

  updateCartItem(itemId: number, quantity: number): Observable<Cart> {
    return this.http.put<Cart>(`${this.apiUrl}/update/${itemId}?quantity=${quantity}`, {});
  }

  removeFromCart(itemId: number): Observable<Cart> {
    return this.http.delete<Cart>(`${this.apiUrl}/remove/${itemId}`);
  }

  clearCart(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/clear`);
  }
}
