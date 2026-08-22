export const COURIER_PROVIDERS = [
  { name: "Blue Dart", value: "Blue Dart" },
  { name: "Delhivery", value: "Delhivery" },
  { name: "DTDC", value: "DTDC" },
];

export const getTrackingUrl = (courierName: string, trackingNumber: string) => {
  if (!trackingNumber) return null;

  const normalizedCourier = courierName?.toLowerCase();

  if (normalizedCourier?.includes("blue dart")) {
    return `https://www.bluedart.com/trackdart?handler=trakdart&trackable_no=${trackingNumber}`;
  }

  if (normalizedCourier?.includes("delhivery")) {
    return `https://www.delhivery.com/track/package/${trackingNumber}`;
  }

  if (normalizedCourier?.includes("dtdc")) {
    return `https://www.dtdc.in/tracking/tracking_results.asp?SearchType=T&TNo=${trackingNumber}`;
  }

  return null;
};
