/** Swagger/OpenAPI Configuration */
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "World Health Portal API",
      version: "1.0.0",
      description: "Global health data exchange and coordination platform API",
      contact: {
        name: "API Support",
        email: "support@worldhealthportal.local"
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:4000",
        description: "Development server"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                message: { type: "string" },
                stack: { type: "string" }
              }
            }
          }
        },
        Patient: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" }
          }
        },
        Doctor: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            email: { type: "string" },
            specialization: { type: "string" }
          }
        }
      }
    },
    tags: [
      { name: "Authentication", description: "User authentication endpoints" },
      { name: "Patients", description: "Patient management" },
      { name: "Doctors", description: "Doctor management" },
      { name: "Appointments", description: "Appointment scheduling" },
      { name: "Prescriptions", description: "E-prescribing" },
      { name: "FHIR", description: "HL7 FHIR R4 endpoints" },
      { name: "Compliance", description: "HIPAA/GDPR compliance" },
      { name: "Integrations", description: "External system integrations" },
      { name: "Health", description: "Health check endpoints" }
    ]
  },
  apis: ["./src/routes/*.js", "./src/server.js"]
};

export const swaggerSpec = swaggerJsdoc(options);
