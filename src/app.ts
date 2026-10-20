import "dotenv/config";
import express from "express";
import cors from "cors";
import { globalRouter } from "./routes";
import { errorHandler } from "@shared/middleware/errorHandler";
import { handleOnvoWebhook } from "@shared/controllers/webhook.controller";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.post("/api/v1/webhooks/onvo", handleOnvoWebhook);

app.use("/api/v1", globalRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
