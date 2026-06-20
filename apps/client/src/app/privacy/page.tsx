import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | ShopSmart",
  description: "ShopSmart Privacy Policy regarding data collection.",
};

export default function PrivacyPage() {
  return (
    <div className="container" style={{ padding: "4rem 0", maxWidth: "800px" }}>
      <h1 style={{ marginBottom: "2rem" }}>Privacy Policy</h1>
      <div style={{ lineHeight: 1.8, color: "var(--color-text-muted)" }}>
        <p>Last updated: {new Date().toLocaleDateString()}</p>

        <h2 style={{ color: "var(--color-text)", marginTop: "2rem" }}>1. Information We Collect</h2>
        <p>
          We collect information that you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This information may include: name, email, phone number, postal address, profile picture, payment method, and other information you choose to provide.
        </p>

        <h2 style={{ color: "var(--color-text)", marginTop: "2rem" }}>2. Use of Information</h2>
        <p>
          We may use the information we collect about you to Provide, maintain, and improve our Services, including, for example, to facilitate payments, send receipts, provide products and services you request (and send related information), develop new features, provide customer support to Users and Vendors, develop safety features, authenticate users, and send product updates and administrative messages.
        </p>

        <h2 style={{ color: "var(--color-text)", marginTop: "2rem" }}>3. Sharing of Information</h2>
        <p>
          We may share the information we collect about you as described in this Statement or as described at the time of collection or sharing, including as follows: With Vendors to enable them to provide the Services you request.
        </p>
      </div>
    </div>
  );
}
