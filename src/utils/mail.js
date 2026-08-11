import Mailgen from "mailgen";
import nodemailer from "nodemailer";
import { ApiError } from "./api-error.js";

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const isRetryableEmailError = (error) => {
  const retryableResponseCodes = new Set([421, 429, 450, 451, 452]);
  const retryableErrorCodes = new Set([
    "ECONNECTION",
    "ECONNRESET",
    "ETIMEDOUT",
  ]);
  const response = String(error?.response || "").toLowerCase();

  return (
    retryableResponseCodes.has(error?.responseCode) ||
    retryableErrorCodes.has(error?.code) ||
    response.includes("too many emails") ||
    response.includes("rate limit")
  );
};

const getSmtpConfig = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const host =
    process.env.SMTP_HOST ||
    (!isProduction ? process.env.MAILTRAP_SMTP_HOST : undefined);
  const port = Number(
    process.env.SMTP_PORT ||
      (!isProduction ? process.env.MAILTRAP_SMTP_PORT : 0),
  );
  const user =
    process.env.SMTP_USER ||
    (!isProduction ? process.env.MAILTRAP_SMTP_USER : undefined);
  const pass =
    process.env.SMTP_PASS ||
    (!isProduction ? process.env.MAILTRAP_SMTP_PASS : undefined);
  const from =
    process.env.SMTP_FROM ||
    (!isProduction
      ? "Task Force Orbit <mail.taskmanager@example.com>"
      : undefined);

  if (!host || !port || !user || !pass || !from) {
    throw new ApiError(500, "Production email service is not configured.");
  }

  return {
    host,
    port,
    secure:
      process.env.SMTP_SECURE === "true" ||
      (process.env.SMTP_SECURE !== "false" && port === 465),
    requireTLS:
      process.env.SMTP_REQUIRE_TLS !== "false" && port !== 465,
    auth: { user, pass },
    from,
  };
};

const sendEmail = async (options) => {
  // Browser/API tests must never send a real or Mailtrap email.
  if (process.env.NODE_ENV === "test") {
    if (process.env.TEST_EMAIL_BEHAVIOR === "fail") {
      throw new ApiError(502, "Unable to send email. Please try again later.");
    }
    return;
  }

  const smtp = getSmtpConfig();

  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Task Force Orbit",
      link: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",")[0],
    },
  });

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);

  const emailHtml = mailGenerator.generate(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    requireTLS: smtp.requireTLS,
    auth: smtp.auth,
    tls: { minVersion: "TLSv1.2" },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  const mail = {
    from: smtp.from,
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHtml,
  };

  const configuredRetries = Number(process.env.EMAIL_MAX_RETRIES || 2);
  const configuredRetryDelay = Number(
    process.env.EMAIL_RETRY_DELAY_MS || 750,
  );
  const maxRetries = Number.isFinite(configuredRetries)
    ? Math.min(Math.max(configuredRetries, 0), 3)
    : 2;
  const retryDelay = Number.isFinite(configuredRetryDelay)
    ? Math.min(Math.max(configuredRetryDelay, 100), 5_000)
    : 750;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await transporter.sendMail(mail);
    } catch (error) {
      const shouldRetry = attempt < maxRetries && isRetryableEmailError(error);

      console.error("Email delivery failed", {
        attempt: attempt + 1,
        retrying: shouldRetry,
        code: error?.code,
        responseCode: error?.responseCode,
        command: error?.command,
      });

      if (!shouldRetry) {
        throw new ApiError(502, "Unable to send email. Please try again later.");
      }

      await sleep(retryDelay * (attempt + 1));
    }
  }
};

const emailVerificationMailgenContent = (username, verficationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our App! we'are excited to have you on board.",
      action: {
        instructions:
          "To verify your email please click on the following button",
        button: {
          color: "#22BC66",
          text: "Verify your email",
          link: verficationUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset the password of your account",
      action: {
        instructions:
          "To reset your password click on the following button or link",
        button: {
          color: "#22BC66",
          text: "Reset password",
          link: passwordResetUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

const projectInvitationMailgenContent = (projectName, invitationUrl) => {
  return {
    body: {
      name: "there",
      intro: `You have been invited to join the project: ${projectName}.`,
      action: {
        instructions: "Create an account or log in, then accept the project invitation.",
        button: {
          color: "#22BC66",
          text: "View invitation",
          link: invitationUrl,
        },
      },
      outro: "This invitation expires in 7 days.",
    },
  };
};

export {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  getSmtpConfig,
  isRetryableEmailError,
  projectInvitationMailgenContent,
  sendEmail,
};
