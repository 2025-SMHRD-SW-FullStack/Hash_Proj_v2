package com.ressol.ressol.review;

public record ReviewSubmittedEvent(long reviewId, long userId, String content) {
}
