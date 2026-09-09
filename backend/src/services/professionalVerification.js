/**
 * Professional Verification Provider
 *
 * Abstraction layer for verifying pharmacy professional credentials.
 * Currently implements a mock provider for development/testing.
 *
 * Architecture is ready for future integration with:
 * - National Pharmacy Council of Rwanda (NPC)
 * - Rwanda Medical and Dental Council
 * - Any other regulatory body
 *
 * To integrate a real provider:
 * 1. Create a new provider class implementing the same interface
 * 2. Set PROFESSIONAL_VERIFICATION_PROVIDER env var to the provider name
 * 3. The factory function below will select the correct implementation
 */

import { PROFESSIONAL_VERIFICATION_STATUS, PROFESSIONAL_ROLES } from '../constants.js';

// ============================================================
// Mock Provider (development/testing)
// ============================================================
class MockVerificationProvider {
  name = 'mock-npc';

  /**
   * Submit professional credentials for verification.
   * In production, this would call the NPC API.
   * @param {Object} credentials - Professional credentials
   * @param {string} credentials.registrationNumber - Professional registration number
   * @param {string} credentials.licenseNumber - License number
   * @param {Date} credentials.licenseExpiry - License expiry date
   * @param {string} credentials.issuingAuthority - License issuing authority
   * @returns {Promise<Object>} Verification result
   */
  async verifyProfessional(credentials) {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const { registrationNumber, licenseNumber, licenseExpiry } = credentials;

    // Basic validation for mock provider
    if (!registrationNumber && !licenseNumber) {
      return {
        status: 'REJECTED',
        reason: 'Both registration number and license number are required',
        verifiedAt: new Date().toISOString(),
        provider: this.name,
      };
    }

    // Check if license is expired
    if (licenseExpiry && new Date(licenseExpiry) < new Date()) {
      return {
        status: 'EXPIRED',
        reason: 'The provided license has expired',
        verifiedAt: new Date().toISOString(),
        provider: this.name,
      };
    }

    // Mock: accept all valid-looking credentials
    // In production, this would verify against the NPC database
    return {
      status: 'VERIFIED',
      verifiedAt: new Date().toISOString(),
      provider: this.name,
      details: {
        registrationNumber: registrationNumber || null,
        licenseNumber: licenseNumber || null,
        licenseExpiry: licenseExpiry || null,
      },
    };
  }

  /**
   * Check current verification status of a professional.
   * @param {string} registrationNumber - Professional registration number
   * @returns {Promise<Object>} Status information
   */
  async getProfessionalStatus(registrationNumber) {
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Mock: assume all registered professionals are in good standing
    return {
      registrationNumber,
      status: 'ACTIVE',
      lastChecked: new Date().toISOString(),
      provider: this.name,
    };
  }

  /**
   * Check if a professional license is currently active and not expired.
   * @param {string} licenseNumber - License number
   * @param {Date} licenseExpiry - License expiry date
   * @returns {Promise<Object>} License status
   */
  async getLicenseStatus(licenseNumber, licenseExpiry) {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const isExpired = licenseExpiry && new Date(licenseExpiry) < new Date();

    return {
      licenseNumber,
      isActive: !isExpired,
      expiryDate: licenseExpiry || null,
      status: isExpired ? 'EXPIRED' : 'ACTIVE',
      lastChecked: new Date().toISOString(),
      provider: this.name,
    };
  }
}

// ============================================================
// Production Provider (placeholder for future NPC integration)
// ============================================================
class NpcVerificationProvider {
  name = 'npc-rwanda';

  async verifyProfessional(credentials) {
    // TODO: Integrate with National Pharmacy Council of Rwanda API
    // This is a placeholder that delegates to the mock provider
    // until the official API is available.
    console.warn(
      '[ProfessionalVerification] NPC provider not yet implemented, falling back to mock'
    );
    const mock = new MockVerificationProvider();
    return mock.verifyProfessional(credentials);
  }

  async getProfessionalStatus(registrationNumber) {
    const mock = new MockVerificationProvider();
    return mock.getProfessionalStatus(registrationNumber);
  }

  async getLicenseStatus(licenseNumber, licenseExpiry) {
    const mock = new MockVerificationProvider();
    return mock.getLicenseStatus(licenseNumber, licenseExpiry);
  }
}

// ============================================================
// Factory
// ============================================================
const providers = {
  mock: MockVerificationProvider,
  npc: NpcVerificationProvider,
};

let activeProvider = null;

/**
 * Get the active professional verification provider.
 * Defaults to mock in development, npc in production (when available).
 */
export function getVerificationProvider() {
  if (activeProvider) return activeProvider;

  const providerName = process.env.PROFESSIONAL_VERIFICATION_PROVIDER || 'mock';
  const ProviderClass = providers[providerName] || MockVerificationProvider;

  activeProvider = new ProviderClass();
  console.log(`[ProfessionalVerification] Using provider: ${activeProvider.name}`);
  return activeProvider;
}

/**
 * Check if a professional role requires verification.
 * @param {string} role - User role
 * @returns {boolean}
 */
export function requiresVerification(role) {
  return PROFESSIONAL_ROLES.includes(role);
}
