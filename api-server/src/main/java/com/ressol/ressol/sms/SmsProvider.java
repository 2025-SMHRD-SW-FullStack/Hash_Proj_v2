package com.ressol.ressol.sms;

public interface SmsProvider {
    void send(String to, String text);
}
