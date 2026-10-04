"use client";

import React from "react";
import { FloatingOrbParticle, DiscardParticle, VaporizeEffect } from "@/lib/types";

interface ParticleLayerProps {
    floatingOrbs: FloatingOrbParticle[];
    vaporizeEffects?: VaporizeEffect[];
    discardParticles?: DiscardParticle[];
}

export const ParticleLayer: React.FC<ParticleLayerProps> = ({
    floatingOrbs,
    vaporizeEffects = [],
    discardParticles = []
}) => {
    return (
        <div className="particle-layer-container">
            {/* Floating +1 Orb Particles */}
            {floatingOrbs.map(orb => {
                const dx = orb.targetX - orb.startX;
                const dy = orb.targetY - orb.startY;
                return (
                    <div
                        key={orb.id}
                        className="floating-trash-orb"
                        style={{
                            left: `${orb.startX}px`,
                            top: `${orb.startY}px`,
                            ["--target-x" as string]: `${dx}px`,
                            ["--target-y" as string]: `${dy}px`
                        }}
                    >
                        <span className="orb-text">{orb.text}</span>
                    </div>
                );
            })}

            {/* Shatter & Vaporize Tile Disintegration Effects */}
            {vaporizeEffects.map(effect => (
                <div
                    key={effect.id}
                    className="shatter-vaporize-container"
                    style={{
                        left: `${effect.x}px`,
                        top: `${effect.y}px`,
                        width: `${effect.width}px`,
                        height: `${effect.height}px`,
                    }}
                >
                    {/* Rising smoke puffs beneath shards */}
                    {effect.smokePuffs.map(sp => (
                        <div
                            key={sp.id}
                            className="vapor-smoke-puff"
                            style={{
                                width: `${sp.size}px`,
                                height: `${sp.size}px`,
                                ["--vx" as string]: `${sp.vx}px`,
                                ["--vy" as string]: `${sp.vy}px`
                            }}
                        />
                    ))}

                    {/* Central letter flash that dissolves */}
                    <div className="tile-shatter-flash">
                        <span className="shatter-letter">{effect.letter}</span>
                    </div>

                    {/* Individual breaking tile shards flying apart */}
                    {effect.shards.map(shard => (
                        <div
                            key={shard.id}
                            className="tile-shard"
                            style={{
                                left: `${shard.x}px`,
                                top: `${shard.y}px`,
                                width: `${shard.w}px`,
                                height: `${shard.h}px`,
                                backgroundColor: shard.color,
                                ["--bx" as string]: `${shard.bx}px`,
                                ["--by" as string]: `${shard.by}px`,
                                ["--rot" as string]: `${shard.rot}deg`
                            }}
                        />
                    ))}
                </div>
            ))}

            {/* Discard Particles fallback */}
            {discardParticles.map(p => (
                <div
                    key={p.id}
                    className="discard-pixel-particle"
                    style={{
                        left: `${p.x}px`,
                        top: `${p.y}px`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        backgroundColor: p.color,
                        opacity: p.opacity
                    }}
                >
                    {p.letter && <span className="particle-letter">{p.letter}</span>}
                </div>
            ))}
        </div>
    );
};
