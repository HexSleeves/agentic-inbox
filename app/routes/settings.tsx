// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Badge, Button, Input, Loader, useKumoToastManager } from "@cloudflare/kumo";
import { RobotIcon, ArrowCounterClockwiseIcon, CpuIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useMailbox, useUpdateMailbox } from "~/queries/mailboxes";
import type { AIProvider } from "../../workers/types";

const PROMPT_PLACEHOLDER = `You are an email assistant that helps manage this inbox. You read emails, draft replies, and help organize conversations.\n\nWrite like a real person. Short, direct, flowing prose. Plain text only.\n\n(Leave empty to use the full built-in default prompt)`;

const PROVIDERS: { value: AIProvider; label: string; defaultModel: string }[] = [
	{ value: "workersai", label: "Cloudflare Workers AI", defaultModel: "@cf/moonshotai/kimi-k2.5" },
	{ value: "anthropic", label: "Anthropic", defaultModel: "claude-sonnet-4-6" },
	{ value: "openai", label: "OpenAI", defaultModel: "gpt-4o" },
];

export default function SettingsRoute() {
	const { mailboxId } = useParams<{ mailboxId: string }>();
	const toastManager = useKumoToastManager();
	const { data: mailbox } = useMailbox(mailboxId);
	const updateMailboxMutation = useUpdateMailbox();

	const [displayName, setDisplayName] = useState("");
	const [agentPrompt, setAgentPrompt] = useState("");
	const [aiProvider, setAiProvider] = useState<AIProvider>("workersai");
	const [aiModel, setAiModel] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (mailbox) {
			setDisplayName(mailbox.settings?.fromName || mailbox.name || "");
			setAgentPrompt(mailbox.settings?.agentSystemPrompt || "");
			setAiProvider((mailbox.settings?.aiProvider as AIProvider) || "workersai");
			setAiModel(mailbox.settings?.aiModel || "");
		}
	}, [mailbox]);

	const selectedProvider = PROVIDERS.find((p) => p.value === aiProvider) ?? PROVIDERS[0];
	const modelPlaceholder = selectedProvider.defaultModel;

	const handleSave = async () => {
		if (!mailbox || !mailboxId) return;
		setIsSaving(true);
		const settings = {
			...mailbox.settings,
			fromName: displayName,
			agentSystemPrompt: agentPrompt.trim() || undefined,
			aiProvider,
			aiModel: aiModel.trim() || undefined,
		};
		try {
			await updateMailboxMutation.mutateAsync({ mailboxId, settings });
			toastManager.add({ title: "Settings saved!" });
		} catch {
			toastManager.add({ title: "Failed to save settings", variant: "error" });
		} finally {
			setIsSaving(false);
		}
	};

	if (!mailbox) {
		return (
			<div className="flex justify-center py-20">
				<Loader size="lg" />
			</div>
		);
	}

	const isCustomPrompt = agentPrompt.trim().length > 0;
	const isCustomModel = aiModel.trim().length > 0;

	return (
		<div className="max-w-2xl px-4 py-4 md:px-8 md:py-6 h-full overflow-y-auto">
			<h1 className="text-lg font-semibold text-kumo-default mb-6">Settings</h1>

			<div className="space-y-6">
				{/* Account */}
				<div className="rounded-lg border border-kumo-line bg-kumo-base p-5">
					<div className="text-sm font-medium text-kumo-default mb-4">Account</div>
					<div className="space-y-3">
						<Input
							label="Display Name"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
						/>
						<Input label="Email" type="email" value={mailbox.email} disabled />
					</div>
				</div>

				{/* AI Model */}
				<div className="rounded-lg border border-kumo-line bg-kumo-base p-5">
					<div className="flex items-center gap-2 mb-4">
						<CpuIcon size={16} weight="duotone" className="text-kumo-subtle" />
						<span className="text-sm font-medium text-kumo-default">AI Model</span>
						{isCustomModel && <Badge variant="primary">Custom</Badge>}
					</div>
					<p className="text-xs text-kumo-subtle mb-4">
						Provider is set via Worker secrets (<code className="font-mono">AI_PROVIDER</code>). Select the provider matching your secret, then optionally override the model.
					</p>
					<div className="space-y-3">
						<div>
							<label className="text-xs font-medium text-kumo-default block mb-1.5">Provider</label>
							<div className="flex gap-2 flex-wrap">
								{PROVIDERS.map((p) => (
									<button
										key={p.value}
										type="button"
										onClick={() => {
											setAiProvider(p.value);
											setAiModel("");
										}}
										className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
											aiProvider === p.value
												? "bg-kumo-brand text-white border-kumo-brand"
												: "bg-kumo-recessed text-kumo-default border-kumo-line hover:border-kumo-ring"
										}`}
									>
										{p.label}
									</button>
								))}
							</div>
						</div>
						<div>
							<label className="text-xs font-medium text-kumo-default block mb-1.5">
								Model <span className="text-kumo-subtle font-normal">(optional override)</span>
							</label>
							<Input
								value={aiModel}
								onChange={(e) => setAiModel(e.target.value)}
								placeholder={modelPlaceholder}
							/>
							<p className="text-xs text-kumo-subtle mt-1">
								Leave empty to use the default for the selected provider.
							</p>
						</div>
					</div>
				</div>

				{/* Agent System Prompt */}
				<div className="rounded-lg border border-kumo-line bg-kumo-base p-5">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							<RobotIcon size={16} weight="duotone" className="text-kumo-subtle" />
							<span className="text-sm font-medium text-kumo-default">AI Agent Prompt</span>
							{isCustomPrompt ? (
								<Badge variant="primary">Custom</Badge>
							) : (
								<Badge variant="secondary">Default</Badge>
							)}
						</div>
						{isCustomPrompt && (
							<Button
								variant="ghost"
								size="xs"
								icon={<ArrowCounterClockwiseIcon size={14} />}
								onClick={() => setAgentPrompt("")}
							>
								Reset to default
							</Button>
						)}
					</div>
					<p className="text-xs text-kumo-subtle mb-3">
						Customize how the AI agent behaves for this mailbox. Leave empty to use the built-in default prompt.
					</p>
					<textarea
						value={agentPrompt}
						onChange={(e) => setAgentPrompt(e.target.value)}
						placeholder={PROMPT_PLACEHOLDER}
						rows={12}
						className="w-full resize-y rounded-lg border border-kumo-line bg-kumo-recessed px-3 py-2 text-xs text-kumo-default placeholder:text-kumo-subtle focus:outline-none focus:ring-1 focus:ring-kumo-ring font-mono leading-relaxed"
					/>
				</div>

				{/* Save */}
				<div className="flex justify-end">
					<Button variant="primary" onClick={handleSave} loading={isSaving}>
						Save Changes
					</Button>
				</div>
			</div>
		</div>
	);
}
