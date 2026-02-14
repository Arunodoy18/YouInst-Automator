/**
 * Winston Logger — structured logging with file + console output
 */
import winston from "winston";
import path from "path";

const LOG_DIR = path.resolve(__dirname, "../../logs");

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "youinst-automator" },
  transports: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      maxsize: 5_000_000,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, "combined.log"),
      maxsize: 10_000_000,
      maxFiles: 5,
    }),
  ],
});

// Console output in non-production
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const extra = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : "";
          return `${timestamp} [${level}] ${message}${extra}`;
        })
      ),
    })
  );
}

export default logger;
