# XWZ Parking Management System
### Microservices-based Car Parking Management | Kigali, Rwanda

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND (React)               │
│                  http://localhost:3000           │
└────────────────────────┬────────────────────────┘
                         │
┌────────────────────────▼────────────────────────┐
│              API GATEWAY  :5000                  │
│         (Routing, CORS, Rate Limiting)           │
└──┬─────────────┬──────────────┬──────────┬──────┘
   │             │              │          │
   ▼             ▼              ▼          ▼
:5001         :5002           :5003      :5004
Auth          Parking         Entry      Report
Service       Service         Service    Service
   │             │              │          │
   └─────────────┴──────────────┴──────────┘
                         │
              ┌──────────▼──────────┐
              │   PostgreSQL :5433  │
              └─────────────────────┘
```

## 📦 Services

| Service | Port | Responsibility |
|---------|------|----------------|
| API Gateway | 5000 | Request routing, CORS, Rate limiting |
| Auth Service | 5001 | User registration, login, JWT tokens |
| Parking Service | 5002 | Parking CRUD management |
| Entry Service | 5003 | Car entry/exit, tickets, bills |
| Report Service | 5004 | Analytics, reports |
| Frontend | 3000 | React.js UI |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (recommended)

---

### Option A: Docker Compose (Recommended - Super Fast)

This project uses GitHub Actions CI/CD to pre-build all microservices. You do NOT need to wait for your PC to compile them!

```bash
# 1. Pull the pre-built cloud images (takes seconds)
docker-compose pull

# 2. Start all services in the background
docker-compose up -d

# 3. Initialize database (first time only)
docker exec -i xwz-parking-postgres-1 psql -U xwz -d xwz_parking < schema.sql
```

### Option B: Manual Setup

#### 1. Setup PostgreSQL
```bash
psql -U postgres
CREATE DATABASE xwz_parking;
\q

psql -U postgres -d xwz_parking -f schema.sql 
```

#### 2. Start API Gateway
```bash
cd api-gateway
npm install
cp .env.example .env  
npm start
```

#### 3. Start Auth Service
```bash
cd services/auth-service
npm install
npm start
```

#### 4. Start Parking Service
```bash
cd services/parking-service
npm install
npm start
```

#### 5. Start Entry Service
```bash
cd services/entry-service
npm install
npm start
```

#### 6. Start Report Service
```bash
cd services/report-service
npm install
npm start
```

#### 7. Start Frontend
```bash
cd frontend
npm install
npm start
```

---



## 📚 API Documentation

Swagger UI available at: **http://localhost:5000/api/docs**

---

## 🔐 Authentication

All API endpoints (except `/auth/register` and `/auth/login`) require a JWT token:

```
Authorization: Bearer <jwt_token>
```

---

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access: manage users, parkings, entries, reports |
| `parking_tenant` | View parkings, register car entries/exits |

---

## 📋 Key Features

### Task 1 — Database & Users
- ✅ PostgreSQL schema with UUID primary keys
- ✅ Users table: id, firstName, lastName, email, password
- ✅ Indexes on frequently queried columns
- ✅ Automatic `updated_at` through triggers

### Task 2 — Authentication & Roles
- ✅ JWT-based authentication (24h expiry)
- ✅ Roles: `admin`, `parking_tenant`
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Role-based access control middleware
- ✅ Password validation (uppercase, lowercase, number, special char)

### Task 3 — Parking Management
- ✅ Register parking: code, name, spaces, location, fee/hr
- ✅ Real-time available space tracking
- ✅ Occupancy rate calculation
- ✅ Pagination on all list endpoints

### Task 4 — Car Entry/Exit
- ✅ Register entry with auto-generated ticket number
- ✅ Exit time validation (cannot be before entry time)
- ✅ Duplicate entry prevention (same plate already parked)
- ✅ Full parking validation (no space → reject)
- ✅ Automatic charge calculation: `duration_hours × fee_per_hour`
- ✅ Available spaces auto-update on entry/exit
- ✅ Ticket generation on entry
- ✅ Bill generation on exit

### Task 5 — Reports
- ✅ Outgoing cars between two datetimes with total revenue
- ✅ Entered cars between two datetimes
- ✅ Dashboard: real-time stats per parking
- ✅ CSV export
- ✅ Pagination

---

## 🛡️ Security

- Helmet.js headers on all services
- CORS configured (whitelist-based)
- Rate limiting: 200 requests/15min per IP
- Input validation with Joi (server-side)
- Client-side validation on all forms
- SQL injection prevention via parameterized queries
- JWT token expiry enforcement

---

## 🗄️ Database Schema

```sql
users         — id, first_name, last_name, email, password, role, is_active
parkings      — id, code, name, total_spaces, available_spaces, location, fee_per_hour
car_entries   — id, plate_number, parking_code, entry_datetime, exit_datetime,
                charged_amount, ticket_number, status, attendant_id
```

---

## 📁 Project Structure

```
xwz-parking/
├── docker-compose.yml
├── schema.sql
├── swagger.yaml
├── README.md
├── api-gateway/
│   └── src/index.js
├── services/
│   ├── auth-service/
│   ├── parking-service/
│   ├── entry-service/
│   └── report-service/
└── frontend/
    └── src/
        ├── pages/
        ├── components/
        ├── services/
        └── context/
```
