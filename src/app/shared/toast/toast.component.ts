import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToastService, Toast, ConfirmDialog } from '../../services/toast.service';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './toast.component.html',
    styleUrls: ['./toast.component.scss']
})
export class ToastComponent implements OnInit, OnDestroy {
    toasts: Toast[] = [];
    confirmDialog: ConfirmDialog | null = null;
    private toastSub!: Subscription;
    private confirmSub!: Subscription;

    constructor(private toastService: ToastService) { }

    ngOnInit(): void {
        this.toastSub = this.toastService.toasts.subscribe(toasts => {
            this.toasts = toasts;
        });

        this.confirmSub = this.toastService.confirmDialog.subscribe(dialog => {
            this.confirmDialog = dialog;
        });
    }

    ngOnDestroy(): void {
        this.toastSub?.unsubscribe();
        this.confirmSub?.unsubscribe();
    }

    dismissToast(id: number): void {
        this.toastService.dismiss(id);
    }

    getIcon(type: string): string {
        switch (type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'warning': return '⚠';
            case 'info': return 'ℹ';
            default: return '';
        }
    }

    onConfirm(): void {
        if (this.confirmDialog?.onConfirm) {
            this.confirmDialog.onConfirm();
        }
    }

    onCancel(): void {
        if (this.confirmDialog?.onCancel) {
            this.confirmDialog.onCancel();
        } else {
            this.toastService.closeConfirmDialog();
        }
    }
}
