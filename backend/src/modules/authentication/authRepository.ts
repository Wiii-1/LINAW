import { prisma } from "../../config/database.js";

export class AuthRepository {
  async findPendingRegistrationByEmail(email: string) {
    return prisma.pendingRegistration.findUnique({ where: { email } });
  }

  async findPendingRegistration(id: string, email: string) {
    return prisma.pendingRegistration.findFirst({
      where: { id, email },
    });
  }

  async createOrUpdatePendingRegistration(data: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    password_hash: string;
    invitation_token_hash?: string;
    otp_hash: string;
    otp_expires_at: Date;
    last_sent_at: Date;
  }) {
    return prisma.pendingRegistration.upsert({
      where: { email: data.email },
      create: data,
      update: {
        first_name: data.first_name,
        last_name: data.last_name,
        password_hash: data.password_hash,
        invitation_token_hash: data.invitation_token_hash,
        otp_hash: data.otp_hash,
        otp_expires_at: data.otp_expires_at,
        otp_attempts: 0,
        last_sent_at: data.last_sent_at,
        consumed_at: null,
        verified_at: null,
      },
    });
  }

  async updatePendingOtp(data: {
    id: string;
    email: string;
    otp_hash: string;
    otp_expires_at: Date;
    last_sent_at: Date;
    not_sent_since: Date;
  }) {
    return prisma.pendingRegistration.updateMany({
      where: {
        id: data.id,
        email: data.email,
        consumed_at: null,
        last_sent_at: { lte: data.not_sent_since },
      },
      data: {
        otp_hash: data.otp_hash,
        otp_expires_at: data.otp_expires_at,
        otp_attempts: 0,
        last_sent_at: data.last_sent_at,
      },
    });
  }

  async incrementPendingOtpAttempts(data: {
    id: string;
    email: string;
    now: Date;
    max_attempts: number;
  }) {
    return prisma.pendingRegistration.updateMany({
      where: {
        id: data.id,
        email: data.email,
        consumed_at: null,
        otp_expires_at: { gt: data.now },
        otp_attempts: { lt: data.max_attempts },
      },
      data: { otp_attempts: { increment: 1 } },
    });
  }

  async completePendingRegistration(data: {
    id: string;
    email: string;
    otp_hash: string;
    now: Date;
    max_attempts: number;
    first_name: string;
    last_name: string;
    password_hash: string;
    invitation_token_hash?: string;
    tenant_id: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const invitation = data.invitation_token_hash
        ? await tx.companyInvitation.findUnique({
            where: { invite_token_hash: data.invitation_token_hash },
          })
        : null;

      if (
        data.invitation_token_hash &&
        (!invitation ||
          invitation.status !== "PENDING" ||
          invitation.accepted_at ||
          invitation.expires_at <= data.now ||
          invitation.email !== data.email)
      ) {
        return { status: "invalid" as const };
      }

      const claimed = await tx.pendingRegistration.updateMany({
        where: {
          id: data.id,
          email: data.email,
          otp_hash: data.otp_hash,
          consumed_at: null,
          otp_expires_at: { gt: data.now },
          otp_attempts: { lt: data.max_attempts },
        },
        data: { consumed_at: data.now, verified_at: data.now },
      });
      if (claimed.count !== 1) return { status: "invalid" as const };

      if (data.invitation_token_hash) {
        if (!invitation) return { status: "invalid" as const };
        const user = await tx.user.create({
          data: {
            tenant_id: invitation.tenant_id,
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            status: "ACTIVE",
            credentials: { create: { password_hash: data.password_hash } },
          },
        });
        const claimedInvitation = await tx.companyInvitation.updateMany({
          where: { id: invitation.id, status: "PENDING", accepted_at: null, expires_at: { gt: data.now } },
          data: { status: "ACCEPTED", accepted_at: data.now },
        });
        if (claimedInvitation.count !== 1) return { status: "invalid" as const };
        await tx.companyMembership.create({
          data: { tenant_id: invitation.tenant_id, company_id: invitation.company_id, user_id: user.id, employment_status: "ACTIVE" },
        });
        return { status: "created" as const, user };
      }

      const tenant = await tx.tenant.create({ data: { id: data.tenant_id, status: "ACTIVE", plan: "FREE" } });
      const user = await tx.user.create({
        data: {
          tenant_id: tenant.id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          status: "ACTIVE",
          credentials: { create: { password_hash: data.password_hash } },
        },
      });
      return { status: "created" as const, user };
    });
  }

  async findUserWithCredentialsByEmail(email: string) {
    return prisma.user.findFirst({
      where: {
        email: email,
      },
      include: {
        credentials: true,
        tenant: true,
      },
    });
  }

  async findActiveCompanyMemberships(input: {
    user_id: string;
    tenant_id: string;
  }) {
    return prisma.companyMembership.findMany({
      where: {
        user_id: input.user_id,
        tenant_id: input.tenant_id,
        employment_status: "ACTIVE",
      },
      select: {
        company_id: true,
      },
    });
  }

  async findUserWithCredentialsById(userId: string) {
    return prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        credentials: true,
        tenant: true,
      },
    });
  }

  async findUserById(userId: string) {
    return prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  async registerUser(data: {
    tenant_id: string;
    first_name: string;
    last_name: string;
    email: string;
    password_hash: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          id: data.tenant_id,
          status: "ACTIVE",
          plan: "FREE",
        },
      });

      const user = await tx.user.create({
        data: {
          tenant_id: tenant.id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          status: "ACTIVE",
        },
      });

      await tx.userCredential.create({
        data: {
          user_id: user.id,
          password_hash: data.password_hash,
        },
      });

      return user;
    });
  }

  async registerUserForInvitation(data: {
    token_hash: string;
    first_name: string;
    last_name: string;
    email: string;
    password_hash: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const invitation = await tx.companyInvitation.findUnique({
        where: { invite_token_hash: data.token_hash },
      });
      if (
        !invitation ||
        invitation.status !== "PENDING" ||
        invitation.accepted_at ||
        invitation.expires_at <= new Date() ||
        invitation.email !== data.email
      ) {
        return { status: "invalid" as const };
      }

      const user = await tx.user.create({
        data: {
          tenant_id: invitation.tenant_id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          status: "ACTIVE",
          credentials: { create: { password_hash: data.password_hash } },
        },
      });

      const claimed = await tx.companyInvitation.updateMany({
        where: {
          id: invitation.id,
          status: "PENDING",
          accepted_at: null,
          expires_at: { gt: new Date() },
        },
        data: { status: "ACCEPTED", accepted_at: new Date() },
      });
      if (claimed.count !== 1) return { status: "invalid" as const };

      await tx.companyMembership.create({
        data: {
          tenant_id: invitation.tenant_id,
          company_id: invitation.company_id,
          user_id: user.id,
          employment_status: "ACTIVE",
        },
      });

      return { status: "accepted" as const };
    });
  }

  async findSessionById(session_id: string) {
    return prisma.userSession.findUnique({
      where: {
        id: session_id,
      },
    });
  }

  async findSessionForAccessToken(session_id: string) {
    return prisma.userSession.findUnique({
      where: {
        id: session_id,
      },
      select: {
        user_id: true,
        tenant_id: true,
        revoked_at: true,
        expires_at: true,
        user: {
          select: {
            status: true,
            tenant_id: true,
          },
        },
      },
    });
  }

  async createSession(data: {
    id: string;
    tenant_id: string;
    user_id: string;
    refresh_token_hash: string;
    expires_at: Date;
  }) {
    return prisma.userSession.create({
      data: {
        id: data.id,
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        refresh_token_hash: data.refresh_token_hash,
        expires_at: data.expires_at,
      },
    });
  }

  async findSessionByTokenHash(refreshTokenHash: string) {
    return prisma.userSession.findUnique({
      where: {
        refresh_token_hash: refreshTokenHash,
      },
    });
  }

  async updateSessionToken(session_Id: string, refreshTokenHash: string) {
    return prisma.userSession.update({
      where: {
        id: session_Id,
      },
      data: {
        refresh_token_hash: refreshTokenHash,
      },
    });
  }

  async rotateSessionToken(input: {
    session_id: string;
    current_refresh_token_hash: string;
    new_refresh_token_hash: string;
    now: Date;
  }) {
    return prisma.userSession.updateMany({
      where: {
        id: input.session_id,
        refresh_token_hash: input.current_refresh_token_hash,
        revoked_at: null,
        expires_at: {
          gt: input.now,
        },
      },
      data: {
        refresh_token_hash: input.new_refresh_token_hash,
      },
    });
  }

  async revokeSessionIfCurrent(input: {
    session_id: string;
    current_refresh_token_hash: string;
    now: Date;
  }) {
    return prisma.userSession.updateMany({
      where: {
        id: input.session_id,
        refresh_token_hash: input.current_refresh_token_hash,
        revoked_at: null,
        expires_at: {
          gt: input.now,
        },
      },
      data: {
        revoked_at: input.now,
      },
    });
  }

  async revokedSession(id: string) {
    return prisma.userSession.update({
      where: {
        id,
      },

      data: {
        revoked_at: new Date(),
      },
    });
  }

  async revokeAllSessionsForUser(userId: string, revokedAt: Date = new Date()) {
    return prisma.userSession.updateMany({
      where: {
        user_id: userId,
        revoked_at: null,
      },
      data: {
        revoked_at: revokedAt,
      },
    });
  }

  async updateUserPassword(userId: string, passwordHash: string) {
    return prisma.userCredential.update({
      where: {
        user_id: userId,
      },
      data: {
        password_hash: passwordHash,
      },
    });
  }

  async createPasswordResetToken(data: {
    id: string;
    tenant_id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
  }) {
    return prisma.passwordResetToken.create({
      data,
    });
  }

  async findPasswordResetTokenById(id: string) {
    return prisma.passwordResetToken.findUnique({
      where: {
        id,
      },
    });
  }

  async markPasswordResetTokenUsed(id: string, usedAt: Date) {
    return prisma.passwordResetToken.update({
      where: {
        id,
      },
      data: {
        used_at: usedAt,
      },
    });
  }

  async markPasswordResetTokensForUserUsed(userId: string, usedAt: Date) {
    return prisma.passwordResetToken.updateMany({
      where: {
        user_id: userId,
        used_at: null,
      },
      data: {
        used_at: usedAt,
      },
    });
  }

  async completePasswordReset(input: {
    token_id: string;
    user_id: string;
    password_hash: string;
    now: Date;
  }) {
    return prisma.$transaction(async (tx) => {
      // Atomically claim the reset token.
      // Only one concurrent request can consume an unused,
      // unexpired token successfully.
      const tokenResult = await tx.passwordResetToken.updateMany({
        where: {
          id: input.token_id,
          user_id: input.user_id,
          used_at: null,
          expires_at: {
            gt: input.now,
          },
        },
        data: {
          used_at: input.now,
        },
      });

      if (tokenResult.count !== 1) {
        return false;
      }

      // Update the password within the same transaction.
      await tx.userCredential.update({
        where: {
          user_id: input.user_id,
        },
        data: {
          password_hash: input.password_hash,
        },
      });

      // Invalidate any other outstanding reset tokens.
      await tx.passwordResetToken.updateMany({
        where: {
          user_id: input.user_id,
          used_at: null,
        },
        data: {
          used_at: input.now,
        },
      });

      // Revoke all active sessions for this user.
      await tx.userSession.updateMany({
        where: {
          user_id: input.user_id,
          revoked_at: null,
        },
        data: {
          revoked_at: input.now,
        },
      });

      return true;
    });
  }
}

export async function getUserRole(userId: string, tenantId: string) {
  const userRole = await prisma.userRole.findFirst({
    where: {
      user_id: userId,
      tenant_id: tenantId,
      role: {
        OR: [{ tenant_id: tenantId }, { tenant_id: null }],
      },
    },
    include: {
      role: {
        include: {
          role_permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  return userRole?.role ?? null;
}
