"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/features/auth/AuthContext";

const links = [
  { href: "/",        label: "Home" },
  { href: "/products", label: "Products" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="container">
        <div className="navbar-inner">
          {/* Brand */}
          <Link href="/" className="navbar-brand" aria-label="ShopSmart home">
            <div className="navbar-logo" aria-hidden="true">S</div>
            <span className="navbar-title">ShopSmart</span>
          </Link>

          {/* Right side: nav + toggle */}
          <div className="navbar-right">
            <ul className="navbar-nav" role="list">
              {links.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(link.href) ?? false;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`nav-link${isActive ? " active" : ""}`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}

              {user ? (
                <>
                  <li>
                    <span className="nav-link" style={{ cursor: "default", fontWeight: 600 }}>
                      Hi, {user.name.split(" ")[0]} ({user.role})
                    </span>
                  </li>
                  <li>
                    <button
                      onClick={logout}
                      className="nav-link"
                      style={{ background: "transparent", border: "none", cursor: "pointer", font: "inherit", width: "100%", textAlign: "left" }}
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link
                      href="/login"
                      className={`nav-link${pathname === "/login" ? " active" : ""}`}
                    >
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/register"
                      className={`nav-link${pathname === "/register" ? " active" : ""}`}
                    >
                      Register
                    </Link>
                  </li>
                </>
              )}
            </ul>

            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
