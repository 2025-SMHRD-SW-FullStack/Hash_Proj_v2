package com.meonjeo.meonjeo.review;

public record ReviewSubmittedEventRecord(long reviewId, long userId, String content) {
}
