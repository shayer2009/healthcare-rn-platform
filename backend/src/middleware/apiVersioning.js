/** API Versioning Middleware */
export function apiVersioning(req, res, next) {
  // Extract version from header or URL
  const version = req.headers["api-version"] || req.query.api_version || "v1";
  
  // Set version in request for use in routes
  req.apiVersion = version;
  
  // Add version to response headers
  res.setHeader("API-Version", version);
  
  next();
}

// Route versioning helper
export function versionedRoute(versions, handler) {
  return (req, res, next) => {
    const version = req.apiVersion || "v1";
    if (versions[version]) {
      return versions[version](req, res, next);
    }
    return res.status(404).json({ error: `API version ${version} not found` });
  };
}
