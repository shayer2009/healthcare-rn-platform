/** Input Validation Middleware using Joi */
import Joi from "joi";
import { AppError } from "../utils/errorHandler.js";

export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(
      {
        body: req.body,
        query: req.query,
        params: req.params
      },
      { abortEarly: false, stripUnknown: true }
    );

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message
      }));
      return next(new AppError("Validation error", 400, true, errors));
    }

    // Replace request data with validated and sanitized values
    req.body = value.body || req.body;
    req.query = value.query || req.query;
    req.params = value.params || req.params;

    next();
  };
}

// Common validation schemas
export const schemas = {
  login: Joi.object({
    body: Joi.object({
      email: Joi.string().email().required().trim().lowercase(),
      password: Joi.string().min(6).required()
    })
  }),

  signup: Joi.object({
    body: Joi.object({
      name: Joi.string().min(2).max(100).required().trim(),
      email: Joi.string().email().required().trim().lowercase(),
      password: Joi.string().min(6).required(),
      phone: Joi.string().optional().trim()
    })
  }),

  updateProfile: Joi.object({
    body: Joi.object({
      name: Joi.string().min(2).max(100).optional().trim(),
      phone: Joi.string().optional().trim(),
      address: Joi.string().optional().trim()
    })
  }),

  createAppointment: Joi.object({
    body: Joi.object({
      doctor_id: Joi.number().integer().positive().required(),
      slot_start: Joi.date().iso().required(),
      reason: Joi.string().max(500).optional().trim()
    })
  }),

  createPrescription: Joi.object({
    body: Joi.object({
      patient_id: Joi.number().integer().positive().required(),
      medications: Joi.array().items(
        Joi.object({
          name: Joi.string().required().trim(),
          dosage: Joi.string().required().trim(),
          frequency: Joi.string().required().trim(),
          duration: Joi.string().optional().trim()
        })
      ).min(1).required(),
      instructions: Joi.string().optional().trim()
    })
  }),

  fhirResource: Joi.object({
    params: Joi.object({
      resourceType: Joi.string().valid("Patient", "Observation", "Encounter", "MedicationRequest").required(),
      id: Joi.string().optional()
    })
  }),

  consent: Joi.object({
    body: Joi.object({
      consent_type: Joi.string().valid("data_sharing", "research", "marketing", "cross_border").required(),
      granted_to_type: Joi.string().optional(),
      granted_to_id: Joi.number().integer().optional(),
      expires_at: Joi.date().iso().optional()
    })
  }),

  gdprRequest: Joi.object({
    body: Joi.object({
      request_type: Joi.string().valid("access", "rectification", "erasure", "portability", "restriction").required()
    })
  }),

  pagination: Joi.object({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10)
    })
  })
};
