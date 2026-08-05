import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  COOKIE_SECURE: Joi.boolean().default(false),
  PORT: Joi.number().default(3000),
  FRONTEND_URL: Joi.string().default('http://localhost:5173'),
  VAPID_PUBLIC_KEY: Joi.string().allow('').optional(),
  VAPID_PRIVATE_KEY: Joi.string().allow('').optional(),
  VAPID_SUBJECT: Joi.string().allow('').optional(),
});
