import React, { useState, useEffect } from 'react';
import { User, UserProfile } from '../types';
import { userService } from '../services/userService';
import { supabase } from '../services/supabase';

interface Props {
    user: User;
    userId: string; // auth.uid
    onBack: () => void;
}

const TRAVEL_STYLES = ['Econômico', 'Luxo', 'Aventura', 'Relaxamento', 'Cultural', 'Gastronômico', 'Romântico', 'Família', 'Solo', 'Digital Nomad'];
const INTERESTS = ['Museus', 'História', 'Natureza', 'Praia', 'Montanha', 'Vida Noturna', 'Compras', 'Esportes', 'Música', 'Arte', 'Tecnologia', 'Fotografia'];

export const UserProfileView: React.FC<Props> = ({ user, userId, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [fullName, setFullName] = useState(user.fullName || '');
    const [bio, setBio] = useState('');
    const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [dietary, setDietary] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Avatar Upload Logic
    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!event.target.files || event.target.files.length === 0) return;

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            setUploadingAvatar(true);

            // 1. Upload
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update Auth Metadata
            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (updateError) throw updateError;

            // 4. Force reload or callback to update UI
            alert("Foto atualizada! Recarregando...");
            window.location.reload();

        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Erro ao atualizar foto.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            try {
                const profile = await userService.getProfile(userId);
                if (profile) {
                    setFullName(profile.full_name || user.fullName || '');
                    setBio(profile.bio || '');
                    setSelectedStyles(profile.travel_style || []);
                    setSelectedInterests(profile.interests || []);
                    setDietary(profile.dietary_restrictions || '');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, [userId]);

    const toggleSelection = (item: string, list: string[], setList: (l: string[]) => void) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const profile: UserProfile = {
                id: userId,
                full_name: fullName,
                bio,
                travel_style: selectedStyles,
                interests: selectedInterests,
                dietary_restrictions: dietary
            };
            await userService.upsertProfile(profile);
            alert('Perfil salvo com sucesso!');
            onBack();
        } catch (err) {
            alert('Erro ao salvar perfil.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64 text-teal-600 font-bold">Carregando perfil...</div>;
    }

    return (
        <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div
                className="relative p-8 text-white bg-gray-900"
                style={{
                    backgroundImage: "url('/profile_header.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                {/* Dark Overlay for Readability */}
                <div className="absolute inset-0 bg-black/60 pointer-events-none"></div>

                <div className="relative z-10">
                    <button onClick={onBack} className="absolute top-0 left-0 text-white/80 hover:text-white font-bold text-sm">
                        ← Voltar
                    </button>
                    <div className="flex flex-col items-center mt-4">

                        {/* Avatar Upload Container */}
                        <div
                            className="relative group cursor-pointer"
                            onClick={() => document.getElementById('profile-avatar-input')?.click()}
                            title="Clique para alterar foto"
                        >
                            <div className="w-24 h-24 rounded-full border-4 border-white/30 bg-white/20 flex items-center justify-center text-4xl mb-4 overflow-hidden relative shadow-lg group-hover:border-teal-400 transition-colors">
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{user.username.charAt(0).toUpperCase()}</span>
                                )}
                            </div>

                            {/* Overlay Icon */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity mb-4">
                                <span className="text-white text-xs font-bold">📷 Editar</span>
                            </div>

                            {uploadingAvatar && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full mb-4">
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            id="profile-avatar-input"
                            className="hidden"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            disabled={uploadingAvatar}
                        />

                        {/* Editable Name Display (Uses fullName if set, else username) */}
                        <h1 className="text-2xl font-bold tracking-wider uppercase text-teal-300 drop-shadow-md">
                            {fullName || user.username}
                        </h1>
                        <p className="text-teal-100 text-sm tracking-widest font-mono border-t border-teal-500/50 pt-1 mt-1">AGENTE DE FUGA</p>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-8">

                {/* Basic Info */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Sobre Você</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo / Codinome</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                placeholder="Como quer ser chamado?"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Restrições Alimentares</label>
                            <input
                                type="text"
                                value={dietary}
                                onChange={e => setDietary(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                placeholder="Ex: Vegano, Sem glúten, Alérgico a..."
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Biografia Curta</label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none h-24 resize-none"
                            placeholder="Conte um pouco sobre suas viagens..."
                        />
                    </div>
                </section>

                {/* Travel Style */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Estilo de Viagem ✈️</h2>
                    <p className="text-sm text-gray-500">Selecione o que mais combina com você (ajuda a IA a personalizar).</p>
                    <div className="flex flex-wrap gap-2">
                        {TRAVEL_STYLES.map(style => (
                            <button
                                key={style}
                                onClick={() => toggleSelection(style, selectedStyles, setSelectedStyles)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedStyles.includes(style)
                                    ? 'bg-teal-600 text-white shadow-md transform scale-105'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Interests */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Interesses 🎯</h2>
                    <p className="text-sm text-gray-500">O que não pode faltar no seu roteiro?</p>
                    <div className="flex flex-wrap gap-2">
                        {INTERESTS.map(interest => (
                            <button
                                key={interest}
                                onClick={() => toggleSelection(interest, selectedInterests, setSelectedInterests)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedInterests.includes(interest)
                                    ? 'bg-purple-600 text-white shadow-md transform scale-105'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {interest}
                            </button>
                        ))}
                    </div>
                </section>

                <div className="pt-6 flex justify-end gap-3 border-t">
                    <button
                        onClick={onBack}
                        className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 shadow-md transition-transform active:scale-95 disabled:opacity-50"
                    >
                        {saving ? 'Salvando...' : 'Salvar Perfil'}
                    </button>
                </div>

            </div>
        </div>
    );
};
