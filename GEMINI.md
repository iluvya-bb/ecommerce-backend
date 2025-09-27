# Project Analysis: ecommerce-backend

*   **Purpose:** The central REST API, handling all business logic, data, and authentication for the platform.
*   **Architecture:** A multi-tenant Node.js/Express.js application using Sequelize with a SQL database (likely PostgreSQL) to isolate data for each "school" or tenant.
*   **Technology:** Node.js, Express.js, Sequelize, PostgreSQL (inferred), JWT/Keycloak, AWS S3.
*   **Key Features:** Manages products, orders, users, content, and settings, serving data to both frontend applications.

**Note:** Be careful when modifying database logic. The multi-tenant setup is complex and requires careful handling to avoid breaking changes.
