import nodemailer from "nodemailer";

const sendVerificationEmail = async ({ email, username, verificationToken }) => {
  const clientUrl =
    process.env.CLIENT_URL || "https://casino-mern.vercel.app";

  const verificationUrl = `${clientUrl}/verify-email/${verificationToken}`;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify your Casino account",
    text: `
Hello ${username},

Please verify your email by opening this link:

${verificationUrl}

This link will expire in one hour.

If you did not create this account, you can ignore this email.
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Verify your Casino account</h2>

        <p>Hello ${username},</p>

        <p>
          Click the button below to verify your email address and activate your
          account.
        </p>

        <a
          href="${verificationUrl}"
          style="
            display: inline-block;
            padding: 12px 20px;
            background-color: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 15px 0;
          "
        >
          Verify Email
        </a>

        <p>This verification link will expire in one hour.</p>

        <p>
          If the button does not work, copy and paste this link into your
          browser:
        </p>

        <p>${verificationUrl}</p>

        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `,
  });
};

export default sendVerificationEmail;