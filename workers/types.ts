// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

export type AIProvider = "workersai" | "anthropic" | "openai";

export interface Env extends Cloudflare.Env {
	POLICY_AUD: string;
	TEAM_DOMAIN: string;
	AI_PROVIDER?: AIProvider;
	AI_MODEL?: string;
	ANTHROPIC_API_KEY?: string;
	OPENAI_API_KEY?: string;
	CF_ACCOUNT_ID?: string;
	CF_API_TOKEN?: string;
}
