import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserService, UserProfile } from '../services/user.service';
import { ToastService } from '../services/toast.service';
import { INDIAN_STATES, STATE_CITIES, State } from '../data/location-data';
import { CommonModule, NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIf, NgFor]
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  isLoading: boolean = true;
  isSaving: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  emojis: string[] = ['🕯️', '✨', '🔥', '⭐', '🌙', '☀️', '🌸', '💀', '🎃', '🎄', '🤍', '🧡', '💜', '🪄', '🧚'];

  // Location data
  states: State[] = INDIAN_STATES;
  cities: string[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private toastService: ToastService
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: [{ value: '', disabled: true }, Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      profileEmoji: ['🕯️'],
      defaultAddress: [''],
      city: [{ value: '', disabled: true }],
      state: [''],
      pincode: ['', Validators.pattern(/^[0-9]{6}$/)]
    });
  }

  ngOnInit(): void {
    this.loadProfile();

    // Watch for state changes to update cities
    this.profileForm.get('state')?.valueChanges.subscribe(stateName => {
      this.onStateChange(stateName);
    });
  }

  onStateChange(stateName: string): void {
    const cityControl = this.profileForm.get('city');
    const state = this.states.find(s => s.name === stateName);

    if (state) {
      this.cities = STATE_CITIES[state.code] || [];
      cityControl?.enable();

      // Reset city if current city is not in new list
      const currentCity = cityControl?.value;
      if (currentCity && !this.cities.includes(currentCity)) {
        this.profileForm.patchValue({ city: '' });
      }
    } else {
      this.cities = [];
      this.profileForm.patchValue({ city: '' });
      cityControl?.disable();
    }
  }

  loadProfile(): void {
    this.isLoading = true;
    this.userService.getProfile().subscribe({
      next: (data) => {
        this.profileForm.patchValue(data);
        // Load cities for the state
        if (data.state) {
          this.onStateChange(data.state);
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load profile';
        this.toastService.error('Failed to load profile');
        this.isLoading = false;
      }
    });
  }

  selectEmoji(emoji: string): void {
    this.profileForm.patchValue({ profileEmoji: emoji });
    this.profileForm.markAsDirty();
    // Update locally immediately as per request
    this.userService.updateLocalEmoji(emoji);
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';

    const profileData: UserProfile = this.profileForm.getRawValue();

    this.userService.updateProfile(profileData).subscribe({
      next: (updatedProfile) => {
        this.successMessage = 'Profile updated successfully!';
        this.toastService.success('Profile updated successfully!');
        this.isSaving = false;
        this.profileForm.markAsPristine();
      },
      error: (error) => {
        this.errorMessage = 'Failed to update profile';
        this.toastService.error('Failed to update profile');
        this.isSaving = false;
      }
    });
  }
}
