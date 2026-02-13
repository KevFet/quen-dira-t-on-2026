'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Users, Plus, Play, Info, LayoutGrid } from 'lucide-react';
import RulesModal from '@/components/ui/RulesModal';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const router = useRouter();

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  };

  const createRoom = async () => {
    if (!nickname) return alert('Choisis un pseudo !');
    setLoading(true);
    const code = generateRoomCode();

    const { error: roomError } = await supabase
      .from('qdt_rooms')
      .insert([{ id: code }]);

    if (roomError) {
      alert('Erreur lors de la création de la room');
      setLoading(false);
      return;
    }

    const { data: player, error: playerError } = await supabase
      .from('qdt_players')
      .insert([{
        room_id: code,
        nickname,
        is_host: true,
        role: 'player'
      }])
      .select()
      .single();

    if (playerError) {
      alert('Erreur lors de la création du joueur');
      setLoading(false);
      return;
    }

    localStorage.setItem(`qdt_player_${code}`, (player as any).id);
    router.push(`/room/${code}`);
  };

  const joinRoom = async () => {
    if (!nickname || !roomCode) return alert('Pseudo et Code requis !');
    setLoading(true);
    const upperCode = roomCode.toUpperCase();

    const { data: room, error: roomError } = await supabase
      .from('qdt_rooms')
      .select('*')
      .eq('id', upperCode)
      .single();

    if (roomError || !room) {
      alert('Room introuvable !');
      setLoading(false);
      return;
    }

    const { data: player, error: playerError } = await supabase
      .from('qdt_players')
      .insert([{
        room_id: upperCode,
        nickname,
        is_host: false,
        role: 'player'
      }])
      .select()
      .single();

    if (playerError) {
      alert('Erreur lors de la connexion');
      setLoading(false);
      return;
    }

    localStorage.setItem(`qdt_player_${upperCode}`, (player as any).id);
    router.push(`/room/${upperCode}`);
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '90vh' }}>
      {/* Home Button */}
      <div style={{ position: 'fixed', top: '2rem', left: '2rem', zIndex: 100 }}>
        <button
          onClick={() => window.location.href = 'https://games-platform-hub.vercel.app/'}
          className="glass-btn hover-scale"
          style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          title="Retour au menu"
        >
          <LayoutGrid size={20} style={{ color: 'rgba(255,255,255,0.6)' }} />
        </button>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass"
        style={{ padding: '3rem', maxWidth: '450px', width: '100%', textAlign: 'center' }}
      >
        <motion.h1
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          Qu’en dira-t-on ?
        </motion.h1>
        <p className="tagline" style={{ marginBottom: '2rem' }}>Édition Next-Gen 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          <input
            type="text"
            className="glass-input"
            placeholder="Ton pseudo..."
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '1rem 0' }} />

          <button
            className="glass-btn glass-btn-primary"
            onClick={createRoom}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Plus size={20} /> Créer une partie
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="glass-input"
              placeholder="CODE"
              style={{ flex: 1, textTransform: 'uppercase' }}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            <button
              className="glass-btn"
              onClick={joinRoom}
              disabled={loading}
            >
              <Play size={20} /> Rejoindre
            </button>
          </div>
        </div>

        <button
          className="glass-btn"
          style={{ width: '100%', justifyContent: 'center', background: 'transparent' }}
          onClick={() => setShowRules(true)}
        >
          <Info size={18} /> Règles du jeu
        </button>
      </motion.div>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
