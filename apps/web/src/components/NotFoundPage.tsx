import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";

// Combined component for 404 page (Dynamic Stick-Figure Swarm)
export default function NotFoundPage() {
  return (
    <div className="w-full h-screen bg-black overflow-hidden flex justify-center items-center relative select-none">
      <CircleAnimation />
      <CharactersAnimation />
      <MessageDisplay />
    </div>
  );
}

// 1. Message Display Component
function MessageDisplay() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col justify-center items-center z-50 pointer-events-none p-4">
      <div 
        className={`flex flex-col items-center text-center transition-all duration-700 max-w-xl mx-auto ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 border border-black/10 text-xs font-bold tracking-widest uppercase text-slate-800 mb-3">
          <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
          Page Not Found
        </div>

        <div className="text-7xl sm:text-9xl font-black tracking-tighter text-slate-950 mb-3 select-none">
          404
        </div>

        <p className="text-base sm:text-lg font-medium text-slate-700 max-w-md mx-auto leading-relaxed mb-8">
          The page or virtual space you are looking for might have been moved, removed, or is temporarily offline.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pointer-events-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="cursor-pointer border-2 border-slate-950 bg-white/90 hover:bg-slate-950 hover:text-white text-slate-950 transition-all duration-200 px-7 py-3 rounded-full text-sm font-bold flex items-center gap-2 hover:scale-105 active:scale-95 shadow-md shadow-black/5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            <span>Go Back</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="cursor-pointer bg-slate-950 hover:bg-slate-800 text-white transition-all duration-200 px-7 py-3 rounded-full text-sm font-bold flex items-center gap-2 hover:scale-105 active:scale-95 shadow-lg shadow-slate-950/25"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Go Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// 2. Characters Animation Component
type StickFigure = {
  top?: string;
  bottom?: string;
  src: string;
  transform?: string;
  speedX: number;
  speedRotation?: number;
};

function CharactersAnimation() {
  const charactersRef = useRef<HTMLDivElement>(null);

  const populateCharacters = useCallback(() => {
    const container = charactersRef.current;
    if (!container) return;
    container.innerHTML = '';

    const stickFigures: StickFigure[] = [
      {
        top: '5%',
        src: 'https://cdn.21st.dev/assets/mirror/54/54f366bdbf75b7a2d3b9f2264c3ada12aefcaf6e6a467bcecc856ffcd686e52e.svg',
        transform: 'rotateZ(-90deg)',
        speedX: 2000,
      },
      {
        top: '15%',
        src: 'https://cdn.21st.dev/assets/mirror/7e/7e48603d6fd3fac9720b25b4b6a06d107feea2d21ef8fa0720921808b9808514.svg',
        speedX: 3500,
        speedRotation: 2000,
      },
      {
        top: '25%',
        src: 'https://cdn.21st.dev/assets/mirror/4f/4fd3a604a36cc8811c341ef3221010ed11e2563d4add29901922d7464c28c186.svg',
        speedX: 5000,
        speedRotation: 1200,
      },
      {
        top: '38%',
        src: 'https://cdn.21st.dev/assets/mirror/54/54f366bdbf75b7a2d3b9f2264c3ada12aefcaf6e6a467bcecc856ffcd686e52e.svg',
        speedX: 2800,
        speedRotation: 1500,
      },
      {
        top: '52%',
        src: 'https://cdn.21st.dev/assets/mirror/54/54f366bdbf75b7a2d3b9f2264c3ada12aefcaf6e6a467bcecc856ffcd686e52e.svg',
        speedX: 2400,
        speedRotation: 400,
      },
      {
        bottom: '8%',
        src: 'https://cdn.21st.dev/assets/mirror/66/668d66f4c4d1dbc5c421692b4e5ad644c0f11f0327da214bcae21f78816c6b2f.svg',
        speedX: 0,
      },
    ];

    stickFigures.forEach((figure, index) => {
      const stick = document.createElement('img');
      stick.classList.add('characters');
      stick.style.position = 'absolute';
      stick.style.width = '140px';
      stick.style.height = '140px';
      stick.style.pointerEvents = 'none';

      if (figure.top) stick.style.top = figure.top;
      if (figure.bottom) stick.style.bottom = figure.bottom;
      stick.src = figure.src;
      if (figure.transform) stick.style.transform = figure.transform;

      container.appendChild(stick);

      if (index === 5) return;

      stick.animate(
        [{ left: '105%' }, { left: '-25%' }],
        { duration: figure.speedX, iterations: Infinity, easing: 'linear' }
      );

      if (index === 0) return;

      if (figure.speedRotation) {
        stick.animate(
          [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-360deg)' }],
          { duration: figure.speedRotation, iterations: Infinity, easing: 'linear' }
        );
      }
    });
  }, []);

  useEffect(() => {
    populateCharacters();

    const handleResize = () => {
      populateCharacters();
    };

    const container = charactersRef.current;
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [populateCharacters]);

  return <div ref={charactersRef} className="absolute inset-0 pointer-events-none overflow-hidden z-20" />;
}

// 3. Circle Animation Component
interface Circulo {
  x: number;
  y: number;
  size: number;
}

function CircleAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef<number | null>(null);
  const timerRef = useRef(0);
  const circulosRef = useRef<Circulo[]>([]);

  // Initialize circles array
  const initArr = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    circulosRef.current = [];
    
    for (let index = 0; index < 300; index++) {
      const randomX = Math.floor(
        Math.random() * ((canvas.width * 3) - (canvas.width * 1.2) + 1)
      ) + (canvas.width * 1.2);
      
      const randomY = Math.floor(
        Math.random() * ((canvas.height) - (canvas.height * (-0.2) + 1))
      ) + (canvas.height * (-0.2));
      
      const size = canvas.width / 1000;
      
      circulosRef.current.push({ x: randomX, y: randomY, size });
    }
  };

  // Drawing function
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    timerRef.current++;
    context.setTransform(1, 0, 0, 1, 0, 0);
    
    const distanceX = canvas.width / 80;
    const growthRate = canvas.width / 1000;
    
    context.fillStyle = 'white';
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    circulosRef.current.forEach((circulo) => {
      context.beginPath();
      
      if (timerRef.current < 65) {
        circulo.x = circulo.x - distanceX;
        circulo.size = circulo.size + growthRate;
      }
      
      if (timerRef.current >= 65 && timerRef.current < 500) {
        circulo.x = circulo.x - (distanceX * 0.02);
        circulo.size = circulo.size + (growthRate * 0.2);
      }
      
      context.arc(circulo.x, circulo.y, circulo.size, 0, Math.PI * 2);
      context.fill();
    });
    
    if (timerRef.current >= 500) {
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current);
      }
      return;
    }
    
    requestIdRef.current = requestAnimationFrame(draw);
  };

  // Initialize canvas and start animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    timerRef.current = 0;
    initArr();
    draw();
    
    const handleResize = () => {
      if (!canvas) return;
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      timerRef.current = 0;
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current);
      }
      
      const context = canvas.getContext('2d');
      if (context) {
        context.reset();
      }
      
      initArr();
      draw();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10" />;
}