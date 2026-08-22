export interface DeliveryCompany {
  id: string;
  name: string;
  trackingUrl: string;
  isActive: boolean;
}

export interface Shipment {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  deliveryCompany: DeliveryCompany;
  trackingNumber: string;
  status:
    | "pending"
    | "picked_up"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "failed";
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  createdAt: Date;
  updatedAt: Date;
}
