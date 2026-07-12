# High-Level Design (HLD)

---

# 1. Introduction

## Purpose

This documentation is the high level architecture of the procurement approval system. It lies here 
the definition of the system's major components, interaction, deployment architecture, and design 
decisions that guide the implementaion of the project.

---

# 2. System Overview

Provide a short summary of the system.

Describe:

- What the system does
- Who will use it
- Core business capabilities

The procurement approval system is a web-based application that helps msme's to manage the flow of expenses, audit the expenses and streamline the purchase orders.

The system will be used by  procurement officers / Approving managers / Chief Procurement 
Officers / owners.

It's core business Capture purchasing needs, Validate against policies and budgets, Route requests to the correct approvers, Control and document spending decisions, Convert approvals into purchases, Verify delivery and payment accuracy, Provide visibility and auditability

---

# 3. Architectural Goals

- Scalability
- Maintainability
- Security
- High Availability
- Auditability
- Modularity

---

# 4. System Architecture

![System_Architecture](../diagrams/System_Architecture.png)

---

# 5. Architecture Style

## Modular Layered Architecture

The system follows a modular layered architecture. Instead of using one large monolithic code base, the system is divided into modules with specific responsibilities. The presentation layer handles user interaction through the web app. Requests pass through the API layer and authentication layer before reaching the business logic layer, which is divided into domain-specific services. The data access layer manages persistence and caching, while the data and infrastructure layer handles the primary database, read replica, cache storage, and blockchain network.

This architecture keeps the system organized and easier to maintain. It also allows each part of the system to be developed and updated independently. In addition, it gives the project a clear path for future migration to microservices if the system grows and needs to be distributed later.

---

# 6. Technology Stack

| Layer | Technology | Purpose |
|--------|------------|---------|
| Frontend | Vite | Frontend build tool and development environment |
| Backend | Express.js | Handles API requests and business logic |
| Database | Neon PostgreSQL | Stores application data |
| Blockchain | Polygon | Stores verification records for audit trails |
| Authentication | JWT & OAuth | Handles login and access control |
| Containerization | Docker | Packages the application for deployment |
| Hosting | Self-hosting / Oracle Cloud | Deploys and runs the system |

---

# 7. Major Components

## Frontend

Responsibilities

Key Interfaces

Communicates With

---

## Backend API

Responsibilities

Business Logic

Services

---

## Authentication Service

Responsibilities

Authentication Flow

Role-Based Access Control

---

## Database

Responsibilities

Primary Stored Data

Persistence Strategy

---

## Blockchain Layer

Responsibilities

Immutable Audit Logs

Verification

Hash Storage

---

## Notification Service (Optional)

Responsibilities

Email Notifications

Approval Alerts

Status Updates

---

# 8. Module Breakdown

List the major modules.

Example

- Authentication
- User Management
- Procurement Requests
- Approval Workflow
- Supplier Management
- Reporting
- Audit Trail
- Administration

Briefly explain the purpose of each module.

---

# 9. Data Flow

Illustrate the primary business flow.

Example

Employee

↓

Submit Procurement Request

↓

Validation

↓

Store Request

↓

Generate Blockchain Record

↓

Manager Approval

↓

Update Database

↓

Notify Requestor

---

# 10. Security Architecture

Explain:

Authentication

Authorization

Encryption

Blockchain Integrity

Audit Logging

HTTPS

JWT

Role-Based Access Control

---

# 11. Database Overview

Provide a high-level overview of major entities.

Example

- Users
- Roles
- Departments
- Procurement Requests
- Approval Records
- Suppliers
- Audit Logs
- Blockchain Records

(Optional)

Insert ER Diagram

---

# 12. External Systems

Describe third-party integrations.

Example

- Email Service
- Blockchain Node
- Active Directory
- Cloud Storage

---

# 13. Deployment Architecture

Insert deployment diagram.

Example

Internet

↓

Nginx

↓

Spring Boot

↓

PostgreSQL

↓

Blockchain Node

↓

Backup Server

---

# 14. Scalability Considerations

Discuss:

- Horizontal scaling
- Vertical scaling
- Stateless backend
- Connection pooling
- Database indexing
- Query optimization
- Caching strategy
- Load balancing
- Container orchestration
- Future microservices migration

---

# 15. Reliability & Availability

Describe:

- Backup strategy
- Disaster recovery
- Fault tolerance
- Monitoring
- Logging
- Health checks

---

# 16. Risks and Constraints

Identify architectural risks.

Example

Risk

Blockchain node downtime

Mitigation

Queue transactions and synchronize later

---

# 17. Assumptions

Document assumptions made during the design.

Example

- Users have internet connectivity.
- PostgreSQL remains the primary operational database.
- Blockchain is used solely for audit verification.