import { User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateUserInput {
  id?: string;
  email?: string;
  name?: string;
  mobile?: string;
  profileType: string;
  status?: string;
  language?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  mobile?: string;
  dob?: Date;
  gender?: string;
  maritalStatus?: string;
  occupationType?: string;
  employerCompany?: string;
  language?: string;
  status?: string;
}

/**
 * User Service
 * Handles user account operations
 */
class UserService extends BaseService<User, CreateUserInput, UpdateUserInput> {
  constructor() {
    super(prisma.user);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      console.error('[UserService] Error finding by email:', error);
      throw error;
    }
  }

  /**
   * Find user by mobile
   */
  async findByMobile(mobile: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { phone: mobile },
      });
    } catch (error) {
      // If the DB schema hasn't yet been migrated, the `mobile` column may not exist.
      // Fall back to a raw SQL lookup across possible column names (mobile, phone, primary_mobile).
      try {
        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM users WHERE mobile = $1 OR phone = $1 OR primary_mobile = $1 OR primarymobile = $1 LIMIT 1`,
          mobile
        );
        return rows?.[0] ?? null;
      } catch (rawErr) {
        console.error('[UserService] Error finding by mobile (fallback):', rawErr);
        throw error;
      }
    }
  }

  /**
   * Create or update user
   */
  async createOrUpdate(
    id: string,
    data: CreateUserInput
  ): Promise<User> {
    try {
      const existing = await this.findById(id);

      if (existing) {
        return await this.update(id, data as UpdateUserInput);
      }

      return await this.create({ ...data, id });
    } catch (error) {
      console.error('[UserService] Error creating or updating:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserInput): Promise<User> {
    try {
      const updatedUser = await super.update(id, data);

      // Sync to Supabase Auth
      await this.syncToSupabaseAuth(updatedUser);

      return updatedUser;
    } catch (error) {
      console.error('[UserService] Error updating:', error);
      throw error;
    }
  }

  /**
   * Get user with full profile
   */
  async getUserWithProfile(userId: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id: userId },
        include: {
          familyMembers: true,
          education: true,
          identityRecords: true,
          incomeStreams: true,
          expenses: true,
          bankAccounts: true,
          credentials: true,
        },
      });
    } catch (error) {
      console.error('[UserService] Error getting user with profile:', error);
      throw error;
    }
  }

  /**
   * Sync user from Supabase to Prisma
   */
  async syncUserWithSupabase(userId: string, email: string, name?: string): Promise<User> {
    try {
      let user = await this.findById(userId);
      if (!user) {
        user = await this.create({
          id: userId,
          email: email,
          name: name || '',
          status: 'PENDING_VERIFICATION',
          authProvider: 'EMAIL',
          profileType: 'INDIVIDUAL_SALARIED',
        });
        console.log('[UserService] Synced missing user from Supabase:', userId);
      }
      return user;
    } catch (error) {
      console.error('[UserService] Error syncing user with Supabase:', error);
      throw error;
    }
  }

  /**
   * Sync user updates to Supabase Auth
   */
  private async syncToSupabaseAuth(user: User): Promise<void> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('[UserService] SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is missing. Cannot sync to Supabase Auth.');
        return;
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      // Prepare update data
      const updateData: any = {};

      if (user.email) {
        updateData.email = user.email;
      }

      if (user.name) {
        updateData.user_metadata = {
          full_name: user.name,
          ...((await supabaseAdmin.auth.admin.getUserById(user.id)).data.user?.user_metadata || {})
        };
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, updateData);
        if (error) {
          console.error(`[UserService] Error syncing user ${user.id} to Supabase Auth:`, error);
        } else {
          console.log(`[UserService] Synced user ${user.id} updates to Supabase Auth`);
        }
      }
    } catch (error) {
      console.error('[UserService] Error syncing to Supabase Auth:', error);
    }
  }

  /**
   * Delete user from Prisma and Supabase Auth
   */
  async delete(id: string): Promise<User> {
    try {
      // First try to delete from Supabase Auth if service role key is available
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseServiceKey) {
        // Use dynamically imported createClient or fetch directly to avoid top-level issues if not needed
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });

        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) {
          console.error(`[UserService] Error deleting user ${id} from Supabase Auth:`, error);
        } else {
          console.log(`[UserService] Deleted user ${id} from Supabase Auth`);
        }
      } else {
        console.warn('[UserService] SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is missing. Cannot delete user from Supabase Auth.');
      }

      // Delete from Prisma
      return await super.delete(id);
    } catch (error) {
      console.error('[UserService] Error deleting:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
