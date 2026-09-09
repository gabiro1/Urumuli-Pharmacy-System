import * as authService from './auth.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password, req.ip, req.get('User-Agent'));
    return sendSuccess(res, result, 'Login successful');
  } catch (error) {
    next(error);
  }
}

export async function verifyTwoFactorLogin(req, res, next) {
  try {
    const { tempToken, code } = req.body;
    const result = await authService.verifyTwoFactorLogin(tempToken, code, req.ip, req.get('User-Agent'));
    return sendSuccess(res, result, 'Two-factor authentication successful');
  } catch (error) {
    next(error);
  }
}

export async function setupTwoFactor(req, res, next) {
  try {
    const result = await authService.setupTwoFactor(req.user.userId, req.user.userId, req.ip, req.get('User-Agent'));
    return sendSuccess(res, result, 'Two-factor authentication setup initiated');
  } catch (error) {
    next(error);
  }
}

export async function verifyTwoFactorSetup(req, res, next) {
  try {
    const { code } = req.body;
    const result = await authService.verifyTwoFactorSetup(req.user.userId, code, req.user.userId, req.ip, req.get('User-Agent'));
    return sendSuccess(res, result, 'Two-factor authentication verified');
  } catch (error) {
    next(error);
  }
}

export async function disableTwoFactor(req, res, next) {
  try {
    const result = await authService.disableTwoFactor(req.user.userId, req.user.userId, req.ip, req.get('User-Agent'));
    return sendSuccess(res, result, 'Two-factor authentication disabled');
  } catch (error) {
    next(error);
  }
}

export async function register(req, res, next) {
  try {
    const result = await authService.register(req.body, req.ip, req.get('User-Agent'));
    return sendCreated(res, result, 'Registration successful');
  } catch (error) {
    next(error);
  }
}

export async function registerPatient(req, res, next) {
  try {
    const result = await authService.registerPatient(req.body, req.ip, req.get('User-Agent'));
    return sendCreated(res, result, 'Patient registration successful');
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshTokens(refreshToken, req.ip, req.get('User-Agent'));
    return sendSuccess(res, result, 'Tokens refreshed');
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body.email);
    return sendSuccess(res, result, 'If the account exists, password reset instructions are available.');
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    return sendSuccess(res, null, 'Password reset successfully');
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    await authService.logout(req.user.userId, refreshToken, req.ip, req.get('User-Agent'));
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(
      req.user.userId, currentPassword, newPassword,
      req.ip, req.get('User-Agent')
    );
    return sendSuccess(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.userId);
    return sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

export async function getPatientProfile(req, res, next) {
  try {
    const profile = await authService.getPatientProfile(req.user.userId);
    return sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
}

export async function updatePatientProfile(req, res, next) {
  try {
    const profile = await authService.updatePatientProfile(req.user.userId, req.body);
    return sendSuccess(res, profile, 'Profile updated');
  } catch (error) {
    next(error);
  }
}

export async function getPatientSettings(req, res, next) {
  try {
    const settings = await authService.getPatientSettings(req.user.userId);
    return sendSuccess(res, settings);
  } catch (error) {
    next(error);
  }
}

export async function updatePatientSettings(req, res, next) {
  try {
    const settings = await authService.updatePatientSettings(
      req.user.userId,
      req.body,
      req.ip,
      req.get('User-Agent')
    );
    return sendSuccess(res, settings, 'Settings updated');
  } catch (error) {
    next(error);
  }
}

export async function listUsers(req, res, next) {
  try {
    const { page, limit, role, isActive } = req.query;
    const result = await authService.listUsers(
      parseInt(page) || 1, parseInt(limit) || 20,
      role, isActive === undefined ? undefined : isActive === 'true'
    );
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function listRoles(req, res, next) {
  try {
    const roles = await authService.getRoles();
    return sendSuccess(res, roles);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const result = await authService.createUser(req.body, req.ip, req.get('User-Agent'));
    return sendCreated(res, result, 'User created successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;
    const result = await authService.updateUserRole(
      req.params.id,
      role,
      req.user.userId,
      req.ip,
      req.get('User-Agent')
    );
    return sendSuccess(res, result, 'User role updated');
  } catch (error) {
    next(error);
  }
}

export async function updateUserActiveStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    const result = await authService.updateUserActiveStatus(
      req.params.id,
      isActive,
      req.user.userId,
      req.ip,
      req.get('User-Agent')
    );
    return sendSuccess(res, result, 'User status updated');
  } catch (error) {
    next(error);
  }
}

export async function createInvitation(req, res, next) {
  try {
    const result = await authService.createInvitation(
      req.body,
      req.user.userId,
      req.ip,
      req.get('User-Agent')
    );
    return sendCreated(res, result, 'Invitation created');
  } catch (error) {
    next(error);
  }
}

export async function acceptInvitation(req, res, next) {
  try {
    const result = await authService.acceptInvitation(
      req.body.token,
      req.body,
      req.ip,
      req.get('User-Agent')
    );
    return sendCreated(res, result, 'Invitation accepted');
  } catch (error) {
    next(error);
  }
}

export async function listInvitations(req, res, next) {
  try {
    const { page, limit, status } = req.query;
    const result = await authService.listInvitations(
      parseInt(page) || 1,
      parseInt(limit) || 20,
      status
    );
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function revokeInvitation(req, res, next) {
  try {
    const result = await authService.revokeInvitation(
      req.params.id,
      req.user.userId,
      req.ip,
      req.get('User-Agent')
    );
    return sendSuccess(res, result, 'Invitation revoked');
  } catch (error) {
    next(error);
  }
}

export async function resendInvitation(req, res, next) {
  try {
    const result = await authService.resendInvitation(
      req.params.id,
      req.user.userId,
      req.ip,
      req.get('User-Agent')
    );
    return sendSuccess(res, result, 'Invitation resent');
  } catch (error) {
    next(error);
  }
}
