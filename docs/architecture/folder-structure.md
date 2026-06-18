# Folder Structure

```mermaid
graph TD
    Root[ShopSmart Root] --> Client[client (Next.js)]
    Root --> Server[server (Express)]
    Root --> Packages[packages/types]
    Root --> Docs[docs]
    Root --> K8s[k8s]
    Root --> Terraform[terraform]
    
    Client --> C_Src[src]
    C_Src --> C_App[app (Next.js App Router)]
    C_Src --> C_Comp[components]
    C_Src --> C_Store[stores (Zustand)]
    C_Src --> C_Hooks[hooks (React Query)]
    C_Src --> C_Svc[services (Axios)]
    
    Server --> S_Src[src]
    S_Src --> S_Mod[modules (Domain Driven)]
    S_Src --> S_Q[queues (BullMQ)]
    S_Src --> S_W[workers]
    Server --> Prisma[prisma (Schema & Migrations)]
```
