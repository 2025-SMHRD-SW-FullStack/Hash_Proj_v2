package com.ressol.ressol.exception;

public class SocialAccountExistsException extends RuntimeException {
    public SocialAccountExistsException(String message) {
        super(message);
    }
}