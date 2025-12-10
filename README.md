# Wallet Service API

A secure, production-ready wallet service built with NestJS, TypeORM, PostgreSQL, and integrated with Google OAuth and Paystack payment gateway.

## Features

- 🔐 **Google OAuth Authentication** - Secure user authentication via Google
- 💳 **Paystack Integration** - Deposit funds via Paystack payment gateway
- 💰 **Wallet Management** - Create wallets, check balances, transfer funds
- 📊 **Transaction History** - Track all wallet transactions with pagination
- 🔑 **API Key Authentication** - Generate and manage API keys with custom permissions
- 🛡️ **Security** - JWT tokens, API key validation, role-based access control
- 📝 **TypeORM Migrations** - Database schema version control
- 🐳 **Docker Support** - Containerized deployment with Docker Compose
- ✅ **Input Validation** - Request validation with class-validator
- 🔄 **Standardized Responses** - Consistent API response format
- 📚 **Swagger Documentation** - Interactive API documentation with Swagger UI

## Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript
- **Database**: PostgreSQL 16
- **ORM**: TypeORM 0.3.28
- **Authentication**: Passport + JWT + Google OAuth2
- **Payment**: Paystack API
- **Container**: Docker & Docker Compose

## Prerequisites

- Node.js 20+
- pnpm (package manager)
- Docker & Docker Compose
- PostgreSQL 16 (if not using Docker)
- Paystack account (for payment integration)
- Google OAuth credentials

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=wallet_user
DB_PASSWORD=wallet_password
DB_NAME=wallet_db
DB_SYNCHRONIZE=false
DB_LOGGING=false

# JWT
JWT_SECRET=your-secure-secret-key-here
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
FRONTEND_DASHBOARD_URL=http://localhost:3001

# Paystack
PAYSTACK_SECRET_KEY=your-paystack-secret-key
PAYSTACK_BASE_URL=https://api.paystack.co

# API
API_KEY_PREFIX=sk_live_
PORT=3000
API_VERSION=api/v1
CORS_ORIGIN=*
```

## Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials
```

## Database Setup

### Option 1: Using Docker (Recommended)

```bash
# Start PostgreSQL only
docker-compose up postgres -d

# Run migrations
pnpm run migration:run
```

### Option 2: Local PostgreSQL

```bash
# Create database
createdb wallet_db

# Run migrations
pnpm run migration:run
```

## Running the Application

### Development Mode

```bash
# Watch mode with hot reload
pnpm run start:dev
```

### Production Mode

```bash
# Build the application
pnpm run build

# Run production build
pnpm run start:prod
```

### Using Docker Compose (Full Stack)

```bash
# Start both PostgreSQL and NestJS app
docker-compose up -d

# View logs
docker-compose logs -f wallet_service

# Stop services
docker-compose down
```

## API Documentation

### Swagger UI

Interactive API documentation is available at: **`http://localhost:3000/api/docs`**

The Swagger UI provides:
- 📋 Complete API endpoint documentation
- 🧪 Interactive API testing (Try it out)
- 📝 Request/response schemas
- 🔐 Built-in authentication (JWT and API Key)
- 💡 Example requests and responses

Base URL: `http://localhost:3000/api/v1`

### Response Format

All API responses follow this standardized format:

```json
{
  "status": true,
  "message": "Success message",
  "data": {}
}
```

Error responses:

```json
{
  "status": false,
  "message": "Error message",
  "data": {}
}
```

### Authentication Endpoints

#### Google OAuth Login

```
GET /auth/google
```

#### Google OAuth Callback

```
GET /auth/google/callback
```

### Wallet Endpoints

All wallet endpoints require authentication (JWT token or API key).

#### Get Balance

```http
GET /wallet/balance
Authorization: Bearer <jwt_token>
```

Response:

```json
{
  "status": true,
  "message": "Balance retrieved successfully",
  "data": {
    "balance": 5000.0
  }
}
```

#### Initiate Deposit

```http
POST /wallet/deposit
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": 1000
}
```

Response:

```json
{
  "status": true,
  "message": "Deposit initiated successfully",
  "data": {
    "reference": "PSK1234567890",
    "authorization_url": "https://checkout.paystack.com/..."
  }
}
```

#### Transfer Funds

```http
POST /wallet/transfer
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "wallet_number": "WLT1234567890",
  "amount": 500
}
```

Response:

```json
{
  "status": true,
  "message": "Transfer completed successfully",
  "data": {
    "transaction_ref": "TRF1234567890"
  }
}
```

#### Get Transactions

```http
GET /wallet/transactions?page=1&limit=50
Authorization: Bearer <jwt_token>
```

Response:

```json
{
  "status": true,
  "message": "Transactions retrieved successfully",
  "data": {
    "transactions": [...],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 50,
      "pages": 2
    }
  }
}
```

#### Get Deposit Status

```http
GET /wallet/deposit/:reference/status
Authorization: Bearer <jwt_token>
```

### API Key Endpoints

#### Create API Key

```http
POST /api-keys/create
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "My API Key",
  "permissions": ["read", "deposit", "transfer"],
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

#### Get All API Keys

```http
GET /api-keys
Authorization: Bearer <jwt_token>
```

#### Rollover API Key

```http
POST /api-keys/rollover
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "keyId": "uuid-here"
}
```

#### Revoke API Key

```http
DELETE /api-keys/:id
Authorization: Bearer <jwt_token>
```

### Webhook Endpoints

#### Paystack Webhook

```http
POST /wallet/paystack/webhook
X-Paystack-Signature: signature-here
Content-Type: application/json
```

This endpoint is public and handles Paystack payment confirmations.

## Database Migrations

```bash
# Generate migration from entity changes
pnpm run migration:generate src/migrations/MigrationName

# Create empty migration file
pnpm run migration:create src/migrations/MigrationName

# Run pending migrations
pnpm run migration:run

# Revert last migration
pnpm run migration:revert
```

## Authentication Methods

### 1. JWT Token (User Authentication)

After Google OAuth login, you receive an access token:

```http
Authorization: Bearer <jwt_token>
```

### 2. API Key (Service Authentication)

Use generated API keys for service-to-service communication:

```http
X-API-Key: sk_live_your_api_key_here
```

### 3. Combined Authentication

Some endpoints support both methods. The guard checks for API key first, then JWT.

## Project Structure

```
src/
├── api-keys/          # API key management
├── auth/              # Authentication & authorization
├── common/            # Shared modules (guards, filters, decorators)
├── database/          # Database configuration
├── entities/          # TypeORM entities
├── migrations/        # Database migrations
├── paystack/          # Paystack integration
├── user/              # User management
├── wallets/           # Wallet operations
└── main.ts            # Application entry point
```

## Security Features

- 🔐 JWT token authentication with refresh tokens
- 🔑 API key authentication with permissions
- 🛡️ Request validation and sanitization
- 🚫 Rate limiting ready
- 🔒 CORS configuration
- 📝 Audit logging via transactions
- 💳 Webhook signature verification

## Deployment

### Docker Production Deployment

```bash
# Build and start with production settings
docker-compose up -d

# Scale the application (if needed)
docker-compose up -d --scale wallet_service=3
```

### Environment Considerations

- Set `DB_SYNCHRONIZE=false` in production
- Use strong `JWT_SECRET` (64+ characters)
- Configure proper `CORS_ORIGIN`
- Set up SSL/TLS certificates
- Use environment-specific `.env` files

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
