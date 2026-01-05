import { Injectable } from '@angular/core';
import { getDeliveryZone, getStateByName, DELIVERY_ZONES } from '../data/location-data';

export interface OrderSummary {
    subtotal: number;
    gst: number;
    gstRate: number;
    deliveryCharge: number;
    serviceCharge: number;
    totalAmount: number;
    estimatedDeliveryDays: { min: number; max: number };
    estimatedDeliveryDate: { earliest: Date; latest: Date };
    isFreeDelivery: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class PricingService {
    // GST rate for candles (Handicrafts typically fall under 12-18%)
    private readonly GST_RATE = 0.18; // 18%

    // Free delivery threshold
    private readonly FREE_DELIVERY_THRESHOLD = 999;

    // Base service charge (packaging, handling)
    private readonly SERVICE_CHARGE = 0; // Can be adjusted

    // Delivery charges by zone (from Kota, Rajasthan)
    private readonly DELIVERY_CHARGES = {
        'local': { base: 50, perKg: 10 },   // Within Rajasthan
        'nearby': { base: 80, perKg: 15 },  // Gujarat, MP, UP, Haryana, Punjab, Delhi
        'medium': { base: 120, perKg: 20 }, // Maharashtra, Chhattisgarh, Bihar, etc.
        'far': { base: 180, perKg: 25 }     // South India, Northeast, etc.
    };

    // Estimated delivery days by zone
    private readonly DELIVERY_DAYS = {
        'local': { min: 2, max: 4 },
        'nearby': { min: 3, max: 5 },
        'medium': { min: 5, max: 7 },
        'far': { min: 7, max: 10 }
    };

    // Candle creation time (8 hours = 1 working day)
    private readonly CREATION_DAYS = 1;

    calculateOrderSummary(
        subtotal: number,
        stateName: string,
        estimatedWeight: number = 0.5 // Default 0.5 kg per order
    ): OrderSummary {
        // Get state code and zone
        const state = getStateByName(stateName);
        const stateCode = state?.code || 'RJ';
        const zone = getDeliveryZone(stateCode);

        // Calculate GST (on subtotal)
        const gst = Math.round(subtotal * this.GST_RATE);

        // Calculate delivery charge
        const isFreeDelivery = subtotal >= this.FREE_DELIVERY_THRESHOLD;
        const zoneCharges = this.DELIVERY_CHARGES[zone];
        const rawDeliveryCharge = zoneCharges.base + (estimatedWeight * zoneCharges.perKg);
        const deliveryCharge = isFreeDelivery ? 0 : Math.round(rawDeliveryCharge);

        // Service charge
        const serviceCharge = this.SERVICE_CHARGE;

        // Total
        const totalAmount = subtotal + gst + deliveryCharge + serviceCharge;

        // Estimated delivery days
        const deliveryDays = this.DELIVERY_DAYS[zone];
        const estimatedDeliveryDays = {
            min: this.CREATION_DAYS + deliveryDays.min,
            max: this.CREATION_DAYS + deliveryDays.max
        };

        // Calculate actual dates
        const today = new Date();
        const earliest = new Date(today);
        earliest.setDate(today.getDate() + estimatedDeliveryDays.min);
        const latest = new Date(today);
        latest.setDate(today.getDate() + estimatedDeliveryDays.max);

        return {
            subtotal,
            gst,
            gstRate: this.GST_RATE * 100, // As percentage
            deliveryCharge,
            serviceCharge,
            totalAmount,
            estimatedDeliveryDays,
            estimatedDeliveryDate: { earliest, latest },
            isFreeDelivery
        };
    }

    getDeliveryChargePreview(stateName: string): number {
        const state = getStateByName(stateName);
        const stateCode = state?.code || 'RJ';
        const zone = getDeliveryZone(stateCode);
        return this.DELIVERY_CHARGES[zone].base;
    }

    getFreeDeliveryThreshold(): number {
        return this.FREE_DELIVERY_THRESHOLD;
    }

    getGSTRate(): number {
        return this.GST_RATE * 100;
    }
}
