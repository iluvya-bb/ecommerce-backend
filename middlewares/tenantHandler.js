export const dbMiddleware = (db) => (req, res, next) => {
  req.db = db; // Attach the database instance to the request object
  next();
};

export async function pickTenant(req, res, next) {
  try {
    const tenantName = req.headers["x-tenant"]; // Example: Get tenant from request header

    if (!tenantName || !req.db[tenantName]) {
      req.tenant = req.db["ecommerce"]; // Attach tenant-specific DB to request
    } else {
      req.tenant = req.db[tenantName]; // Attach tenant-specific DB to request
    }

    next();
  } catch (error) {
    console.error("Error in pickTenant middleware:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}