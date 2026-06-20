import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | ShopSmart",
  description: "Get in touch with ShopSmart customer support.",
};

export default function ContactPage() {
  return (
    <div className="container" style={{ padding: "4rem 0", maxWidth: "600px" }}>
      <h1 style={{ marginBottom: "1rem", textAlign: "center" }}>Contact Us</h1>
      <p style={{ textAlign: "center", color: "var(--color-text-muted)", marginBottom: "3rem" }}>
        Have questions or need assistance? Fill out the form below and our team will get back to you within 24 hours.
      </p>

      <form style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Name</label>
          <input type="text" className="input" placeholder="Your name" required style={{ width: "100%" }} />
        </div>
        
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Email</label>
          <input type="email" className="input" placeholder="Your email address" required style={{ width: "100%" }} />
        </div>
        
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Subject</label>
          <input type="text" className="input" placeholder="What is this regarding?" required style={{ width: "100%" }} />
        </div>
        
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Message</label>
          <textarea className="input" placeholder="Your message" required rows={5} style={{ width: "100%", resize: "vertical" }} />
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem" }}>
          Send Message
        </button>
      </form>
    </div>
  );
}
