'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface RulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(8px)'
                        }}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="glass"
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '500px',
                            padding: '2.5rem',
                            maxHeight: '80vh',
                            overflowY: 'auto'
                        }}
                    >
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={24} />
                        </button>

                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.8rem' }}>Règles du jeu</h2>

                        <div style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.6', fontSize: '1.1rem' }}>
                            <p style={{ marginBottom: '1rem' }}>
                                <strong>Qu’en dira-t-on</strong> est un jeu de déduction coopératif.
                            </p>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <li>📝 <strong>Étape 1 :</strong> Inscrivez des noms (amis, famille, célébrités).</li>
                                <li>👑 <strong>Étape 2 :</strong> Un MJ choisit secrètement l'un d'eux.</li>
                                <li>❓ <strong>Étape 3 :</strong> Répondez aux questions, débattez et éliminez les mauvaises pistes.</li>
                                <li>⚠️ <strong>Attention :</strong> si vous éliminez le personnage mystère, c'est perdu !</li>
                                <li>🏆 <strong>Victoire :</strong> Pour gagner, il ne doit rester que lui à la fin.</li>
                            </ul>
                        </div>

                        <button
                            className="glass-btn glass-btn-primary"
                            style={{ width: '100%', marginTop: '2rem', justifyContent: 'center' }}
                            onClick={onClose}
                        >
                            C'est compris !
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
