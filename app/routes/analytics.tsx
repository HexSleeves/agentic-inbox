// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Loader } from "@cloudflare/kumo";
import { ChartBarIcon, CpuIcon, EnvelopeIcon, LightningIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";

export function meta() {
	return [{ title: "Analytics – Agentic Inbox" }];
}

interface AnalyticsData {
	days: number;
	totals: {
		cost_microdollars: number;
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
		calls: number;
		avg_steps: number;
	} | null;
	costOverTime: Array<{
		day: string;
		cost_microdollars: number;
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
		calls: number;
	}>;
	byModel: Array<{
		provider: string;
		model: string;
		cost_microdollars: number;
		total_tokens: number;
		calls: number;
	}>;
	byAction: Array<{
		action: string;
		cost_microdollars: number;
		total_tokens: number;
		calls: number;
	}>;
	byMailbox: Array<{
		mailbox: string;
		cost_microdollars: number;
		total_tokens: number;
		calls: number;
	}>;
}

function usd(microdollars: number | null | undefined): string {
	if (!microdollars) return "$0.000000";
	return `$${(microdollars / 1_000_000).toFixed(6)}`;
}

function fmtTokens(n: number | null | undefined): string {
	if (!n) return "0";
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return String(n);
}

function fmtNum(n: number | null | undefined): string {
	if (!n) return "0";
	return n.toLocaleString();
}

function StatCard({
	icon,
	label,
	value,
	sub,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	sub?: string;
}) {
	return (
		<div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
			<div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
				{icon}
				{label}
			</div>
			<div className="text-2xl font-semibold text-gray-900">{value}</div>
			{sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
		</div>
	);
}

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
	const pct = max > 0 ? Math.max(2, (value / max) * 100) : 2;
	return (
		<div className="flex items-center gap-2 text-sm">
			<div className="w-full bg-gray-100 rounded-full h-5 relative overflow-hidden">
				<div
					className="h-5 rounded-full bg-orange-400 transition-all"
					style={{ width: `${pct}%` }}
				/>
				<span className="absolute inset-0 flex items-center px-2 text-xs text-gray-700 font-medium truncate">
					{label}
				</span>
			</div>
		</div>
	);
}

function CostTimelineChart({ data }: { data: AnalyticsData["costOverTime"] }) {
	if (!data.length) {
		return <p className="text-sm text-gray-400 py-4 text-center">No data yet</p>;
	}

	const maxCost = Math.max(...data.map((d) => d.cost_microdollars), 1);
	const maxCalls = Math.max(...data.map((d) => d.calls), 1);

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="text-gray-500 text-xs border-b">
						<th className="text-left py-2 pr-4 font-medium">Day</th>
						<th className="text-left py-2 pr-4 font-medium w-48">Cost</th>
						<th className="text-right py-2 pr-4 font-medium">Cost (USD)</th>
						<th className="text-right py-2 pr-4 font-medium">Tokens</th>
						<th className="text-right py-2 font-medium">AI Calls</th>
					</tr>
				</thead>
				<tbody>
					{data.map((row) => (
						<tr key={row.day} className="border-b border-gray-50 hover:bg-gray-50">
							<td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{row.day}</td>
							<td className="py-2 pr-4">
								<Bar value={row.cost_microdollars} max={maxCost} label="" />
							</td>
							<td className="py-2 pr-4 text-right font-mono text-xs text-gray-700">
								{usd(row.cost_microdollars)}
							</td>
							<td className="py-2 pr-4 text-right text-gray-600">
								{fmtTokens(row.total_tokens)}
							</td>
							<td className="py-2 text-right text-gray-600">{fmtNum(row.calls)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function ModelBreakdown({ data }: { data: AnalyticsData["byModel"] }) {
	if (!data.length) return <p className="text-sm text-gray-400 py-4 text-center">No data yet</p>;
	const maxCost = Math.max(...data.map((d) => d.cost_microdollars), 1);

	return (
		<div className="space-y-3">
			{data.map((row) => (
				<div key={`${row.provider}-${row.model}`}>
					<div className="flex justify-between text-xs text-gray-500 mb-1">
						<span className="font-mono truncate max-w-xs">{row.model}</span>
						<span className="ml-2 flex gap-3 shrink-0">
							<span>{fmtTokens(row.total_tokens)} tok</span>
							<span>{fmtNum(row.calls)} calls</span>
							<span className="font-medium text-gray-700">{usd(row.cost_microdollars)}</span>
						</span>
					</div>
					<Bar
						value={row.cost_microdollars}
						max={maxCost}
						label={row.provider}
					/>
				</div>
			))}
		</div>
	);
}

function MailboxBreakdown({ data }: { data: AnalyticsData["byMailbox"] }) {
	if (!data.length) return <p className="text-sm text-gray-400 py-4 text-center">No data yet</p>;
	const maxCost = Math.max(...data.map((d) => d.cost_microdollars), 1);

	return (
		<div className="space-y-3">
			{data.map((row) => (
				<div key={row.mailbox}>
					<div className="flex justify-between text-xs text-gray-500 mb-1">
						<span className="truncate max-w-xs">{row.mailbox}</span>
						<span className="ml-2 flex gap-3 shrink-0">
							<span>{fmtTokens(row.total_tokens)} tok</span>
							<span>{fmtNum(row.calls)} calls</span>
							<span className="font-medium text-gray-700">{usd(row.cost_microdollars)}</span>
						</span>
					</div>
					<Bar value={row.cost_microdollars} max={maxCost} label={row.mailbox} />
				</div>
			))}
		</div>
	);
}

const PERIOD_OPTIONS = [
	{ label: "7 days", value: 7 },
	{ label: "30 days", value: 30 },
	{ label: "90 days", value: 90 },
];

export default function AnalyticsRoute() {
	const [days, setDays] = useState(30);

	const { data, isLoading, error } = useQuery<AnalyticsData>({
		queryKey: ["analytics", days],
		queryFn: async () => {
			const res = await fetch(`/api/v1/analytics?days=${days}`);
			if (!res.ok) {
				const body = await res.json<{ error?: string }>();
				throw new Error(body.error ?? `HTTP ${res.status}`);
			}
			return res.json();
		},
		retry: false,
	});

	const totals = data?.totals;

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="max-w-6xl mx-auto px-4 py-8">
				{/* Header */}
				<div className="flex items-center justify-between mb-8">
					<div className="flex items-center gap-3">
						<Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">
							← Inbox
						</Link>
						<h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
							<ChartBarIcon size={20} />
							AI Analytics
						</h1>
					</div>

					{/* Period selector */}
					<div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
						{PERIOD_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								onClick={() => setDays(opt.value)}
								className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
									days === opt.value
										? "bg-orange-500 text-white font-medium"
										: "text-gray-600 hover:bg-gray-100"
								}`}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>

				{isLoading && (
					<div className="flex justify-center py-20">
						<Loader />
					</div>
				)}

				{error && (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
						<strong>Failed to load analytics:</strong> {(error as Error).message}
						{(error as Error).message.includes("not configured") && (
							<p className="mt-2 text-xs">
								Set the <code className="bg-red-100 px-1 rounded">CF_API_TOKEN</code> Worker secret
								with Analytics Read permissions to enable this dashboard.
							</p>
						)}
					</div>
				)}

				{data && (
					<>
						{/* Stat cards */}
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
							<StatCard
								icon={<span className="text-base">💰</span>}
								label="Estimated Cost"
								value={usd(totals?.cost_microdollars)}
								sub={`last ${days} days`}
							/>
							<StatCard
								icon={<CpuIcon size={16} />}
								label="Total Tokens"
								value={fmtTokens(totals?.total_tokens)}
								sub={`${fmtTokens(totals?.prompt_tokens)} in / ${fmtTokens(totals?.completion_tokens)} out`}
							/>
							<StatCard
								icon={<LightningIcon size={16} />}
								label="AI Calls"
								value={fmtNum(totals?.calls)}
								sub={`avg ${(totals?.avg_steps ?? 0).toFixed(1)} steps/call`}
							/>
							<StatCard
								icon={<EnvelopeIcon size={16} />}
								label="Actions"
								value={
									data.byAction.find((a) => a.action === "auto-draft")
										? `${fmtNum(data.byAction.find((a) => a.action === "auto-draft")?.calls ?? 0)} drafts`
										: "0 drafts"
								}
								sub={`${fmtNum(data.byAction.find((a) => a.action === "chat")?.calls ?? 0)} chat msgs`}
							/>
						</div>

						{/* Cost over time */}
						<div className="rounded-lg border border-gray-200 bg-white p-6 mb-4 shadow-sm">
							<h2 className="text-sm font-semibold text-gray-700 mb-4">Cost Over Time</h2>
							<CostTimelineChart data={data.costOverTime} />
						</div>

						<div className="grid md:grid-cols-2 gap-4">
							{/* By model */}
							<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
								<h2 className="text-sm font-semibold text-gray-700 mb-4">By Model</h2>
								<ModelBreakdown data={data.byModel} />
							</div>

							{/* By mailbox */}
							<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
								<h2 className="text-sm font-semibold text-gray-700 mb-4">By Mailbox</h2>
								<MailboxBreakdown data={data.byMailbox} />
							</div>
						</div>

						{/* Workers AI note */}
						{data.byModel.some((m) => m.provider === "workersai") && (
							<p className="text-xs text-gray-400 mt-4">
								* Workers AI cost shown as $0 — billed in neurons, not tokens. Check Cloudflare dashboard for actual Workers AI spend.
							</p>
						)}
					</>
				)}
			</div>
		</div>
	);
}
