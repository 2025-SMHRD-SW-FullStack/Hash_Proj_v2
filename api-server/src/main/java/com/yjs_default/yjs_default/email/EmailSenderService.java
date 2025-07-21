package com.yjs_default.yjs_default.email;

import jakarta.mail.Message;
import jakarta.mail.internet.InternetAddress;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessagePreparator;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailSenderService {

    private final JavaMailSender mailSender;

    public void sendVerificationEmail(String toEmail, String token) {
        String subject = "GlobalGo 이메일 인증";
//        String url = "http://localhost:3000/email-verified?token=" + token;
        String url = "http://localhost:5173/email-verified?token=" + token;
        String content = "<h1>이메일 인증</h1><p>아래 링크를 클릭해주세요.</p>"
                + "<a href=\"" + url + "\">이메일 인증하기</a>";

        MimeMessagePreparator message = mimeMessage -> {
            mimeMessage.setRecipient(Message.RecipientType.TO, new InternetAddress(toEmail));
            mimeMessage.setFrom(new InternetAddress("noreply@globalgo.com"));
            mimeMessage.setSubject(subject);
            mimeMessage.setContent(content, "text/html; charset=UTF-8");
        };

        mailSender.send(message);
    }
}
