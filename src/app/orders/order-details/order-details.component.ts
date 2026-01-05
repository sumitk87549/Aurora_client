import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrderService, Order } from '../../services/order.service';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';

@Component({
    selector: 'app-order-details',
    templateUrl: './order-details.component.html',
    styleUrls: ['./order-details.component.scss'],
    standalone: true,
    imports: [CommonModule, DatePipe, CurrencyPipe, RouterLink]
})
export class OrderDetailsComponent implements OnInit {
    order: Order | null = null;
    isLoading: boolean = true;
    errorMessage: string = '';

    constructor(
        private route: ActivatedRoute,
        private orderService: OrderService,
        private router: Router
    ) { }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadOrder(Number(id));
        } else {
            this.errorMessage = 'Invalid Order ID';
            this.isLoading = false;
        }
    }

    loadOrder(id: number): void {
        this.isLoading = true;
        this.orderService.getOrderById(id).subscribe({
            next: (data) => {
                this.order = data;
                this.isLoading = false;
            },
            error: (error) => {
                this.errorMessage = 'Failed to load order details';
                this.isLoading = false;
            }
        });
    }

    printOrder(): void {
        window.print();
    }
}
