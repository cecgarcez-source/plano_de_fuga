import { supabase } from './supabase';
import { UserProfile } from '../types';

export const userService = {
    async getProfile(userId: string): Promise<UserProfile | null> {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
        return data;
    },

    async upsertProfile(profile: UserProfile): Promise<void> {
        const { error } = await supabase
            .from('user_profiles')
            .upsert(profile);

        if (error) {
            throw error;
        }
    },

    async setPremium(userId: string): Promise<void> {
        const { error } = await supabase
            .from('user_profiles')
            .update({ subscription_tier: 'premium' })
            .eq('id', userId);

        if (error) throw error;
    },

    async incrementTripCount(userId: string): Promise<void> {
        const { data } = await supabase
            .from('user_profiles')
            .select('total_trips_created')
            .eq('id', userId)
            .single();

        if (data) {
            await supabase.from('user_profiles').update({
                total_trips_created: (data.total_trips_created || 0) + 1
            }).eq('id', userId);
        }
    },

    async checkUsageAvailability(userId: string): Promise<{ allowed: boolean; reason?: string }> {
        // 1. Get user profile
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('subscription_tier, total_trips_created')
            .eq('id', userId)
            .single();

        const isPremium = profile?.subscription_tier === 'premium';

        if (isPremium) {
            // Premium Limit: 30 creations per month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { count, error } = await supabase
                .from('plans')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gte('created_at', startOfMonth.toISOString());

            if (error) {
                console.error("Error checking premium plan limits:", error);
                return { allowed: false, reason: "error" };
            }

            if ((count || 0) >= 30) {
                return { allowed: false, reason: "premium_limit_reached" };
            }
            return { allowed: true };
        }

        // Free Limit: 10 lifetime (using total_trips_created)
        const totalCreated = profile?.total_trips_created || 0;
        if (totalCreated >= 10) {
            return { allowed: false, reason: "free_limit_reached" };
        }

        return { allowed: true };
    },

    async checkSaveAvailability(userId: string): Promise<{ allowed: boolean; reason?: string }> {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('subscription_tier')
            .eq('id', userId)
            .single();

        const isPremium = profile?.subscription_tier === 'premium';
        if (isPremium) return { allowed: true };

        // For free users, max 3 saved plans
        const { count, error } = await supabase
            .from('plans')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) {
            console.error("Error checking saved plans count:", error);
            return { allowed: false, reason: "error" };
        }

        if ((count || 0) >= 3) {
            return { allowed: false, reason: "free_save_limit_reached" };
        }
        
        return { allowed: true };
    }
};
