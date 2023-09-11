import nodemailer from 'nodemailer';
import config from '../config/config';
import logger from '../config/logger';
import { MailOptions } from 'nodemailer/lib/json-transport';
import readHTMLFile from '../utils/readHtml';
import Handlebars from 'handlebars';

const transport = nodemailer.createTransport(config.email.smtp);
/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() =>
      logger.warn(
        'Unable to connect to email server. Make sure you have configured the SMTP options in .env'
      )
    );
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const sendEmail = async (to: string, subject: string, link: string): Promise<any> => {
  readHTMLFile('src/utils/templates/confirm-email.html', async function (err, html) {
    if (err) {
      console.log('error reading file', err);
      return;
    }
    const template = Handlebars.compile(html);
    const replacements = {
      brand: "Accounting",
      link: link,
    };
    const htmlToSend = template(replacements);
    /* const mailOptions = {
      from: 'my@email.com',
      to: 'some@email.com',
      subject: 'test subject',
      html: htmlToSend
    }; */
    const msg = { from: config.email.from, to, subject, html: htmlToSend };
    /* smtpTransport.sendMail(mailOptions, function (error, response) {
      if (error) {
        console.log(error);
      }
    }); */
    await transport.sendMail(msg);
    console.log("message sent");
  });
  // await transport.sendMail(msg);
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to: string, token: string): Promise<any> => {
  const subject = 'Reset password';
  // replace this url with the link to the reset password page of your front-end app
  const resetPasswordUrl = `http://localhost:3000/v1/auth/reset-password?token=${token}`;
  //   const text = `Dear user,
  // To reset your password, click on this link: ${resetPasswordUrl}
  // If you did not request any password resets, then ignore this email.`;
  await sendEmail(to, subject, resetPasswordUrl);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to: string, token: string): Promise<any> => {
  const subject = 'Email Verification';
  // replace this url with the link to the email verification page of your front-end app
  const verificationEmailUrl = `http://localhost:3000/v1/auth/verify-email?token=${token}`;
  // const text = `Dear user,
  // To verify your email, click on this link: ${verificationEmailUrl}`;
  await sendEmail(to, subject, verificationEmailUrl);
};

export default {
  transport,
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail
};
