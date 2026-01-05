import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface Candle {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  available: boolean;
  creatorsChoice?: boolean;
  creatorsText?: string;
  featured?: boolean;
  category?: string;
  fragrance?: string;
  color?: string;
  images?: CandleImage[];
}

export interface CandleImage {
  id: number;
  imageName: string;
  imageUrl?: string; // URL to image file
  imageData?: string; // Base64 encoded image data for display
  contentType: string;
}

@Injectable({
  providedIn: 'root'
})
export class CandleService {
  private apiUrl = `${API_URL}/candles`;
  private adminApiUrl = `${API_URL}/admin`;

  constructor(private http: HttpClient) { }

  getAllCandles(): Observable<Candle[]> {
    return this.http.get<Candle[]>(this.apiUrl);
  }

  getCandleById(id: number): Observable<Candle> {
    return this.http.get<Candle>(`${this.apiUrl}/${id}`);
  }

  searchCandles(name: string): Observable<Candle[]> {
    return this.http.get<Candle[]>(`${this.apiUrl}/search?name=${name}`);
  }

  createCandle(candle: Candle): Observable<Candle> {
    return this.http.post<Candle>(`${this.adminApiUrl}/candles`, candle);
  }

  updateCandle(id: number, candle: Candle): Observable<Candle> {
    return this.http.put<Candle>(`${this.adminApiUrl}/candles/${id}`, candle);
  }

  deleteCandle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminApiUrl}/candles/${id}`);
  }

  getFeaturedCandles(): Observable<Candle[]> {
    return this.http.get<Candle[]>(`${this.apiUrl}/featured`);
  }

  getCandlesByCategory(category: string): Observable<Candle[]> {
    return this.http.get<Candle[]>(`${this.apiUrl}/category/${category}`);
  }
}
