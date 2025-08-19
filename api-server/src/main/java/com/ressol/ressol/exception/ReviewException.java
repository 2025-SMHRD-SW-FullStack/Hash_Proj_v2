package com.ressol.ressol.exception;

public class ReviewException extends RuntimeException {
    public ReviewException(String msg){ super(msg); }

    public static ReviewException invalidState(String msg){
        return new ReviewException(msg);
    }
    public static ReviewException conflict(String msg){
        return new ReviewException(msg);
    }
    public static ReviewException notFound(Object id){
        return new ReviewException("리뷰를 찾을 수 없습니다: " + id);
    }
}
