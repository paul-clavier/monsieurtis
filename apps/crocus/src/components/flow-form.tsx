import type { KratosFlow, KratosUiMessage, KratosUiNode } from "@monsieurtis/ory";
import { Button } from "@monsieurtis/ui/components/button";
import { Input } from "@monsieurtis/ui/components/input";
import { Label } from "@monsieurtis/ui/components/label";

/**
 * Renders a Kratos self-service flow as a plain HTML form posting straight
 * back to Kratos (`flow.ui.action`). No client JS is required: Kratos browser
 * flows are designed around full-page form posts, and the CSRF token travels
 * as a hidden input. Submit buttons carry their own name/value pair, which is
 * how Kratos tells "password" from "oidc google" submissions apart.
 */

const Messages = ({ messages }: { messages?: KratosUiMessage[] }) => {
    if (!messages?.length) return null;
    return (
        <div className="space-y-1">
            {messages.map((m) => (
                <p
                    key={m.id}
                    className={
                        m.type === "error"
                            ? "text-sm text-destructive"
                            : "text-sm text-muted-foreground"
                    }
                >
                    {m.text}
                </p>
            ))}
        </div>
    );
};

const InputNode = ({ node }: { node: KratosUiNode }) => {
    const { name, type, required, autocomplete, value } = node.attributes;

    if (type === "hidden") {
        return <input type="hidden" name={name} value={String(value ?? "")} />;
    }

    if (type === "submit" || type === "button") {
        const isOidc = node.group === "oidc";
        return (
            <Button
                type="submit"
                name={name}
                value={String(value ?? "")}
                variant={isOidc ? "outline" : "default"}
                className="w-full"
            >
                {isOidc && node.meta.label
                    ? `Continue with ${labelText(node)}`
                    : (labelText(node) ?? "Submit")}
            </Button>
        );
    }

    const id = `node-${name}`;
    return (
        <div className="space-y-2">
            {node.meta.label ? (
                <Label htmlFor={id}>{labelText(node)}</Label>
            ) : null}
            <Input
                id={id}
                name={name}
                type={type}
                required={required}
                autoComplete={autocomplete}
                defaultValue={
                    typeof value === "string" || typeof value === "number"
                        ? value
                        : undefined
                }
                aria-invalid={node.messages.some((m) => m.type === "error")}
            />
            <Messages messages={node.messages} />
        </div>
    );
};

/**
 * Kratos labels OIDC buttons "Sign in with google" (provider id, lowercase).
 * Title-case the provider so the button reads "Continue with Google".
 */
const labelText = (node: KratosUiNode): string | undefined => {
    const text = node.meta.label?.text;
    if (!text) return undefined;
    if (node.group !== "oidc") return text;
    const provider = String(node.attributes.value ?? "");
    if (!provider) return text;
    const pretty = provider.charAt(0).toUpperCase() + provider.slice(1);
    return pretty;
};

export function FlowForm({ flow }: { flow: KratosFlow }) {
    const oidcNodes = flow.ui.nodes.filter((n) => n.group === "oidc");
    const formNodes = flow.ui.nodes.filter((n) => n.group !== "oidc");
    // The CSRF token node is group "default" and must be present in every
    // submission, including the OIDC one — duplicate it into both forms.
    const csrfNode = flow.ui.nodes.find(
        (n) => n.attributes.name === "csrf_token",
    );

    return (
        <div className="space-y-6">
            <Messages messages={flow.ui.messages} />

            <form
                action={flow.ui.action}
                method={flow.ui.method}
                className="space-y-4"
            >
                {formNodes.map((node, i) => (
                    <InputNode
                        key={`${node.attributes.name}-${i}`}
                        node={node}
                    />
                ))}
            </form>

            {oidcNodes.length > 0 ? (
                <>
                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground">
                            or
                        </span>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                    <form
                        action={flow.ui.action}
                        method={flow.ui.method}
                        className="space-y-3"
                    >
                        {csrfNode ? <InputNode node={csrfNode} /> : null}
                        {oidcNodes.map((node, i) => (
                            <InputNode
                                key={`${node.attributes.name}-${i}`}
                                node={node}
                            />
                        ))}
                    </form>
                </>
            ) : null}
        </div>
    );
}
