import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { AuthService } from './auth.service';

export interface UserProfile {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    profileEmoji: string;
    defaultAddress: string;
    city: string;
    state: string;
    pincode: string;
}

import { API_URL } from '../config/api.config';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private apiUrl = `${API_URL}/users`;
    private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
    userProfile$ = this.userProfileSubject.asObservable();

    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) { }

    getProfile(): Observable<UserProfile> {
        const token = this.authService.getToken();
        return this.http.get<UserProfile>(`${this.apiUrl}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        }).pipe(
            tap(profile => {
                // Check for local emoji override
                const localEmoji = localStorage.getItem('user_emoji');
                if (localEmoji) {
                    profile.profileEmoji = localEmoji;
                }
                this.userProfileSubject.next(profile);
            })
        );
    }

    updateProfile(profile: UserProfile): Observable<UserProfile> {
        const token = this.authService.getToken();
        // Don't send local emoji to backend if we want to keep it strictly local
        // But for object consistency we might send it, just won't rely on response for it
        return this.http.put<UserProfile>(`${this.apiUrl}/profile`, profile, {
            headers: { Authorization: `Bearer ${token}` }
        }).pipe(
            tap(updatedProfile => {
                const localEmoji = localStorage.getItem('user_emoji');
                if (localEmoji) {
                    updatedProfile.profileEmoji = localEmoji;
                }
                this.userProfileSubject.next(updatedProfile);
            })
        );
    }

    // Method to update emoji locally and immediately
    updateLocalEmoji(emoji: string): void {
        localStorage.setItem('user_emoji', emoji);
        const currentProfile = this.userProfileSubject.value;
        if (currentProfile) {
            const updatedProfile = { ...currentProfile, profileEmoji: emoji };
            this.userProfileSubject.next(updatedProfile);
        }
    }

    refreshProfile(): void {
        if (this.authService.isLoggedIn()) {
            this.getProfile().subscribe();
        } else {
            this.userProfileSubject.next(null);
        }
    }
}
