import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | ShopSmart",
  description: "ShopSmart Terms of Service and user agreement.",
};

export default function TermsPage() {
  return (
    <div className="container" style={{ padding: "4rem 0", maxWidth: "800px" }}>
      <h1 style={{ marginBottom: "2rem" }}>Terms of Service</h1>
      <div style={{ lineHeight: 1.8, color: "var(--color-text-muted)" }}>
        <p>Last updated: {new Date().toLocaleDateString()}</p>

        <h2 style={{ color: "var(--color-text)", marginTop: "2rem" }}>1. Acceptance of Terms</h2>
        <p>
          By accessing and using ShopSmart, you accept and agree to be bound by the terms and provision of this agreement.
        </p>

        <h2 style={{ color: "var(--color-text)", marginTop: "2rem" }}>2. User Accounts</h2>
        <p>
          If you create an account on the Platform, you are responsible for maintaining the security of your account, and you are fully responsible for all activities that occur under the account.
        </p>

        <h2 style={{ color: "var(--color-text)", marginTop: "2rem" }}>3. Products and Purchases</h2>
        <p>
          All purchases through our site or other transactions for the sale of goods formed through the Website or as a result of visits made by you are governed by our Terms of Sale.
        </p>

        <h2 style={{ color: "var(--color-text)", marginTop: "2rem" }}>4. Prohibited Uses</h2>
        <p>
          You may use the Platform only for lawful purposes and in accordance with these Terms of Use.
        </p>
      </div>
    </div>
  );
}
