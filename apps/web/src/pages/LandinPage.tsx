import Skiper from "../components/Skipper";
import { Link } from "react-router-dom";
import styles from "./page.module.css";

export default function LandingPage() {
  return (
    <main style={{ height: "100%", width: "100%", overflow: "hidden" }}>
      <Skiper>
        <div className={styles.heroOverlay}>
          <h1 className={styles.mainHeading}>
            Your social world, reimagined in the{" "}
            <span className={styles.alterverseHighlight}>alterverse</span>
          </h1>

          <p className={styles.subDescription}>
            A game-like virtual space to hang out, play, and talk with friends in real-time.
          </p>

          <div className={styles.ctaGroup}>
            <Link
              to="/register"
              className={styles.primaryButton}
              style={{ color: "#ffffff", textDecoration: "none" }}
            >
              <span style={{ color: "#ffffff", fontWeight: 700 }}>Get Started</span>
              <svg
                className={styles.arrowIcon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="#ffffff"
                strokeWidth={2.5}
                style={{ stroke: "#ffffff", color: "#ffffff" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>

            <Link
              to="/spaces"
              className={styles.secondaryButton}
              style={{ color: "#0f172a", textDecoration: "none" }}
            >
              <span style={{ color: "#0f172a", fontWeight: 650 }}>Explore Spaces</span>
            </Link>
          </div>
        </div>
      </Skiper>
    </main>
  );
}
