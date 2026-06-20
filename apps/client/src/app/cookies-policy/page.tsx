import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookies Policy | ShopSmart",
  description: "ShopSmart Cookies Policy.",
};

export default function CookiesPolicyPage() {
  return (
    <div className="container" style={{ padding: "4rem 0", maxWidth: "800px" }}>
      <h1 style={{ marginBottom: "2rem" }}>Cookies Policy</h1>
      <div style={{ lineHeight: 1.8, color: "var(--color-text-muted)" }}>
        <p>Last updated: {new Date().toLocaleDateString()}</p>

        <h2 style={{ color: "var(--color-text)", marginTop: "2rem" }}>1. What Are Cookies</h2>
        <p>
          Cookies are small text files that are placed on your computer or mobile device by websites that you visit. They are widely used in order to make websites work, or work more efficiently, as well as to provide information to the owners of the site.
        </p>

        <h2 style={{ color: "var(--color-text)", marginTop: "2rem" }}>2. How We Use Cookies</h2>
        <p>
          We use cookies to understand how you interact with our Services and to improve your experience. This includes securely keeping you logged in, remembering your preferences, and maintaining your shopping cart.
        </p>

        <h2 style={{ color: "var(--color-text)", marginTop: "2rem" }}>3. Your Choices</h2>
        <p>
          You have the right to choose whether or not to accept cookies. However, they are an important part of how our Services work, so you should be aware that if you choose to refuse or remove cookies, this could affect the availability and functionality of the Services.
        </p>
      </div>
    </div>
  );
}
