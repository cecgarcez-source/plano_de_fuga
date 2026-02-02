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

    async checkUsageAvailability(userId: string): Promise<boolean> {
        // 1. Check Tier
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('subscription_tier')
            .eq('id', userId)
            .single();

        if (profile?.subscription_tier === 'premium') return true;

        // 2. Count ACTUAL plans (More robust than profile counter)
        const { count, error } = await supabase
            .from('plans')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) {
            console.error("Error checking plan limits:", error);
            return false; // Fail safe
        }

        // Free limit: 2 (User Request)
        return (count || 0) < 2;
    }
};
