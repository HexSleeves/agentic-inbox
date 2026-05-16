// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import type { AIProvider } from "../types";

// Cost per 1M tokens in USD for each provider/model prefix
const COST_PER_M_INPUT: Record<string, number> = {
	"claude-opus-4": 15.0,
	"claude-sonnet-4": 3.0,
	"claude-haiku-4": 0.8,
	"claude-3-5-sonnet": 3.0,
	"claude-3-opus": 15.0,
	"claude-3-haiku": 0.25,
	"gpt-4o-mini": 0.15,
	"gpt-4o": 2.5,
	"gpt-4-turbo": 10.0,
	"o1": 15.0,
	"o3-mini": 1.1,
};

const COST_PER_M_OUTPUT: Record<string, number> = {
	"claude-opus-4": 75.0,
	"claude-sonnet-4": 15.0,
	"claude-haiku-4": 4.0,
	"claude-3-5-sonnet": 15.0,
	"claude-3-opus": 75.0,
	"claude-3-haiku": 1.25,
	"gpt-4o-mini": 0.6,
	"gpt-4o": 10.0,
	"gpt-4-turbo": 30.0,
	"o1": 60.0,
	"o3-mini": 4.4,
};

function getCostRates(model: string): { inputPerM: number; outputPerM: number } {
	for (const prefix of Object.keys(COST_PER_M_INPUT)) {
		if (model.includes(prefix)) {
			return { inputPerM: COST_PER_M_INPUT[prefix], outputPerM: COST_PER_M_OUTPUT[prefix] };
		}
	}
	return { inputPerM: 0, outputPerM: 0 };
}

// Store cost as microdollars (USD × 1_000_000) to avoid floating-point issues in Analytics Engine
export function estimateCostMicrodollars(
	model: string,
	promptTokens: number,
	completionTokens: number,
): number {
	const { inputPerM, outputPerM } = getCostRates(model);
	const cost = (promptTokens / 1_000_000) * inputPerM + (completionTokens / 1_000_000) * outputPerM;
	return Math.round(cost * 1_000_000);
}

export interface AIUsage {
	provider: AIProvider | string;
	model: string;
	action: "chat" | "auto-draft";
	mailboxId: string;
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
	steps: number;
}

export function writeAIAnalytics(analytics: AnalyticsEngineDataset, usage: AIUsage): void {
	const costMicrodollars = estimateCostMicrodollars(usage.model, usage.inputTokens, usage.outputTokens);

	// Schema:
	// blob1 = provider, blob2 = model, blob3 = action, blob4 = mailboxId
	// double1 = inputTokens, double2 = outputTokens, double3 = totalTokens
	// double4 = costMicrodollars, double5 = steps
	// index1 = mailboxId (for per-mailbox filtering)
	analytics.writeDataPoint({
		blobs: [usage.provider, usage.model, usage.action, usage.mailboxId],
		doubles: [
			usage.inputTokens,
			usage.outputTokens,
			usage.totalTokens,
			costMicrodollars,
			usage.steps,
		],
		indexes: [usage.mailboxId],
	});
}
