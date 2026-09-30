"use client";
import { gsap } from "gsap";
import React, { useEffect, useRef } from "react";

interface CrowdCanvasProps {
    src: string;
    rows?: number;
    cols?: number;
}

const HOVER_RADIUS = 180;

const CrowdCanvas = ({ src, rows = 15, cols = 7 }: CrowdCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: -9999, y: -9999 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // UTILS
        const randomRange = (min: number, max: number) =>
            min + Math.random() * (max - min);
        const randomIndex = (array: unknown[]) => (randomRange(0, array.length) | 0);
        const removeFromArray = <T,>(array: T[], i: number): T => array.splice(i, 1)[0]!;
        const removeItemFromArray = <T,>(array: T[], item: T) =>
            removeFromArray(array, array.indexOf(item));
        const removeRandomFromArray = <T,>(array: T[]): T =>
            removeFromArray(array, randomIndex(array));
        const getRandomFromArray = <T,>(array: T[]): T => array[randomIndex(array)]!;

        // TYPES
        type Peep = {
            image: HTMLImageElement;
            rect: number[];
            width: number;
            height: number;
            x: number;
            y: number;
            anchorY: number;
            scaleX: number;
            baseTimeScale: number;
            walk: gsap.core.Timeline | null;
            setRect: (rect: number[]) => void;
            render: (ctx: CanvasRenderingContext2D) => void;
        };

        // TWEEN FACTORIES
        const resetPeep = ({ stage, peep }: { stage: { width: number; height: number }; peep: Peep }) => {
            const direction = Math.random() > 0.5 ? 1 : -1;
            const offsetY = 100 - 250 * gsap.parseEase("power2.in")(Math.random());
            const startY = stage.height - peep.height + offsetY;
            let startX: number;
            let endX: number;

            if (direction === 1) {
                startX = -peep.width;
                endX = stage.width;
                peep.scaleX = 1;
            } else {
                startX = stage.width + peep.width;
                endX = 0;
                peep.scaleX = -1;
            }

            peep.x = startX;
            peep.y = startY;
            peep.anchorY = startY;

            return { startX, startY, endX };
        };

        const normalWalk = ({ peep, tweenProps }: { peep: Peep; tweenProps: ReturnType<typeof resetPeep> }) => {
            const { startY, endX } = tweenProps;
            const xDuration = 10;
            const yDuration = 0.25;
            const base = randomRange(0.5, 1.5);
            peep.baseTimeScale = base;

            const tl = gsap.timeline();
            tl.timeScale(base);
            tl.to(peep, { duration: xDuration, x: endX, ease: "none" }, 0);
            tl.to(peep, { duration: yDuration, repeat: xDuration / yDuration, yoyo: true, y: startY - 10 }, 0);

            return tl;
        };

        const walks = [normalWalk];

        // FACTORY FUNCTIONS
        const createPeep = ({ image, rect }: { image: HTMLImageElement; rect: number[] }): Peep => {
            const peep: Peep = {
                image,
                rect: [],
                width: 0,
                height: 0,
                x: 0,
                y: 0,
                anchorY: 0,
                scaleX: 1,
                baseTimeScale: 1,
                walk: null,
                setRect: (r: number[]) => {
                    peep.rect = r;
                    peep.width = r[2]!;
                    peep.height = r[3]!;
                },
                render: (ctx: CanvasRenderingContext2D) => {
                    ctx.save();
                    ctx.translate(peep.x, peep.y);
                    ctx.scale(peep.scaleX, 1);
                    ctx.drawImage(
                        peep.image,
                        peep.rect[0]!, peep.rect[1]!,
                        peep.rect[2]!, peep.rect[3]!,
                        0, 0,
                        peep.width, peep.height,
                    );
                    ctx.restore();
                },
            };
            peep.setRect(rect);
            return peep;
        };

        // MAIN
        const img = document.createElement("img");
        const stage = { width: 0, height: 0 };
        const allPeeps: Peep[] = [];
        const availablePeeps: Peep[] = [];
        const crowd: Peep[] = [];

        const createPeeps = () => {
            const total = rows * cols;
            const rectWidth = img.naturalWidth / rows;
            const rectHeight = img.naturalHeight / cols;

            for (let i = 0; i < total; i++) {
                allPeeps.push(
                    createPeep({
                        image: img,
                        rect: [
                            (i % rows) * rectWidth,
                            ((i / rows) | 0) * rectHeight,
                            rectWidth,
                            rectHeight,
                        ],
                    }),
                );
            }
        };

        const removePeepFromCrowd = (peep: Peep) => {
            removeItemFromArray(crowd, peep);
            availablePeeps.push(peep);
        };

        const addPeepToCrowd = (): Peep => {
            const peep = removeRandomFromArray(availablePeeps);
            const walk = getRandomFromArray(walks)({
                peep,
                tweenProps: resetPeep({ peep, stage }),
            }).eventCallback("onComplete", () => {
                removePeepFromCrowd(peep);
                addPeepToCrowd();
            });

            peep.walk = walk;
            crowd.push(peep);
            crowd.sort((a, b) => a.anchorY - b.anchorY);
            return peep;
        };

        const initCrowd = () => {
            while (availablePeeps.length) {
                addPeepToCrowd().walk?.progress(Math.random());
            }
        };

        const drawCursorAura = () => {
            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;
            if (mx < 0) return;

            const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, HOVER_RADIUS);
            gradient.addColorStop(0,   "rgba(255, 255, 255, 0.35)");
            gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.12)");
            gradient.addColorStop(1,   "rgba(255, 255, 255, 0)");

            ctx.save();
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(mx, my, HOVER_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(devicePixelRatio, devicePixelRatio);

            // Cursor aura drawn beneath characters
            drawCursorAura();

            crowd.forEach((peep) => {
                const cx = peep.x + peep.width / 2;
                const cy = peep.y + peep.height / 2;
                const dx = cx - mouseRef.current.x;
                const dy = cy - mouseRef.current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                const cur = peep.walk?.timeScale() ?? peep.baseTimeScale;

                if (dist < HOVER_RADIUS) {
                    // Slow to 50% of base speed smoothly — still clearly walking, not stopping
                    const target = peep.baseTimeScale * 0.5;
                    peep.walk?.timeScale(cur + (target - cur) * 0.1);
                } else if (cur < peep.baseTimeScale) {
                    // Lerp back to full speed when out of range
                    peep.walk?.timeScale(
                        Math.min(peep.baseTimeScale, cur + (peep.baseTimeScale - cur) * 0.06)
                    );
                }

                peep.render(ctx);
            });

            ctx.restore();
        };

        const resize = () => {
            stage.width = window.innerWidth;
            stage.height = window.innerHeight;
            canvas.width = stage.width * devicePixelRatio;
            canvas.height = stage.height * devicePixelRatio;
            canvas.style.width = `${stage.width}px`;
            canvas.style.height = `${stage.height}px`;

            crowd.forEach((peep) => peep.walk?.kill());
            crowd.length = 0;
            availablePeeps.length = 0;
            availablePeeps.push(...allPeeps);
            initCrowd();
        };

        const init = () => {
            createPeeps();
            resize();
            gsap.ticker.add(render);
        };

        img.onload = init;
        img.src = src;

        const onResize = () => resize();
        const onMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        const onMouseLeave = () => {
            mouseRef.current = { x: -9999, y: -9999 };
        };

        window.addEventListener("resize", onResize);
        window.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseleave", onMouseLeave);

        return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseleave", onMouseLeave);
            gsap.ticker.remove(render);
            crowd.forEach((peep) => peep.walk?.kill());
            img.onload = null;
        };
    }, [src, rows, cols]);

    return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, display: "block" }} />;
};

type PaletteKey = "mist" | "sage" | "sand" | "slate";

interface ThemeOption {
    id: PaletteKey;
    label: string;
    bgGradient: string;
    dotColor: string;
    lineColor: string;
    vignetteColor: string;
    colorSwatch: string;
}

const PALETTES: ThemeOption[] = [
    {
        id: "mist",
        label: "Nordic Mist",
        bgGradient: "linear-gradient(180deg, #e3ecf4 0%, #d4e1ed 45%, #b9ccde 100%)",
        dotColor: "rgba(15, 30, 50, 0.05)",
        lineColor: "rgba(15, 30, 50, 0.09)",
        vignetteColor: "rgba(15, 30, 50, 0.04)",
        colorSwatch: "#8bb1d4",
    },
    {
        id: "sage",
        label: "Celadon Sage",
        bgGradient: "linear-gradient(180deg, #e4ede4 0%, #d6e3d6 45%, #b9cdb9 100%)",
        dotColor: "rgba(20, 45, 25, 0.05)",
        lineColor: "rgba(20, 45, 25, 0.09)",
        vignetteColor: "rgba(20, 45, 25, 0.04)",
        colorSwatch: "#88b38a",
    },
    {
        id: "sand",
        label: "Warm Sand",
        bgGradient: "linear-gradient(180deg, #f1eae0 0%, #e6ddce 45%, #d1c3af 100%)",
        dotColor: "rgba(55, 40, 20, 0.05)",
        lineColor: "rgba(55, 40, 20, 0.09)",
        vignetteColor: "rgba(55, 40, 20, 0.04)",
        colorSwatch: "#c4ae8f",
    },
    {
        id: "slate",
        label: "Studio Slate",
        bgGradient: "linear-gradient(180deg, #e3e7ec 0%, #d3d9e0 45%, #bac3ce 100%)",
        dotColor: "rgba(30, 35, 45, 0.05)",
        lineColor: "rgba(30, 35, 45, 0.09)",
        vignetteColor: "rgba(30, 35, 45, 0.04)",
        colorSwatch: "#919fb1",
    },
];

interface SkiperProps {
    children?: React.ReactNode;
}

const Skiper = ({ children }: SkiperProps) => {
    const [selectedTheme, setSelectedTheme] = React.useState<PaletteKey>("mist");
    const activePalette = PALETTES.find((p) => p.id === selectedTheme) || PALETTES[0]!;

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            overflow: "hidden",
            background: activePalette.bgGradient,
            transition: "background 0.6s ease",
        }}>
            {/* Subtle architectural dot grid pattern */}
            <div style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `radial-gradient(circle at 1px 1px, ${activePalette.dotColor} 1px, transparent 0)`,
                backgroundSize: "32px 32px",
                pointerEvents: "none",
                transition: "background-image 0.6s ease",
            }} />

            {/* Top diffuse studio light */}
            <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "50%",
                background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255, 255, 255, 0.6) 0%, transparent 100%)",
                pointerEvents: "none",
            }} />

            {/* Clean minimal horizon baseline for avatars */}
            <div style={{
                position: "absolute",
                bottom: "70px",
                left: 0,
                right: 0,
                height: "1px",
                background: `linear-gradient(90deg, transparent 0%, ${activePalette.lineColor} 15%, ${activePalette.lineColor} 85%, transparent 100%)`,
                pointerEvents: "none",
                transition: "background 0.6s ease",
            }} />

            {/* Soft subtle ground vignette */}
            <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "220px",
                background: `linear-gradient(to top, ${activePalette.vignetteColor} 0%, transparent 100%)`,
                pointerEvents: "none",
                transition: "background 0.6s ease",
            }} />

            {/* Avatar crowd canvas */}
            <CrowdCanvas
                src="https://cdn.21st.dev/assets/localized/abdb8990a7bef8c2f5af3e45f0a3c969c4b0603fba8be92e81347de4ea4e1ed7.png"
                rows={15}
                cols={7}
            />

            {/* Foreground content / Hero overlay */}
            {children}

            {/* Discreet, elegant theme palette switcher */}
            <div style={{
                position: "absolute",
                top: "20px",
                right: "24px",
                zIndex: 40,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "9999px",
                backgroundColor: "rgba(255, 255, 255, 0.45)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.6)",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
            }}>
                <span style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "rgba(15, 23, 42, 0.55)",
                    marginRight: "2px",
                    userSelect: "none",
                }}>
                    Theme
                </span>
                {PALETTES.map((palette) => {
                    const isActive = palette.id === selectedTheme;
                    return (
                        <button
                            key={palette.id}
                            type="button"
                            title={palette.label}
                            onClick={() => setSelectedTheme(palette.id)}
                            style={{
                                width: "18px",
                                height: "18px",
                                borderRadius: "50%",
                                backgroundColor: palette.colorSwatch,
                                border: isActive ? "2px solid #0f172a" : "2px solid transparent",
                                outline: "none",
                                cursor: "pointer",
                                transform: isActive ? "scale(1.15)" : "scale(1)",
                                transition: "all 0.2s ease",
                                boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.18)" : "none",
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export { CrowdCanvas, Skiper };
export default Skiper;

/**
 * Skiper 39 Canvas_Landing_004 — React + Canvas
 * Inspired by and adapted from https://codepen.io/zadvorsky/pen/xxwbBQV
 * illustration by https://www.openpeeps.com/
 * We respect the original creators. This is an inspired rebuild with our own taste and does not claim any ownership.
 * These animations aren’t associated with the codepen.io . They’re independent recreations meant to study interaction design
 *
 * License & Usage:
 * - Free to use and modify in both personal and commercial projects.
 * - Attribution to Skiper UI is required when using the free version.
 * - No attribution required with Skiper UI Pro.
 *
 * Feedback and contributions are welcome.
 *
 * Author: @gurvinder-singh02
 * Website: https://gxuri.me
 * Twitter: https://x.com/Gur__vi
 */
