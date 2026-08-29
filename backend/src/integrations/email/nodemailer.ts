import nodemailer from "nodemailer";

export const getTransporter = (user?: string, pass?: string) => {
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: user,
      pass: pass,
    },
  });
};
