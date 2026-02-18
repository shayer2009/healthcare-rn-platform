/** Secrets Management (supports AWS Secrets Manager, HashiCorp Vault, or env vars) */
import logger from "./logger.js";

let secretsCache = {};

export async function getSecret(key, defaultValue = null) {
  // Check cache first
  if (secretsCache[key]) {
    return secretsCache[key];
  }

  // Try AWS Secrets Manager
  if (process.env.AWS_SECRETS_MANAGER_REGION) {
    try {
      const { SecretsManagerClient, GetSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
      const client = new SecretsManagerClient({ region: process.env.AWS_SECRETS_MANAGER_REGION });
      const command = new GetSecretValueCommand({ SecretId: key });
      const response = await client.send(command);
      const secret = JSON.parse(response.SecretString);
      secretsCache[key] = secret;
      return secret;
    } catch (error) {
      logger.warn("AWS Secrets Manager not available", { error: error.message });
    }
  }

  // Try HashiCorp Vault
  if (process.env.VAULT_ADDR) {
    try {
      const vault = await import("node-vault");
      const client = vault({ endpoint: process.env.VAULT_ADDR, token: process.env.VAULT_TOKEN });
      const secret = await client.read(key);
      secretsCache[key] = secret.data;
      return secret.data;
    } catch (error) {
      logger.warn("HashiCorp Vault not available", { error: error.message });
    }
  }

  // Fallback to environment variables
  const value = process.env[key] || defaultValue;
  if (value) {
    secretsCache[key] = value;
  }
  return value;
}

export function clearSecretsCache() {
  secretsCache = {};
}
