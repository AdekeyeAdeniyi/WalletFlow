# Wallet Service - System Architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  • Frontend Dashboard (React/Vue/etc)                           │
│  • Mobile Apps                                                   │
│  • Third-party Services (via API Keys)                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ HTTPS/HTTP
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Nginx (Port 80/443)                        │
├─────────────────────────────────────────────────────────────────┤
│  • Reverse Proxy                                                 │
│  • SSL/TLS Termination                                          │
│  • Load Balancing                                               │
│  • Security Headers                                             │
│  • Rate Limiting                                                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ HTTP
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NestJS Application (Port 3000)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Authentication Layer                        │  │
│  │  • Google OAuth Strategy                                 │  │
│  │  • JWT Token Generation & Verification                   │  │
│  │  • API Key Validation                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  API Modules                             │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │  │
│  │  │    Auth     │  │   Wallet    │  │   API Keys    │  │  │
│  │  │   Module    │  │   Module    │  │    Module     │  │  │
│  │  │             │  │             │  │               │  │  │
│  │  │ • Login     │  │ • Balance   │  │ • Create Key  │  │  │
│  │  │ • Callback  │  │ • Deposit   │  │ • List Keys   │  │  │
│  │  │             │  │ • Transfer  │  │ • Rollover    │  │  │
│  │  │             │  │ • History   │  │ • Revoke      │  │  │
│  │  └─────────────┘  └─────────────┘  └────────────────┘  │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐                      │  │
│  │  │   User      │  │  Paystack   │                      │  │
│  │  │   Module    │  │   Module    │                      │  │
│  │  │             │  │             │                      │  │
│  │  │ • Create    │  │ • Initialize│                      │  │
│  │  │ • Find      │  │ • Verify    │                      │  │
│  │  │             │  │ • Webhook   │                      │  │
│  │  └─────────────┘  └─────────────┘                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Guards & Middleware                         │  │
│  │  • AuthGuard (JWT)                                       │  │
│  │  • ApiKeyGuard (API Key)                                │  │
│  │  • CombinedAuthGuard (Both)                             │  │
│  │  • ApiKeyPermissionGuard (Role-based)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Global Filters                              │  │
│  │  • HttpExceptionFilter (Error handling)                  │  │
│  │  • ValidationPipe (Request validation)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ TypeORM
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database (Port 5432)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐             │
│  │   users    │  │  wallets   │  │ transactions │             │
│  ├────────────┤  ├────────────┤  ├──────────────┤             │
│  │ • id       │  │ • id       │  │ • id         │             │
│  │ • email    │  │ • user_id  │  │ • user_id    │             │
│  │ • name     │  │ • balance  │  │ • wallet_id  │             │
│  │ • google_id│  │ • wallet_# │  │ • type       │             │
│  └────────────┘  └────────────┘  │ • amount     │             │
│                                   │ • status     │             │
│  ┌────────────┐  ┌──────────────┐│ • reference  │             │
│  │  api_keys  │  │  paystack_   │└──────────────┘             │
│  ├────────────┤  │  transactions│                              │
│  │ • id       │  ├──────────────┤                              │
│  │ • user_id  │  │ • id         │                              │
│  │ • key_hash │  │ • reference  │                              │
│  │ • name     │  │ • amount     │                              │
│  │ • perms    │  │ • status     │                              │
│  │ • expires  │  │ • user_id    │                              │
│  └────────────┘  └──────────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                     ┌──────────────┐
                     │   External   │
                     │   Services   │
                     ├──────────────┤
                     │ • Google     │
                     │   OAuth      │
                     │              │
                     │ • Paystack   │
                     │   Payment    │
                     └──────────────┘
```

## Resource Requirements

### Development Environment
- **CPU**: 2 cores minimum
- **RAM**: 4GB minimum
- **Storage**: 5GB
- **Node.js**: v20+
- **PostgreSQL**: v16

### Production Environment (Recommended)
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 20GB SSD
- **Database**: Separate PostgreSQL instance with replication
- **Load Balancer**: Nginx or cloud load balancer

## Request Flow

### 1. User Authentication Flow
```
User → Nginx → NestJS → Google OAuth
                  ↓
            Generate JWT
                  ↓
            Create Wallet
                  ↓
            Store in DB → Return Tokens
```

### 2. Deposit Flow
```
User → Nginx → NestJS (Auth) → Paystack API
                  ↓
         Create Transaction Record
                  ↓
            Return Payment URL
                  ↓
    User pays → Paystack Webhook → Update Wallet
```

### 3. Transfer Flow
```
User → Nginx → NestJS (Auth) → Start Transaction
                  ↓
         Lock Sender & Receiver Wallets
                  ↓
         Validate Balance & Fees
                  ↓
         Update Both Wallets
                  ↓
         Create Transaction Records
                  ↓
         Commit Transaction → Return Success
```

## Docker Resources

### Container Specifications

**Nginx Container**
- Image: nginx:alpine (~5MB)
- CPU: 0.5 cores
- RAM: 128MB
- Ports: 80, 443

**NestJS Container**
- Image: node:20-alpine (~150MB)
- CPU: 1-2 cores
- RAM: 512MB - 1GB
- Ports: 3000 (internal)

**PostgreSQL Container**
- Image: postgres:16 (~300MB)
- CPU: 1-2 cores
- RAM: 512MB - 2GB
- Storage: Persistent volume
- Ports: 5432

### Total Resource Usage
- **Images**: ~455MB
- **Running Memory**: 1-4GB
- **CPU**: 2.5-5 cores
- **Storage**: 5-10GB (with data)

## Performance Metrics

### Expected Capacity
- **Concurrent Users**: 1,000+
- **Requests/sec**: 100-500
- **Database Connections**: 20-50
- **Response Time**: <200ms (avg)

### Scalability Options
1. **Horizontal Scaling**: Add more NestJS containers
2. **Database Replication**: Read replicas for queries
3. **Caching**: Redis for session/API key caching
4. **CDN**: For static assets
5. **Load Balancing**: Multiple Nginx instances

## Monitoring Recommendations

### Application Metrics
- Request rate and response times
- Error rates by endpoint
- Authentication success/failure rates
- Database query performance

### Infrastructure Metrics
- CPU and memory usage per container
- Network I/O
- Database connections
- Disk usage and I/O

### Business Metrics
- Active wallets
- Transaction volume
- Deposit success rate
- Transfer completion rate

## Security Layers

1. **Network**: Nginx reverse proxy
2. **Application**: JWT tokens, API keys
3. **Database**: Connection pooling, prepared statements
4. **Data**: Encrypted sensitive fields
5. **Logging**: Audit trail for all transactions
