# 2. Authentication Strategy using JWT and HttpOnly Cookies

Date: 2026-06-18

## Status

Accepted

## Context

ShopSmart requires a secure authentication mechanism for users. The frontend (Next.js) needs to know the authentication state and the backend (Express) needs to verify the identity of the user making requests. 

We had to decide between storing tokens in LocalStorage vs. HttpOnly cookies, and choosing between Session-based authentication vs. Stateless JWTs.

## Decision

We have decided to use **Stateless JWTs stored in HttpOnly, Secure cookies**.

1. **Stateless JWTs:** 
   - The Express backend issues a JSON Web Token (JWT) containing the user's ID upon successful login/registration.
   - The backend validates the JWT signature on every protected request. No database lookup is required to verify the session.

2. **HttpOnly Cookies:**
   - The token is set as a cookie with the `HttpOnly`, `Secure`, and `SameSite` flags.
   - This prevents JavaScript running in the browser (e.g., potential XSS attacks) from accessing the token.
   - The browser automatically attaches the cookie to API requests made to the backend domain.

## Consequences

### Positive
- **Security:** Mitigation against Cross-Site Scripting (XSS) attacks stealing the authentication token.
- **Scalability:** Stateless JWTs mean the backend doesn't need to store session state in memory or Redis, making horizontal scaling simpler.
- **Convenience:** The frontend doesn't need to manually attach the token in the `Authorization` header using Axios interceptors; the browser handles cookie transmission.

### Negative
- **CSRF Vulnerability:** Cookie-based authentication introduces the risk of Cross-Site Request Forgery (CSRF). We must mitigate this by ensuring CORS policies are strict and `SameSite=Strict` or `Lax` is configured on the cookie.
- **Token Invalidation:** Stateless JWTs cannot be easily revoked before they expire. If a user logs out, we clear the cookie, but if the token was somehow intercepted, it remains valid until its expiration time.
- **Next.js Server Components:** Reading HttpOnly cookies in Next.js Server Components requires passing the cookie from the incoming request to the outgoing fetch request to the Express API.
