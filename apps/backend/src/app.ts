import express, { Application } from "express";
import cors from "cors";
import morgan from "morgan";
import indexRouter from "./router/index.route.js";
import { auth } from "./auth.js";
import { toNodeHandler } from "better-auth/node";

const app: Application = express();
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", async (req, res) => {
    res.json({ message: "alive", status: 200 });
})

app.all("/api/auth/*auth", (req, res, next) => {
    toNodeHandler(auth)(req as any, res as any).catch(next);
})
app.use("/api/v1", indexRouter);

export default app;