import { SignOutButton } from "@/components/sign-out-button";

export default function NoAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-xl border p-8"
        style={{ background: "var(--viz-surface)", borderColor: "var(--viz-gridline)" }}
      >
        <h1 className="text-lg font-semibold" style={{ color: "var(--viz-text-primary)" }}>
          You&apos;re signed in, but not set up yet
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--viz-text-secondary)" }}>
          Your account hasn&apos;t been given access to a dashboard. Ask the Nexdo team to add you,
          then sign in again.
        </p>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
