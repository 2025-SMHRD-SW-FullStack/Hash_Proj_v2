package com.meonjeo.meonjeo.sms;

public interface SmsProvider {
    void send(String to, String text);
}
