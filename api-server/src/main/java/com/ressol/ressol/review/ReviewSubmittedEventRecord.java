package com.ressol.ressol.review;

public record ReviewSubmittedEventRecord(long reviewId, long userId, String content) {
}
