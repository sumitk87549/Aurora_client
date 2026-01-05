import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
    id: number;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
}

export interface ConfirmDialog {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private toasts$ = new BehaviorSubject<Toast[]>([]);
    private confirmDialog$ = new BehaviorSubject<ConfirmDialog | null>(null);
    private toastId = 0;

    get toasts() {
        return this.toasts$.asObservable();
    }

    get confirmDialog() {
        return this.confirmDialog$.asObservable();
    }

    private show(type: Toast['type'], message: string, duration: number = 3000): void {
        const toast: Toast = {
            id: ++this.toastId,
            type,
            message,
            duration
        };

        const currentToasts = this.toasts$.getValue();
        this.toasts$.next([...currentToasts, toast]);

        // Auto-dismiss after duration
        if (duration > 0) {
            setTimeout(() => this.dismiss(toast.id), duration);
        }
    }

    success(message: string, duration: number = 3000): void {
        this.show('success', message, duration);
    }

    error(message: string, duration: number = 5000): void {
        this.show('error', message, duration);
    }

    warning(message: string, duration: number = 4000): void {
        this.show('warning', message, duration);
    }

    info(message: string, duration: number = 3000): void {
        this.show('info', message, duration);
    }

    dismiss(id: number): void {
        const currentToasts = this.toasts$.getValue();
        this.toasts$.next(currentToasts.filter(t => t.id !== id));
    }

    confirm(options: {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
    }): Promise<boolean> {
        return new Promise((resolve) => {
            this.confirmDialog$.next({
                title: options.title,
                message: options.message,
                confirmText: options.confirmText || 'Confirm',
                cancelText: options.cancelText || 'Cancel',
                onConfirm: () => {
                    this.confirmDialog$.next(null);
                    resolve(true);
                },
                onCancel: () => {
                    this.confirmDialog$.next(null);
                    resolve(false);
                }
            });
        });
    }

    closeConfirmDialog(): void {
        const dialog = this.confirmDialog$.getValue();
        if (dialog?.onCancel) {
            dialog.onCancel();
        }
        this.confirmDialog$.next(null);
    }
}
