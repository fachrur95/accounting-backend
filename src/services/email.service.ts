import nodemailer from 'nodemailer';
import config from '../config/config';
import logger from '../config/logger';
import { MailOptions } from 'nodemailer/lib/json-transport';
import readHTMLFile from '../utils/readHtml';
import Handlebars from 'handlebars';

const transport = nodemailer.createTransport(config.email.smtpGmail);
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
const sendEmail = async (mailOptions: MailOptions): Promise<any> => {
  await transport.sendMail(mailOptions);
  // await transport.sendMail(msg);
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to: string, token: string): Promise<any> => {
  readHTMLFile('src/utils/templates/reset-password.html', async function (err, html) {
    const subject = 'Reset password';
    // replace this url with the link to the reset password page of your front-end app
    const resetPasswordUrl = `${config.frontend}/reset-password/${token}`;
    //   const text = `Dear user,
    // To reset your password, click on this link: ${resetPasswordUrl}
    // If you did not request any password resets, then ignore this email.`;

    if (err) {
      console.log('error reading file', err);
      return;
    }
    const template = Handlebars.compile(html);
    const replacements = {
      link: resetPasswordUrl,
    };
    const htmlToSend = template(replacements);

    const msg: MailOptions = { from: config.email.from, to, subject, html: htmlToSend };

    await sendEmail(msg);
  });
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to: string, token: string): Promise<any> => {
  readHTMLFile('src/utils/templates/confirm-email.html', async function (err, html) {
    const subject = 'Email Verification';
    // replace this url with the link to the email verification page of your front-end app
    const verificationEmailUrl = `${config.frontend}/verify-email/${token}`;
    // const text = `Dear user,
    // To verify your email, click on this link: ${verificationEmailUrl}`;

    if (err) {
      console.log('error reading file', err);
      return;
    }
    const template = Handlebars.compile(html);
    const replacements = {
      brand: "Accounting",
      link: verificationEmailUrl,
    };
    const htmlToSend = template(replacements);

    const msg: MailOptions = { from: config.email.from, to, subject, html: htmlToSend };

    await sendEmail(msg);
  });
};

export default {
  transport,
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail
};
