package com.sanasa.attendance.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendPasswordResetEmail(String toEmail, String token) {
        String resetUrl = frontendUrl + "/reset-password/" + token;
        String subject = "Password Reset Request";
        String content = "<p>Hello,</p>"
                + "<p>You have requested to reset your password.</p>"
                + "<p>Click the link below to change your password:</p>"
                + "<p><a href=\"" + resetUrl + "\">Change my password</a></p>"
                + "<br>"
                + "<p>Ignore this email if you do remember your password, "
                + "or you have not made the request.</p>";

        sendHtmlEmail(toEmail, subject, content);
    }

    public void sendNotificationEmail(String toEmail, String subject, String notificationMessage) {
        String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">"
                + "<div style=\"background-color: #1a73e8; padding: 20px; text-align: center;\">"
                + "<h2 style=\"color: #ffffff; margin: 0;\">Sanasa Attendance System</h2>"
                + "</div>"
                + "<div style=\"padding: 20px; background-color: #f9f9f9; border: 1px solid #e0e0e0;\">"
                + "<h3 style=\"color: #333;\">" + subject + "</h3>"
                + "<p style=\"color: #555; font-size: 14px; line-height: 1.6;\">" + notificationMessage + "</p>"
                + "<hr style=\"border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;\">"
                + "<p style=\"color: #999; font-size: 12px;\">This is an automated notification from the Sanasa Attendance System. "
                + "Please do not reply to this email.</p>"
                + "</div>"
                + "</div>";

        sendHtmlEmail(toEmail, "Sanasa Attendance - " + subject, htmlContent);
    }

    private void sendHtmlEmail(String toEmail, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Error sending email: " + subject, e);
        }
    }
}
