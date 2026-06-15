import type { CapabilityInvocationRecord } from "@/lib/marketplace/marketplace-contract";
import {
  estimatePackagePricing,
  getPublishedCapabilityPackage,
} from "@/lib/marketplace/capability-market-registry";

const invocations: CapabilityInvocationRecord[] = [];
const revenueByProvider = new Map<string, number>();
let invocationCounter = 0;

function nextInvocationId(timestamp: string): string {
  invocationCounter += 1;
  return `mkt-inv-${timestamp}-${invocationCounter}`;
}

export function recordCapabilityInvocation(input: {
  capabilityId: string;
  providerId: string;
  publisherId: string;
  success: boolean;
  timestamp?: string;
  version?: string;
}): CapabilityInvocationRecord {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const pkg = input.version
    ? getPublishedCapabilityPackage(input.capabilityId, input.version, input.providerId)
    : null;
  const costUnits = pkg ? (input.success ? pkg.pricing.unitCost : 0) : 0;

  const record: CapabilityInvocationRecord = {
    invocationId: nextInvocationId(timestamp),
    capabilityId: input.capabilityId,
    providerId: input.providerId,
    publisherId: input.publisherId,
    costUnits,
    success: input.success,
    timestamp,
  };
  invocations.push(record);

  if (input.success && costUnits > 0) {
    attributeRevenue(input.providerId, costUnits);
  }

  return record;
}

export function attributeRevenue(providerId: string, units: number): number {
  const next = (revenueByProvider.get(providerId) ?? 0) + units;
  revenueByProvider.set(providerId, Math.round(next * 1000) / 1000);
  return next;
}

export function getUsageSummary(capabilityId: string): {
  totalInvocations: number;
  successfulInvocations: number;
  totalCostUnits: number;
} {
  const rows = invocations.filter((row) => row.capabilityId === capabilityId);
  const successful = rows.filter((row) => row.success);
  return {
    totalInvocations: rows.length,
    successfulInvocations: successful.length,
    totalCostUnits: Math.round(successful.reduce((sum, row) => sum + row.costUnits, 0) * 1000) / 1000,
  };
}

export function getProviderRevenue(providerId: string): number {
  return revenueByProvider.get(providerId) ?? 0;
}

export function computeCostPerAction(providerId: string): number {
  const rows = invocations.filter((row) => row.providerId === providerId && row.success);
  if (rows.length === 0) {
    return 0;
  }
  const total = rows.reduce((sum, row) => sum + row.costUnits, 0);
  return Math.round((total / rows.length) * 1000) / 1000;
}

export function projectPublisherEarnings(
  capabilityId: string,
  version: string,
  providerId: string,
  invocations: number,
): number {
  const pkg = getPublishedCapabilityPackage(capabilityId, version, providerId);
  if (!pkg) {
    return 0;
  }
  return estimatePackagePricing(pkg, invocations);
}

export function listInvocationRecords(limit = 100): readonly CapabilityInvocationRecord[] {
  return invocations.slice(-limit);
}

export function resetMonetizationLayerForTests(): void {
  invocations.length = 0;
  revenueByProvider.clear();
  invocationCounter = 0;
}
