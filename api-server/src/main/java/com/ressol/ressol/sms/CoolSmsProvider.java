package com.ressol.ressol.sms;

import jakarta.annotation.PostConstruct;
import net.nurigo.sdk.NurigoApp;
import net.nurigo.sdk.message.model.Message;
import net.nurigo.sdk.message.request.SingleMessageSendingRequest;
import net.nurigo.sdk.message.service.DefaultMessageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class CoolSmsProvider implements SmsProvider {

    // 루트 키 그대로 사용 (dev는 placeholder, secret-dev에 실값)
    @Value("${COOLSMS_API_KEY}")
    private String apiKey;

    @Value("${COOLSMS_API_SECRET}")
    private String apiSecret;

    @Value("${COOLSMS_FROM_NUMBER}")
    private String fromNumber; // 010xxxxxxxx (하이픈X, 발신번호 사전등록 필수)

    private DefaultMessageService svc;

    @PostConstruct
    void init() {
        this.svc = NurigoApp.INSTANCE.initialize(apiKey, apiSecret, "https://api.coolsms.co.kr");
    }

    @Override
    public void send(String to, String text) {
        Message m = new Message();
        m.setFrom(fromNumber);
        m.setTo(to);
        m.setText(text);
        svc.sendOne(new SingleMessageSendingRequest(m)); // 실제 발송
    }
}
