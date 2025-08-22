package com.meonjeo.meonjeo.exception;

public class SocialAccountExistsException extends RuntimeException {
    public SocialAccountExistsException(String message) {
        super(message);
    }
}