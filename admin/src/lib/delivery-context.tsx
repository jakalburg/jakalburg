"use client";

import { createContext, useContext, useState, ReactNode } from "react";

import {
  DeliveryCompany,
  Shipment as DeliveryShipment,
} from "@/types/delivery";

// interface DeliveryCompany {
//     id: string;
//     name: string;
//     isActive: boolean;
// }

// interface DeliveryShipment {
//     id: string;
//     trackingNumber: string;
//     status: string;
// }

interface DeliveryContextType {
  companies: DeliveryCompany[];
  shipments: DeliveryShipment[];
  addCompany: (company: Omit<DeliveryCompany, "id">) => void;
  updateCompany: (id: string, company: Partial<DeliveryCompany>) => void;
  deleteCompany: (id: string) => void;
  addShipment: (
    shipment: Omit<DeliveryShipment, "id" | "createdAt" | "updatedAt">,
  ) => void;
}

const DeliveryContext = createContext<DeliveryContextType | undefined>(
  undefined,
);

export function DeliveryProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [shipments, setShipments] = useState<DeliveryShipment[]>([]);

  const addCompany = (companyData: Omit<DeliveryCompany, "id">) => {
    const newCompany: DeliveryCompany = {
      ...companyData,
      id: Math.random().toString(36).substr(2, 9),
    };
    setCompanies((prev) => [...prev, newCompany]);
  };

  const updateCompany = (id: string, companyData: Partial<DeliveryCompany>) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...companyData } : c)),
    );
  };

  const deleteCompany = (id: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  };

  const addShipment = (
    shipmentData: Omit<DeliveryShipment, "id" | "createdAt" | "updatedAt">,
  ) => {
    const newShipment: DeliveryShipment = {
      ...shipmentData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setShipments((prev) => [...prev, newShipment]);
  };

  return (
    <DeliveryContext.Provider
      value={{
        companies,
        shipments,
        addCompany,
        updateCompany,
        deleteCompany,
        addShipment,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  );
}

export function useDelivery() {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error("useDelivery must be used within DeliveryProvider");
  }
  return context;
}
