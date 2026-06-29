# revest-microservices-api

NestJS microservices assignment — Product and Order management services communicating via RabbitMQ.

- **product-service** — REST CRUD for products, runs on port 3001
- **order-service** — REST CRUD for orders, runs on port 3002. Communicates with product-service via RabbitMQ to validate stock, deduct inventory, and enrich order responses with live product data

## Tech Stack

- NestJS 10
- PostgreSQL + TypeORM (`synchronize: true` — no migrations needed)
- RabbitMQ (`@nestjs/microservices` with Transport.RMQ)
- Docker Compose

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for the Docker option
- Node.js 20+ — for running locally without Docker

---

## Option 1 — Run with Docker (recommended)

```bash
docker-compose up --build
```

All services, databases, and RabbitMQ start automatically. No extra setup needed.

| Service | URL |
|---|---|
| Product Service | http://localhost:3001 |
| Order Service | http://localhost:3002 |
| RabbitMQ Management UI | http://localhost:15672 |

RabbitMQ credentials: `guest / guest`

---

## Option 2 — Run locally

### 1. Install dependencies

```bash
cd product-service && npm install
cd ../order-service && npm install
```

### 2. Set up PostgreSQL

Make sure PostgreSQL is running locally and create two databases:

```sql
CREATE DATABASE products_db;
CREATE DATABASE orders_db;
```

### 3. Configure environment variables

Each service has a `.env` file. Update the credentials to match your local setup:

**product-service/.env**
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_password
DB_NAME=products_db
RABBITMQ_URL=amqp://guest:guest@localhost:5672
PORT=3001
```

**order-service/.env**
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_password
DB_NAME=orders_db
RABBITMQ_URL=amqp://guest:guest@localhost:5672
PRODUCT_SERVICE_URL=http://localhost:3001
PORT=3002
```

### 4. Start RabbitMQ

If you have Docker available just for RabbitMQ:

```bash
docker run -d --hostname rabbitmq --name rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3.12-management-alpine
```

Or use a local RabbitMQ installation.

### 5. Start the services

Open two terminals:

```bash
# Terminal 1 — Product Service
cd product-service
npm run start:dev

# Terminal 2 — Order Service
cd order-service
npm run start:dev
```

Both services use `synchronize: true` so the database tables are created automatically on startup.

---

## API Reference

### Product Service — http://localhost:3001

| Method | Endpoint | Description |
|---|---|---|
| POST | /products | Create a product |
| GET | /products | List all products |
| GET | /products/:id | Get product by ID |
| PUT | /products/:id | Update product |
| DELETE | /products/:id | Delete product |

**Create product body:**
```json
{
  "name": "Nike Air Max",
  "description": "Running shoes",
  "price": 129.99,
  "stock": 50,
  "category": "Footwear"
}
```

### Order Service — http://localhost:3002

| Method | Endpoint | Description |
|---|---|---|
| POST | /orders | Create an order |
| GET | /orders | List all orders (with live product data) |
| GET | /orders/:id | Get order by ID (with live product data) |
| PUT | /orders/:id | Update order status |
| DELETE | /orders/:id | Delete order |

**Create order body:**
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "items": [
    { "productId": "<product-uuid>", "quantity": 2 }
  ]
}
```

**Update order status body:**
```json
{ "status": "CONFIRMED" }
```

Valid statuses: `PENDING`, `CONFIRMED`, `CANCELLED`

---

## How it works

When an order is created, the order service:
1. Fetches product details from the product service via RabbitMQ (`get_products_by_ids`)
2. Deducts stock for each item via RabbitMQ (`deduct_stock`)
3. Saves the order with enriched data (product name, unit price, subtotal)

When fetching orders (`GET /orders`, `GET /orders/:id`), the order service fetches live product data from the product service and attaches it to each order item in the response.
