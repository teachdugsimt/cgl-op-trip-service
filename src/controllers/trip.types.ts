export interface Trip {
  jobId: string
  truckId: string
  weight: number
  price: number
  priceType: "PER_TON" | "PER_TRIP" | null
}
