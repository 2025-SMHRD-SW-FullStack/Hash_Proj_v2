package com.meonjeo.meonjeo.review;

public record ReviewSubmittedEvent(long reviewId, long userId, String content) {
}
