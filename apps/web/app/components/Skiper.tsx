"use client";
import { gsap } from "gsap";
import React, { useEffect, useRef } from "react";

interface CrowdCanvasProps {
    src: string;
    rows?: number;
    cols?: number;
}

const CrowdCanvas = ({ src, rows = 15, cols = 7 }: CrowdCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

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

        const normalWalk = ({ peep, props }: { peep: Peep; props: ReturnType<typeof resetPeep> }) => {
            const { startY, endX } = props;
            const xDuration = 10;
            const yDuration = 0.25;

            const tl = gsap.timeline();
            tl.timeScale(randomRange(0.5, 1.5));
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
                    ctx.drawImage(peep.image, peep.rect[0]!, peep.rect[1]!, peep.rect[2]!, peep.rect[3]!, 0, 0, peep.width, peep.height);
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
                props: resetPeep({ peep, stage }),
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

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(devicePixelRatio, devicePixelRatio);
            crowd.forEach((peep) => peep.render(ctx));
            ctx.restore();
        };

        const resize = () => {
            // Use window dimensions directly — reliable regardless of CSS height chain
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

        const handleResize = () => resize();
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            gsap.ticker.remove(render);
            crowd.forEach((peep) => peep.walk?.kill());
            img.onload = null;
        };
    }, [src, rows, cols]);

    return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, display: "block" }} />;
};

const Skiper = () => {
    return (
        <div style={{ position: "fixed", inset: 0, background: "white", overflow: "hidden" }}>
            <CrowdCanvas
                src="https://cdn.21st.dev/assets/localized/abdb8990a7bef8c2f5af3e45f0a3c969c4b0603fba8be92e81347de4ea4e1ed7.png"
                rows={15}
                cols={7}
            />
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
