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
        // Se plan_credits vier indefinido numa criação nova, inicializa com 3
        if (profile.plan_credits === undefined) {
            profile.plan_credits = 3;
        }
        
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

    async checkUsageAvailability(userId: string): Promise<{ allowed: boolean; reason?: string; credits?: number }> {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('plan_credits')
            .eq('id', userId)
            .single();

        // Se o usuário não tem a coluna ou é nulo, consideramos que ele tem 3 de brinde (caso a DB não tenha setado o default)
        const credits = (profile?.plan_credits !== undefined && profile?.plan_credits !== null) ? profile.plan_credits : 3;

        if (credits > 0) {
            return { allowed: true, credits };
        }

        return { allowed: false, reason: "no_credits" };
    },

    async consumeCredit(userId: string): Promise<void> {
        // Lê os créditos atuais
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('plan_credits')
            .eq('id', userId)
            .single();
            
        const currentCredits = (profile?.plan_credits !== undefined && profile?.plan_credits !== null) ? profile.plan_credits : 3;
        
        if (currentCredits > 0) {
            await supabase.from('user_profiles').update({
                plan_credits: currentCredits - 1
            }).eq('id', userId);
        }
    },

    async checkSaveAvailability(userId: string): Promise<{ allowed: boolean; reason?: string }> {
        // Com o modelo novo, se o usuário gerou o plano usando um card, ele pode salvar!
        return { allowed: true };
    }
};
