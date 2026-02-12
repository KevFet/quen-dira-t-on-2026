'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Send, Crown, HelpCircle, AlertTriangle, Trophy, Info } from 'lucide-react';
import RulesModal from '@/components/ui/RulesModal';
import confetti from 'canvas-confetti';

interface Player {
    id: string;
    nickname: string;
    role: string;
    is_host: boolean;
}

interface CustomName {
    id: string;
    name: string;
    is_eliminated: boolean;
    added_by: string;
}

interface Question {
    id: string;
    text_fr: string;
    text_en: string;
    text_es: string;
}

export default function RoomPage() {
    const { id: roomCode } = useParams<{ id: string }>();
    const router = useRouter();
    const [players, setPlayers] = useState<Player[]>([]);
    const [names, setNames] = useState<CustomName[]>([]);
    const [gameState, setGameState] = useState<any>(null);
    const [showRules, setShowRules] = useState(false);
    const [me, setMe] = useState<Player | null>(null);
    const [newName, setNewName] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [lang, setLang] = useState('fr');

    useEffect(() => {
        const playerId = localStorage.getItem(`qdt_player_${roomCode}`);
        if (!playerId) {
            router.push('/');
            return;
        }

        fetchInitialData(playerId);
        setupSubscriptions();
        fetchQuestions();
    }, [roomCode]);

    const fetchInitialData = async (myId: string) => {
        // Get room
        const { data: room, error } = await supabase.from('qdt_rooms').select('*').eq('id', roomCode).single();
        if (room) setGameState((room as any).game_state);

        // Get players
        const { data: playersData } = await supabase.from('qdt_players').select('*').eq('room_id', roomCode);
        if (playersData) {
            setPlayers(playersData);
            setMe(playersData.find(p => p.id === myId) || null);
        }

        // Get names
        const { data: namesData } = await supabase.from('qdt_names').select('*').eq('room_id', roomCode);
        if (namesData) setNames(namesData);
    };

    const setupSubscriptions = () => {
        const roomSub = supabase
            .channel(`room:${roomCode}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'qdt_rooms', filter: `id=eq.${roomCode}` }, (payload) => {
                setGameState((payload.new as any).game_state);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'qdt_players', filter: `room_id=eq.${roomCode}` }, () => {
                supabase.from('qdt_players').select('*').eq('room_id', roomCode).then(({ data }) => setPlayers(data || []));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'qdt_names', filter: `room_id=eq.${roomCode}` }, () => {
                supabase.from('qdt_names').select('*').eq('room_id', roomCode).then(({ data }) => setNames(data || []));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(roomSub);
        };
    };

    const fetchQuestions = async () => {
        const { data } = await supabase.from('qdt_questions').select('*');
        if (data) setQuestions(data);
    };

    useEffect(() => {
        if (gameState?.current_question_id && questions.length > 0) {
            setCurrentQuestion(questions.find(q => q.id === gameState.current_question_id) || null);
        }
    }, [gameState?.current_question_id, questions]);

    const addName = async () => {
        if (!newName.trim() || !me) return;
        const { error } = await supabase.from('qdt_names').insert([{
            room_id: roomCode,
            name: newName.trim(),
            added_by: me.id
        }]);
        if (!error) setNewName('');
    };

    const startGame = async () => {
        if (!me?.is_host) return;

        // Pick a random MJ
        const randomMJ = players[Math.floor(Math.random() * players.length)];

        await supabase.from('qdt_players').update({ role: 'player' }).eq('room_id', roomCode);
        await supabase.from('qdt_players').update({ role: 'mj' }).eq('id', randomMJ.id);

        await supabase.from('qdt_rooms').update({
            game_state: { ...gameState, status: 'choosing_secret', mj_id: randomMJ.id }
        }).eq('id', roomCode);
    };

    const selectSecret = async (nameId: string) => {
        if (me?.id !== gameState?.mj_id) return;

        // Pick first question
        const firstQ = questions[Math.floor(Math.random() * questions.length)];

        await supabase.from('qdt_rooms').update({
            game_state: {
                ...gameState,
                status: 'playing',
                secret_name_id: nameId,
                current_question_id: firstQ.id,
                history: []
            }
        }).eq('id', roomCode);
    };

    const eliminateName = async (nameId: string) => {
        const isSecret = nameId === gameState?.secret_name_id;

        if (isSecret) {
            // LOSE
            await supabase.from('qdt_rooms').update({
                game_state: { ...gameState, status: 'end', result: 'lose' }
            }).eq('id', roomCode);
        } else {
            await supabase.from('qdt_names').update({ is_eliminated: true }).eq('id', nameId);

            // Check if only secret remains
            const remaining = names.filter(n => !n.is_eliminated && n.id !== nameId);
            if (remaining.length === 1 && remaining[0].id === gameState.secret_name_id) {
                // WIN
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#FFD700', '#FFA500'] });
                await supabase.from('qdt_rooms').update({
                    game_state: { ...gameState, status: 'end', result: 'win' }
                }).eq('id', roomCode);
            }
        }
    };

    const nextQuestion = async (answer: string) => {
        if (me?.id !== gameState?.mj_id) return;

        const nextQ = questions[Math.floor(Math.random() * questions.length)];
        const history = gameState.history || [];

        await supabase.from('qdt_rooms').update({
            game_state: {
                ...gameState,
                current_question_id: nextQ.id,
                history: [...history, { q: currentQuestion?.id, a: answer }]
            }
        }).eq('id', roomCode);
    };

    if (!gameState || !me) return <div className="container">Chargement...</div>;

    return (
        <div className="container" style={{ minHeight: '100vh', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Header */}
            <div className="glass" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>CODE: {roomCode}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <span className="tagline" style={{ fontSize: '0.8rem' }}><Users size={12} style={{ display: 'inline', marginRight: '4px' }} /> {players.length}</span>
                        {me.role === 'mj' && <span style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 'bold' }}>👑 MAÎTRE DU JEU</span>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="glass-btn" style={{ padding: '0.4rem' }} onClick={() => setShowRules(true)}><Info size={16} /></button>
                    <button className="glass-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setLang('fr')}>FR</button>
                    <button className="glass-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setLang('en')}>EN</button>
                    <button className="glass-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setLang('es')}>ES</button>
                </div>
            </div>

            {/* Main Area */}
            <AnimatePresence mode="wait">

                {/* PHASE: LOBBY */}
                {gameState.status === 'lobby' && (
                    <motion.div
                        key="lobby"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="glass"
                        style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <h1>Submission Phase</h1>
                            <p className="tagline">Inscrivez les personnages (amis, stars, famille...)</p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="Un nom..."
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addName()}
                            />
                            <button className="glass-btn glass-btn-primary" onClick={addName}><Send size={20} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', maxHeight: '400px', overflowY: 'auto', padding: '4px' }}>
                            {names.map(n => (
                                <motion.div
                                    key={n.id}
                                    layoutId={n.id}
                                    className="glass-card-inner"
                                    style={{ padding: '1rem', minHeight: '80px' }}
                                    initial={{ rotateY: -90 }}
                                    animate={{ rotateY: 0 }}
                                >
                                    {n.name}
                                </motion.div>
                            ))}
                        </div>

                        {me.is_host && names.length >= 4 && (
                            <button className="glass-btn glass-btn-primary" onClick={startGame} style={{ alignSelf: 'center', padding: '1rem 3rem' }}>
                                Lancer la partie !
                            </button>
                        )}
                        {me.is_host && names.length < 4 && (
                            <p className="tagline" style={{ textAlign: 'center' }}>Il faut au moins 4 noms pour commencer.</p>
                        )}
                    </motion.div>
                )}

                {/* PHASE: CHOOSING SECRET (MJ ONLY) */}
                {gameState.status === 'choosing_secret' && (
                    <motion.div
                        key="choosing"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass"
                        style={{ padding: '2rem', flex: 1, textAlign: 'center' }}
                    >
                        {me.id === gameState.mj_id ? (
                            <>
                                <h2>👑 Choisis le nom mystère</h2>
                                <p className="tagline" style={{ marginBottom: '2rem' }}>Ce sera le personnage que les autres devront deviner.</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                                    {names.map(n => (
                                        <motion.div
                                            key={n.id}
                                            className="glass-card-inner"
                                            onClick={() => selectSecret(n.id)}
                                            whileHover={{ scale: 1.05 }}
                                        >
                                            {n.name}
                                        </motion.div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ padding: '4rem 0' }}>
                                    <Crown size={64} color="var(--accent)" style={{ marginBottom: '2rem' }} />
                                    <h2>Le MJ choisit le personnage mystère...</h2>
                                    <p className="tagline">Préparez-vous à débattre !</p>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}

                {/* PHASE: PLAYING */}
                {gameState.status === 'playing' && (
                    <motion.div
                        key="playing"
                        className="play-phase"
                        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}
                    >
                        {/* Question Card */}
                        <motion.div
                            className="glass"
                            style={{ padding: '2rem', textAlign: 'center', border: '2px solid var(--accent)' }}
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                        >
                            <span className="tagline" style={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '2px' }}>Question du système</span>
                            <h2 style={{ fontSize: '1.8rem', margin: '1rem 0' }}>
                                {lang === 'fr' ? currentQuestion?.text_fr : lang === 'en' ? currentQuestion?.text_en : currentQuestion?.text_es}
                            </h2>

                            {me.role === 'mj' ? (
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                                    <button className="glass-btn glass-btn-primary" style={{ background: 'var(--success)', minWidth: '100px' }} onClick={() => nextQuestion('OUI')}>OUI</button>
                                    <button className="glass-btn glass-btn-primary" style={{ background: 'var(--danger)', minWidth: '100px' }} onClick={() => nextQuestion('NON')}>NON</button>
                                </div>
                            ) : (
                                <div style={{ marginTop: '1rem' }}>
                                    <p className="tagline">Le MJ va répondre...</p>
                                </div>
                            )}
                        </motion.div>

                        {/* Answer Display */}
                        {gameState.history && gameState.history.length > 0 && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="glass"
                                style={{
                                    padding: '1rem',
                                    textAlign: 'center',
                                    background: gameState.history[gameState.history.length - 1].a === 'OUI' ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 59, 48, 0.2)'
                                }}
                            >
                                Dernière réponse : <strong>{gameState.history[gameState.history.length - 1].a}</strong>
                            </motion.div>
                        )}

                        {/* Grid of Names */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                            {names.map(n => (
                                <motion.div
                                    key={n.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{
                                        opacity: n.is_eliminated ? 0.2 : 1,
                                        scale: n.is_eliminated ? 0.8 : 1,
                                        filter: n.is_eliminated ? 'blur(8px) grayscale(100%)' : 'blur(0px) grayscale(0%)',
                                    }}
                                    whileHover={!n.is_eliminated ? { scale: 1.05, background: 'rgba(255,255,255,0.1)' } : {}}
                                    className={`glass-card-inner ${n.is_eliminated ? 'eliminated' : ''}`}
                                    onClick={() => !n.is_eliminated && me.role !== 'mj' && eliminateName(n.id)}
                                    style={{
                                        border: me.role === 'mj' && n.id === gameState.secret_name_id ? '2px solid var(--accent)' : '',
                                        position: 'relative'
                                    }}
                                >
                                    <motion.span
                                        animate={n.is_eliminated ? { y: [0, -20], opacity: [1, 0] } : {}}
                                    >
                                        {n.name}
                                    </motion.span>

                                    {me.role === 'mj' && n.id === gameState.secret_name_id && (
                                        <span style={{ position: 'absolute', top: '5px', right: '5px' }}><Crown size={12} color="var(--accent)" /></span>
                                    )}
                                    {n.is_eliminated && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            style={{ position: 'absolute', color: 'var(--danger)', fontStyle: 'italic', fontSize: '0.7rem', bottom: '10px' }}
                                        >
                                            ÉLIMINÉ
                                        </motion.div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                        {me.role !== 'mj' && (
                            <p className="tagline" style={{ textAlign: 'center', fontSize: '0.9rem' }}>
                                Touchez un nom pour l'éliminer si vous pensez que ce n'est pas lui.
                            </p>
                        )}
                    </motion.div>
                )}

                {/* PHASE: END */}
                {gameState.status === 'end' && (
                    <motion.div
                        key="end"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="glass"
                        style={{
                            padding: '3rem',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2rem',
                            border: gameState.result === 'win' ? '4px solid var(--success)' : '4px solid var(--danger)'
                        }}
                    >
                        {gameState.result === 'win' ? (
                            <>
                                <Trophy size={80} color="#FFD700" />
                                <h1>VICTOIRE !</h1>
                                <p>Vous avez trouvé {names.find(n => n.id === gameState.secret_name_id)?.name} !</p>
                            </>
                        ) : (
                            <>
                                <AlertTriangle size={80} color="var(--danger)" />
                                <h1 style={{ color: 'var(--danger)' }}>PERDU !</h1>
                                <p>Vous avez éliminé le personnage mystère : <strong>{names.find(n => n.id === gameState.secret_name_id)?.name}</strong></p>
                            </>
                        )}

                        <button className="glass-btn glass-btn-primary" onClick={() => router.push('/')}>Retour au menu</button>
                    </motion.div>
                )}

            </AnimatePresence>

            <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
        </div>
    );
}
