import express, { Application } from "express";
import cors from "cors";
import morgan from "morgan";
import indexRouter from "./router/index.route.js";

const app: Application = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
    res.send("hi from backend");
})

app.use("/api/v1", indexRouter);

export default app;