
import { supabase } from './supabase';
import { SavedPlan, TripPreferences, VisitedPlace, ItineraryResult } from '../types';

export const plansService = {
    async savePlan(plan: ItineraryResult | SavedPlan, preferences: TripPreferences, userId: string): Promise<SavedPlan> {
        const isUpdate = 'id' in plan && plan.id;
        let savedPlan: SavedPlan;

        if (isUpdate) {
            // Update existing
            const { data, error } = await supabase
                .from('plans')
                .update({
                    title: plan.destinationTitle,
                    destination_description: plan.destinationDescription,
                    content: plan,
                    original_preferences: preferences,
                    user_id: userId
                })
                .eq('id', plan.id)
                .select()
                .single();

            if (error) throw error;
            savedPlan = {
                ...data.content,
                id: data.id,
                createdAt: data.created_at,
                originalPreferences: data.original_preferences
            };

        } else {
            // Insert new
            const { data, error } = await supabase
                .from('plans')
                .insert({
                    user_id: userId,
                    title: plan.destinationTitle,
                    destination_description: plan.destinationDescription,
                    content: plan,
                    original_preferences: preferences
                })
                .select()
                .single();

            if (error) throw error;
            savedPlan = {
                ...data.content,
                id: data.id,
                createdAt: data.created_at,
                originalPreferences: data.original_preferences
            };
        }

        return savedPlan;
    },

    async getUserPlans(): Promise<SavedPlan[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(row => ({
            ...row.content,
            id: row.id,
            createdAt: row.created_at,
            originalPreferences: row.original_preferences,
            coverUrl: row.cover_url // Map from DB column
        }));
    },

    async deletePlan(id: string): Promise<void> {
        const { error } = await supabase
            .from('plans')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async updatePlanCover(planId: string, file: File): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${planId}-${Date.now()}.${fileExt}`;

        // 1. Upload
        const { error: uploadError } = await supabase.storage
            .from('plan-covers')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Get URL
        const { data: { publicUrl } } = supabase.storage
            .from('plan-covers')
            .getPublicUrl(filePath);

        // 3. Update Plan Record
        const { error: dbError } = await supabase
            .from('plans')
            .update({ cover_url: publicUrl })
            .eq('id', planId);

        if (dbError) throw dbError;

        return publicUrl;
    },

    // --- VISITED PLACES ---

    async getVisitedPlaces(): Promise<VisitedPlace[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('visited_places')
            .select('*')
            .eq('user_id', user.id)
            .order('date_added', { ascending: false });

        if (error) {
            console.error(error);
            return [];
        }

        return data.map(row => ({
            id: row.id,
            name: row.name,
            coordinates: row.coordinates,
            dateAdded: row.date_added
        }));
    },

    async addVisitedPlace(place: VisitedPlace): Promise<VisitedPlace> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User required");

        const { data, error } = await supabase
            .from('visited_places')
            .insert({
                user_id: user.id,
                name: place.name,
                coordinates: place.coordinates, // JSONB
                date_added: place.dateAdded
            })
            .select() // Return the created row (with real ID)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            coordinates: data.coordinates,
            dateAdded: data.date_added
        };
    },

    async deleteVisitedPlace(id: string): Promise<void> {
        const { error } = await supabase
            .from('visited_places')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getPlanById(id: string): Promise<SavedPlan | null> {
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error("Error fetching plan:", error);
            return null;
        }

        return {
            ...data.content,
            id: data.id,
            createdAt: data.created_at,
            originalPreferences: data.original_preferences,
            coverUrl: data.cover_url, // Map from DB column
            isPublic: data.is_public // Map from DB
        };
    },

    async setPublic(id: string, isPublic: boolean): Promise<void> {
        const { error } = await supabase
            .from('plans')
            .update({ is_public: isPublic })
            .eq('id', id);

        if (error) throw error;
    }
};
